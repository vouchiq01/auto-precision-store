import { randomBytes } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { cartItems, carts, coupons, getDb, productImages, products, productVariants } from '@aps/db';
import {
  CART, evaluateCoupon, normaliseCouponCode,
  type CartLine, type CartSummary, type Coupon, type CouponLine,
} from '@aps/shared';
import { ConflictError, NotFoundError, OutOfStockError } from '../lib/errors.ts';

/**
 * Cart reads and writes.
 *
 * Prices in the cart are always recomputed from the product and variant rows.
 * `priceSnapshot` on a line is kept only so the UI can say "this got cheaper
 * since you added it"; it is never used as the price you pay.
 */

export function newSessionToken(): string {
  return randomBytes(24).toString('base64url');
}

export interface CartOwner {
  userId?: string | undefined;
  sessionToken?: string | undefined;
}

export async function getOrCreateCart(owner: CartOwner): Promise<typeof carts.$inferSelect> {
  const db = getDb();

  if (owner.userId) {
    const [existing] = await db.select().from(carts).where(eq(carts.userId, owner.userId)).limit(1);
    if (existing) return existing;
    const [created] = await db.insert(carts).values({ userId: owner.userId }).returning();
    if (!created) throw new Error('Could not create cart');
    return created;
  }

  if (owner.sessionToken) {
    const [existing] = await db.select().from(carts).where(eq(carts.sessionToken, owner.sessionToken)).limit(1);
    if (existing) return existing;
  }

  const token = owner.sessionToken ?? newSessionToken();
  const [created] = await db.insert(carts).values({ sessionToken: token }).returning();
  if (!created) throw new Error('Could not create cart');
  return created;
}

/** Rows joined for pricing: variant + its product + primary image. */
async function loadCartRows(cartId: string) {
  const db = getDb();
  return db.select({
    item: cartItems,
    variant: productVariants,
    product: products,
  })
    .from(cartItems)
    .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(cartItems.createdAt);
}

export async function getCartSummary(cartId: string, userId?: string): Promise<CartSummary> {
  const db = getDb();
  const [cart] = await db.select().from(carts).where(eq(carts.id, cartId)).limit(1);
  if (!cart) throw new NotFoundError('Cart');

  const rows = await loadCartRows(cartId);

  const productIds = rows.map((r) => r.product.id);
  const images = productIds.length > 0
    ? await db.select().from(productImages)
        .where(and(inArray(productImages.productId, productIds), eq(productImages.isPrimary, true)))
    : [];
  const imageByProduct = new Map(images.map((i) => [i.productId, i]));

  const lines: CartLine[] = rows.map(({ item, variant, product }) => {
    const unitPrice = product.basePrice + variant.priceDelta;
    const image = imageByProduct.get(product.id) ?? null;
    return {
      id: item.id,
      variantId: variant.id,
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
      product: {
        id: product.id, slug: product.slug, name: product.name, brand: product.brand,
        image: image
          ? { id: image.id, url: image.url, alt: image.alt, variantId: image.variantId, sortOrder: image.sortOrder, isPrimary: image.isPrimary }
          : null,
      },
      variant: {
        optionName: variant.optionName, optionValue: variant.optionValue,
        stockQty: variant.stockQty, inStock: variant.stockQty > 0,
      },
      stockWarning:
        variant.stockQty === 0
          ? 'Out of stock — remove this to continue.'
          : item.quantity > variant.stockQty
            ? `Only ${variant.stockQty} left. Reduce the quantity to continue.`
            : null,
    };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);

  let discountTotal = 0;
  let couponMessage: string | null = null;
  let appliedCode: string | null = null;

  if (cart.couponCode) {
    const evaluation = await evaluateCartCoupon(cart.couponCode, rows, subtotal, userId);
    if (evaluation.ok) {
      discountTotal = evaluation.discount;
      appliedCode = cart.couponCode;
    } else {
      /* Keep the code on the cart but report why it is not applying — the cart
         may become eligible once the shopper adds another item. */
      couponMessage = evaluation.message;
    }
  }

  return {
    id: cart.id,
    lines,
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    subtotal,
    discountTotal,
    couponCode: appliedCode,
    couponMessage,
    estimatedTotal: subtotal - discountTotal,
    totalWeightG: rows.reduce((sum, r) => sum + (r.variant.weightG || r.product.weightG) * r.item.quantity, 0),
  };
}

export async function evaluateCartCoupon(
  code: string,
  rows: Awaited<ReturnType<typeof loadCartRows>>,
  subtotal: number,
  userId?: string,
) {
  const db = getDb();
  const normalised = normaliseCouponCode(code);
  const [row] = await db.select().from(coupons).where(eq(coupons.code, normalised)).limit(1);
  if (!row) return { ok: false as const, discount: 0, message: 'That coupon code is not recognised.', reason: 'inactive' as const };

  const coupon: Coupon = {
    id: row.id, code: row.code, type: row.type, value: row.value,
    minOrderValue: row.minOrderValue, maxDiscount: row.maxDiscount,
    usageLimitTotal: row.usageLimitTotal, usageLimitPerUser: row.usageLimitPerUser,
    startsAt: row.startsAt, endsAt: row.endsAt, scope: row.scope,
    targetIds: row.targetIds, isActive: row.isActive,
  };

  let timesUsedByUser = 0;
  if (userId && coupon.usageLimitPerUser !== null) {
    const { couponRedemptions } = await import('@aps/db');
    const [{ count } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(couponRedemptions)
      .where(and(eq(couponRedemptions.couponId, coupon.id), eq(couponRedemptions.userId, userId)));
    timesUsedByUser = count;
  }

  const lines: CouponLine[] = rows.map(({ item, variant, product }) => ({
    productId: product.id,
    categoryId: product.categoryId,
    lineTotal: (product.basePrice + variant.priceDelta) * item.quantity,
  }));

  const result = evaluateCoupon(coupon, {
    lines, subtotal, shippingTotal: 0, now: new Date(),
    timesUsedTotal: row.timesUsed, timesUsedByUser,
  });

  if (!result.ok) return { ...result, discount: 0 };
  return { ...result, coupon };
}

export async function addItem(cartId: string, variantId: string, quantity: number): Promise<void> {
  const db = getDb();

  const [variant] = await db.select({
    variant: productVariants, product: products,
  })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(productVariants.id, variantId))
    .limit(1);

  if (!variant || !variant.variant.isActive || variant.product.status !== 'active') {
    throw new NotFoundError('Product');
  }

  const [{ lineCount } = { lineCount: 0 }] = await db
    .select({ lineCount: sql<number>`count(*)::int` }).from(cartItems).where(eq(cartItems.cartId, cartId));

  const [existing] = await db.select().from(cartItems)
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId))).limit(1);

  if (!existing && lineCount >= CART.maxLines) {
    throw new ConflictError(`A cart can hold at most ${CART.maxLines} different items.`);
  }

  const desired = Math.min((existing?.quantity ?? 0) + quantity, CART.maxQuantityPerLine);
  if (desired > variant.variant.stockQty) {
    throw new OutOfStockError(variant.product.name, variant.variant.stockQty);
  }

  const unitPrice = variant.product.basePrice + variant.variant.priceDelta;

  if (existing) {
    await db.update(cartItems).set({ quantity: desired, priceSnapshot: unitPrice }).where(eq(cartItems.id, existing.id));
  } else {
    await db.insert(cartItems).values({ cartId, variantId, quantity: desired, priceSnapshot: unitPrice });
  }
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));
}

/** Quantity 0 removes the line — that is what the stepper's minus button sends at 1. */
export async function updateItem(cartId: string, itemId: string, quantity: number): Promise<void> {
  const db = getDb();

  const [existing] = await db.select({ item: cartItems, variant: productVariants, product: products })
    .from(cartItems)
    .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)))
    .limit(1);

  if (!existing) throw new NotFoundError('Cart item');

  if (quantity === 0) {
    await db.delete(cartItems).where(eq(cartItems.id, itemId));
    return;
  }
  if (quantity > existing.variant.stockQty) {
    throw new OutOfStockError(existing.product.name, existing.variant.stockQty);
  }

  await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, itemId));
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));
}

export async function removeItem(cartId: string, itemId: string): Promise<void> {
  const db = getDb();
  await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
}

export async function clearCart(cartId: string): Promise<void> {
  const db = getDb();
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  await db.update(carts).set({ couponCode: null }).where(eq(carts.id, cartId));
}

/** Store the code even if it does not currently apply; the summary explains why. */
export async function setCoupon(cartId: string, code: string | null): Promise<void> {
  const db = getDb();
  await db.update(carts)
    .set({ couponCode: code ? normaliseCouponCode(code) : null, updatedAt: new Date() })
    .where(eq(carts.id, cartId));
}

/**
 * Fold a guest cart into the signed-in one at login.
 * Quantities add, capped at the per-line maximum; the guest cart is then deleted.
 */
export async function mergeCarts(sourceCartId: string, targetCartId: string): Promise<void> {
  const db = getDb();
  const sourceItems = await db.select().from(cartItems).where(eq(cartItems.cartId, sourceCartId));

  for (const item of sourceItems) {
    const [existing] = await db.select().from(cartItems)
      .where(and(eq(cartItems.cartId, targetCartId), eq(cartItems.variantId, item.variantId))).limit(1);

    if (existing) {
      const merged = Math.min(existing.quantity + item.quantity, CART.maxQuantityPerLine);
      await db.update(cartItems).set({ quantity: merged }).where(eq(cartItems.id, existing.id));
    } else {
      await db.insert(cartItems).values({
        cartId: targetCartId, variantId: item.variantId,
        quantity: item.quantity, priceSnapshot: item.priceSnapshot,
      }).onConflictDoNothing();
    }
  }

  await db.delete(carts).where(eq(carts.id, sourceCartId));
}
