import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import {
  addresses, cartItems, carts, couponRedemptions, coupons, getDb, orderEvents, orderItems,
  orders, payments, productImages, products, productVariants, type Database,
} from '@aps/db';
import {
  isValidGstin, priceOrder, stateCodeFromGstin, STORE, formatEta,
  type AddressInput, type CheckoutQuote, type PriceableLine,
} from '@aps/shared';
import {
  ConflictError, CouponError, NotFoundError, NotServiceableError, OutOfStockError, ValidationError,
} from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';
import { nextOrderNumber } from '../lib/numbering.ts';
import { evaluateCartCoupon } from './cart.service.ts';
import { quoteForAddress } from './shipping.service.ts';
import { createRazorpayOrder } from './razorpay.service.ts';
import { notifySellerOfNewOrder } from './order-notifications.service.ts';

/** Either the pooled database or an open transaction — anything that can run a query. */
type Executor = Database | Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Checkout.
 *
 * Every price is rebuilt from the database here. Nothing the browser sends
 * about money is believed — not the subtotal, not the discount, not the total.
 * The client's copy exists only so the shopper can sanity-check the number.
 */

interface PricingContext {
  lines: PriceableLine[];
  itemRows: {
    variantId: string; productId: string; quantity: number;
    product: typeof products.$inferSelect; variant: typeof productVariants.$inferSelect;
  }[];
  subtotal: number;
  totalWeightG: number;
}

/**
 * Reads the cart for pricing.
 *
 * Takes an explicit executor so it can run INSIDE a checkout transaction.
 * Calling getDb() here instead would check out a second connection, which reads
 * outside the transaction's snapshot — and on a single-connection database
 * deadlocks against the transaction that is waiting for it.
 */
async function loadPricingContext(cartId: string, executor?: Executor): Promise<PricingContext> {
  const db = executor ?? getDb();
  const rows = await db.select({ item: cartItems, variant: productVariants, product: products })
    .from(cartItems)
    .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(cartItems.cartId, cartId));

  if (rows.length === 0) throw new ConflictError('Your cart is empty.');

  const lines: PriceableLine[] = rows.map(({ item, variant, product }) => ({
    productId: product.id,
    variantId: variant.id,
    categoryId: product.categoryId,
    unitPrice: product.basePrice + variant.priceDelta,
    quantity: item.quantity,
    taxRateBps: product.taxRateBps,
    weightG: variant.weightG > 0 ? variant.weightG : product.weightG,
  }));

  return {
    lines,
    itemRows: rows.map(({ item, variant, product }) => ({
      variantId: variant.id, productId: product.id, quantity: item.quantity, product, variant,
    })),
    subtotal: lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    totalWeightG: lines.reduce((sum, l) => sum + l.weightG * l.quantity, 0),
  };
}

async function resolveAddress(userId: string | undefined, input: {
  shippingAddressId?: string; shippingAddress?: AddressInput;
}): Promise<AddressInput> {
  if (input.shippingAddress) return input.shippingAddress;

  if (input.shippingAddressId && userId) {
    const db = getDb();
    const [row] = await db.select().from(addresses)
      .where(and(eq(addresses.id, input.shippingAddressId), eq(addresses.userId, userId))).limit(1);
    if (!row) throw new NotFoundError('Address');
    return {
      fullName: row.fullName, phone: row.phone, line1: row.line1, line2: row.line2,
      landmark: row.landmark, city: row.city, state: row.state as AddressInput['state'],
      pincode: row.pincode, type: row.type, isDefault: row.isDefault,
    };
  }

  throw new ValidationError({ shippingAddress: ['A shipping address is required.'] });
}

/**
 * Keep the address the buyer just typed.
 *
 * The order snapshots its own copy — that must never change when someone later
 * edits their address book, or historic invoices would rewrite themselves. But
 * the snapshot lives on the order, so nothing was ever written to `addresses`
 * and the address book was empty for everyone: "use my saved address" had
 * nothing to offer, on a form long enough that retyping it is a real deterrent
 * to buying a second table.
 *
 * Deduplicated on the parts that identify a place, so ordering four times does
 * not leave four identical entries. Failure here must never fail the order —
 * the order is placed and paid for either way.
 */
async function rememberAddress(userId: string, address: AddressInput): Promise<void> {
  const db = getDb();
  const key = (value: string | null | undefined) => (value ?? '').trim().toLowerCase();

  try {
    const existing = await db.select().from(addresses)
      .where(and(eq(addresses.userId, userId), isNull(addresses.deletedAt)));

    const duplicate = existing.some((row) =>
      key(row.line1) === key(address.line1)
      && key(row.pincode) === key(address.pincode)
      && key(row.fullName) === key(address.fullName));
    if (duplicate) return;

    await db.insert(addresses).values({
      userId,
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 ?? null,
      landmark: address.landmark ?? null,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      type: address.type ?? 'home',
      /* The first one saved becomes the default, so checkout has something to
         prefill without the customer having to nominate one. */
      isDefault: existing.length === 0,
    });
  } catch (error) {
    logger.warn({ userId, err: error }, 'could not save address to the address book');
  }
}

/**
 * Price a prospective order without committing anything.
 * Drives the live totals panel on the checkout page.
 */
export async function quoteCheckout(params: {
  cartId: string; userId?: string;
  shippingAddressId?: string; shippingAddress?: AddressInput;
  couponCode?: string | null; gstin?: string | null;
}): Promise<CheckoutQuote> {
  const address = await resolveAddress(params.userId, params);
  const ctx = await loadPricingContext(params.cartId);

  if (params.gstin) {
    if (!isValidGstin(params.gstin)) {
      throw new ValidationError({ gstin: ['That GSTIN does not look valid.'] });
    }
    /* A GSTIN registered in a different state to the delivery address is legal
       but usually a typo, and it changes which tax applies. Warn rather than
       block: bill-to and ship-to genuinely differ for some businesses. */
    const gstinState = stateCodeFromGstin(params.gstin);
    if (gstinState && address.state === STORE.sellerState && gstinState !== STORE.sellerStateCode) {
      logger.warn({ gstin: params.gstin, state: address.state }, 'GSTIN state code does not match shipping state');
    }
  }

  let discount = 0;
  let couponFreeShipping = false;
  let appliedCode: string | null = null;

  if (params.couponCode) {
    const db = getDb();
    const rows = await db.select({ item: cartItems, variant: productVariants, product: products })
      .from(cartItems)
      .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(eq(cartItems.cartId, params.cartId));

    const evaluation = await evaluateCartCoupon(params.couponCode, rows, ctx.subtotal, params.userId);
    if (!evaluation.ok) throw new CouponError(evaluation.message);
    discount = evaluation.discount;
    couponFreeShipping = evaluation.freeShipping;
    appliedCode = params.couponCode;
  }

  const shipping = await quoteForAddress({
    pincode: address.pincode, state: address.state,
    totalWeightG: ctx.totalWeightG,
    subtotal: ctx.subtotal - discount,
    couponFreeShipping,
  });

  if (!shipping.ok) {
    if (shipping.reason === 'not_serviceable') throw new NotServiceableError(address.pincode);
    throw new ConflictError(shipping.message);
  }

  const totals = priceOrder({
    lines: ctx.lines, discount, shipping: shipping.quote.price, buyerState: address.state,
  });

  return {
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    couponCode: appliedCode,
    shippingTotal: totals.shippingTotal,
    shippingIsFree: shipping.quote.isFree,
    shippingEta: formatEta(shipping.quote.etaDaysMin, shipping.quote.etaDaysMax),
    taxableValue: totals.taxableValue,
    cgst: totals.cgst, sgst: totals.sgst, igst: totals.igst, taxTotal: totals.taxTotal,
    grandTotal: totals.grandTotal,
    intraState: totals.intraState,
    serviceable: true,
  };
}

export interface PlacedOrder {
  orderId: string;
  orderNumber: string;
  grandTotal: number;
  razorpayOrderId: string | null;
  razorpayKeyId: string | null;
}

/**
 * Place an order.
 *
 * Everything from stock check to order row happens in ONE transaction with the
 * variant rows locked FOR UPDATE. Without the lock, two shoppers buying the last
 * table at the same moment both read stock = 1, both pass the check, and the
 * warehouse gets two orders for one table.
 *
 * Stock is decremented here, at order creation, not at payment. That reserves
 * the item during the payment window; a failed or abandoned payment releases it
 * via `releaseAbandonedOrders`.
 */
export async function placeOrder(params: {
  cartId: string; userId?: string;
  shippingAddressId?: string; shippingAddress?: AddressInput;
  billingSameAsShipping: boolean; billingAddress?: AddressInput;
  couponCode?: string | null; gstin?: string | null; notes?: string | null;
}): Promise<PlacedOrder> {
  const db = getDb();
  const shippingAddress = await resolveAddress(params.userId, params);
  const billingAddress = params.billingSameAsShipping ? shippingAddress : params.billingAddress ?? shippingAddress;

  const quote = await quoteCheckout({
    cartId: params.cartId, userId: params.userId,
    shippingAddress, couponCode: params.couponCode, gstin: params.gstin,
  });

  const placed = await db.transaction(async (tx) => {
    const ctx = await loadPricingContext(params.cartId, tx);

    /* Lock the variant rows before checking stock. Without FOR UPDATE, two
       shoppers buying the last table both read stock = 1, both pass, and the
       warehouse gets two orders for one table.
       Ordered by id so concurrent checkouts touching the same two products
       always take their locks in the same sequence and cannot deadlock. */
    const variantIds = [...new Set(ctx.itemRows.map((r) => r.variantId))];
    const locked = await tx
      .select({ id: productVariants.id, stockQty: productVariants.stockQty, name: products.name })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(inArray(productVariants.id, variantIds))
      .orderBy(asc(productVariants.id))
      .for('update', { of: productVariants });

    const stockById = new Map(locked.map((r) => [r.id, { stock: r.stockQty, name: r.name }]));

    for (const row of ctx.itemRows) {
      const current = stockById.get(row.variantId);
      if (!current || current.stock < row.quantity) {
        throw new OutOfStockError(current?.name ?? row.product.name, current?.stock ?? 0);
      }
    }

    const totals = priceOrder({
      lines: ctx.lines,
      discount: quote.discountTotal,
      shipping: quote.shippingTotal,
      buyerState: shippingAddress.state,
    });

    const orderNumber = await nextOrderNumber(tx as unknown as Database);

    const [order] = await tx.insert(orders).values({
      orderNumber,
      userId: params.userId ?? null,
      status: 'pending_payment',
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      shippingTotal: totals.shippingTotal,
      taxableValue: totals.taxableValue,
      cgst: totals.cgst, sgst: totals.sgst, igst: totals.igst, taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
      couponCode: quote.couponCode,
      gstin: params.gstin ?? null,
      shippingAddress: shippingAddress as unknown as Record<string, unknown>,
      billingAddress: billingAddress as unknown as Record<string, unknown>,
      totalWeightG: totals.totalWeightG,
      notes: params.notes ?? null,
    }).returning();

    if (!order) throw new Error('Order insert returned nothing');

    const orderedProductIds = [...new Set(ctx.itemRows.map((r) => r.productId))];
    const imageRows = await tx.select({ productId: productImages.productId, url: productImages.url })
      .from(productImages)
      .where(and(eq(productImages.isPrimary, true), inArray(productImages.productId, orderedProductIds)));
    const imageByProduct = new Map(imageRows.map((i) => [i.productId, i.url]));

    await tx.insert(orderItems).values(
      totals.lines.map((line) => {
        const source = ctx.itemRows.find((r) => r.variantId === line.variantId);
        if (!source) throw new Error(`Missing source row for variant ${line.variantId}`);
        return {
          orderId: order.id,
          productId: source.productId,
          variantId: source.variantId,
          productSlug: source.product.slug,
          name: source.product.name,
          variantLabel: `${source.variant.optionName}: ${source.variant.optionValue}`,
          sku: source.variant.sku,
          imageUrl: imageByProduct.get(source.productId) ?? null,
          hsnCode: source.product.hsnCode,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
          discountShare: line.discountShare,
          taxRateBps: line.taxRateBps,
          taxableValue: line.tax.taxableValue,
          taxAmount: line.tax.totalTax,
          weightG: line.weightG,
        };
      }),
    );

    for (const row of ctx.itemRows) {
      await tx.update(productVariants)
        .set({ stockQty: sql`${productVariants.stockQty} - ${row.quantity}` })
        .where(eq(productVariants.id, row.variantId));
    }

    await tx.insert(orderEvents).values({
      orderId: order.id, status: 'pending_payment', note: 'Order created, awaiting payment.',
    });

    if (quote.couponCode) {
      const [coupon] = await tx.select().from(coupons).where(eq(coupons.code, quote.couponCode)).limit(1);
      if (coupon) {
        await tx.update(coupons).set({ timesUsed: sql`${coupons.timesUsed} + 1` }).where(eq(coupons.id, coupon.id));
        await tx.insert(couponRedemptions).values({
          couponId: coupon.id, userId: params.userId ?? null,
          orderId: order.id, amount: totals.discountTotal,
        });
      }
    }

    return { order, totals };
  });

  /* After the order is committed, never before: a rolled-back checkout must
     not leave an address behind. */
  if (params.userId && params.shippingAddress) {
    await rememberAddress(params.userId, shippingAddress);
  }

  // Same rule as the address book: only after commit, and a failure here must
  // never be allowed to look like the order itself failed.
  await notifySellerOfNewOrder({
    orderNumber: placed.order.orderNumber,
    grandTotal: placed.order.grandTotal,
    customerName: shippingAddress.fullName,
    customerPhone: shippingAddress.phone,
    itemCount: placed.totals.lines.reduce((sum, line) => sum + line.quantity, 0),
  });

  // The cart is emptied only after the order exists, so a failed transaction
  // never loses the shopper's cart.
  await db.delete(cartItems).where(eq(cartItems.cartId, params.cartId));
  await db.update(carts).set({ couponCode: null }).where(eq(carts.id, params.cartId));

  let razorpayOrderId: string | null = null;
  try {
    const rzpOrder = await createRazorpayOrder({
      amount: placed.order.grandTotal,
      receipt: placed.order.orderNumber,
      notes: { orderId: placed.order.id, orderNumber: placed.order.orderNumber },
    });
    razorpayOrderId = rzpOrder.id;

    await db.insert(payments).values({
      orderId: placed.order.id,
      provider: 'razorpay',
      razorpayOrderId: rzpOrder.id,
      amount: placed.order.grandTotal,
      status: 'created',
    });
  } catch (error) {
    /* The order exists and stock is held; only the gateway handshake failed.
       Surfacing this as a hard error would lose the order, so the client is
       told to retry payment from the order page instead. */
    logger.error({ err: error, orderId: placed.order.id }, 'could not create Razorpay order');
  }

  const { publicKeyId } = await import('./razorpay.service.ts');

  return {
    orderId: placed.order.id,
    orderNumber: placed.order.orderNumber,
    grandTotal: placed.order.grandTotal,
    razorpayOrderId,
    razorpayKeyId: publicKeyId(),
  };
}
