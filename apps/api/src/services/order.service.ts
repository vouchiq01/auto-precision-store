import { and, desc, eq, sql, inArray, lt } from 'drizzle-orm';
import {
  getDb, orderEvents, orderItems, orders, payments, productVariants, type Database,
} from '@aps/db';
import { canTransition, type Order, type OrderStatus, type Paginated } from '@aps/shared';
import { ConflictError, InvalidTransitionError, NotFoundError, ValidationError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';
import { nextInvoiceNumber } from '../lib/numbering.ts';
import { verifyPaymentSignature } from './razorpay.service.ts';
import { notifyBuyerOfStatusChange } from './order-notifications.service.ts';

/** Statuses that represent money received, and therefore require a tax invoice. */
const INVOICEABLE_STATUSES: OrderStatus[] = ['paid', 'confirmed', 'packed', 'shipped', 'delivered'];

async function hydrateOrder(row: typeof orders.$inferSelect): Promise<Order> {
  const db = getDb();
  const [items, events] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, row.id)),
    db.select().from(orderEvents)
      .where(and(eq(orderEvents.orderId, row.id), eq(orderEvents.isCustomerVisible, true)))
      .orderBy(orderEvents.createdAt),
  ]);

  return {
    id: row.id, orderNumber: row.orderNumber, status: row.status,
    lines: items.map((i) => ({
      id: i.id, productId: i.productId ?? '', productSlug: i.productSlug,
      variantId: i.variantId ?? '', name: i.name, variantLabel: i.variantLabel,
      sku: i.sku, imageUrl: i.imageUrl, quantity: i.quantity,
      unitPrice: i.unitPrice, lineTotal: i.lineTotal, taxAmount: i.taxAmount,
    })),
    events: events.map((e) => ({ id: e.id, status: e.status, note: e.note, createdAt: e.createdAt.toISOString() })),
    subtotal: row.subtotal, discountTotal: row.discountTotal, shippingTotal: row.shippingTotal,
    taxableValue: row.taxableValue, cgst: row.cgst, sgst: row.sgst, igst: row.igst,
    taxTotal: row.taxTotal, grandTotal: row.grandTotal,
    couponCode: row.couponCode, gstin: row.gstin,
    shippingAddress: row.shippingAddress, billingAddress: row.billingAddress,
    carrier: row.carrier, trackingNumber: row.trackingNumber, trackingUrl: row.trackingUrl, invoiceUrl: row.invoiceUrl,
    placedAt: row.placedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getOrderByNumber(orderNumber: string, userId?: string): Promise<Order> {
  const db = getDb();
  const conditions = [eq(orders.orderNumber, orderNumber)];
  // A signed-in customer may only read their own orders; guests may read by
  // number alone, which is how the confirmation page works before sign-up.
  if (userId) conditions.push(eq(orders.userId, userId));

  const [row] = await db.select().from(orders).where(and(...conditions)).limit(1);
  if (!row) throw new NotFoundError('Order');
  return hydrateOrder(row);
}

export async function listOrdersForUser(userId: string, page = 1, perPage = 10): Promise<Paginated<Order>> {
  const db = getDb();
  const [{ total } = { total: 0 }] = await db
    .select({ total: sql<number>`count(*)::int` }).from(orders).where(eq(orders.userId, userId));

  const rows = await db.select().from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(perPage).offset((page - 1) * perPage);

  return {
    items: await Promise.all(rows.map(hydrateOrder)),
    page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

/**
 * Mark an order paid.
 *
 * Idempotent by design: both the browser callback and the webhook call this,
 * they race, and whichever loses must be a no-op rather than a double-credit.
 * The invoice number is issued here — never at order creation — so an abandoned
 * payment cannot burn a number out of the GST-mandated consecutive sequence.
 */
export async function markOrderPaid(params: {
  orderId: string;
  razorpayPaymentId: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  method?: string;
  raw?: Record<string, unknown>;
  source: 'callback' | 'webhook';
}): Promise<Order> {
  const db = getDb();
  /* Set only on the real transition, never on the idempotent no-op below —
     Razorpay can and does deliver the same webhook twice, and the buyer must
     hear "your payment went through" once, not once per delivery. */
  let justTransitioned = false;

  const result = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders)
      .where(eq(orders.id, params.orderId)).limit(1).for('update');
    if (!order) throw new NotFoundError('Order');

    if (order.status !== 'pending_payment') {
      logger.info({ orderId: order.id, status: order.status, source: params.source },
        'payment confirmation for an order that is already past pending — ignoring');
      return order;
    }
    justTransitioned = true;

    const invoiceNumber = order.invoiceNumber ?? (await nextInvoiceNumber(tx as unknown as Database));

    const [updated] = await tx.update(orders).set({
      status: 'paid', placedAt: order.placedAt ?? new Date(), invoiceNumber, updatedAt: new Date(),
    }).where(eq(orders.id, order.id)).returning();

    await tx.insert(orderEvents).values({
      orderId: order.id, status: 'paid',
      note: `Payment received (${params.source === 'webhook' ? 'gateway webhook' : 'checkout'}).`,
    });

    /* razorpay_payment_id is unique, so a duplicate webhook delivery collides
       here and updates instead of inserting a second payment row. */
    await tx.insert(payments).values({
      orderId: order.id,
      provider: 'razorpay',
      razorpayOrderId: params.razorpayOrderId ?? null,
      razorpayPaymentId: params.razorpayPaymentId,
      razorpaySignature: params.razorpaySignature ?? null,
      amount: order.grandTotal,
      status: 'captured',
      method: params.method ?? null,
      raw: params.raw ?? null,
    }).onConflictDoUpdate({
      target: payments.razorpayPaymentId,
      set: { status: 'captured', method: params.method ?? null, updatedAt: new Date() },
    });

    return updated ?? order;
  });

  const hydrated = await hydrateOrder(result);
  if (justTransitioned) await notifyBuyerOfStatusChange(hydrated, 'paid');
  return hydrated;
}

/** Verify the browser's callback, then confirm. Signature failure throws. */
export async function confirmPaymentFromCallback(params: {
  orderId: string; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string;
}): Promise<Order> {
  verifyPaymentSignature({
    razorpayOrderId: params.razorpayOrderId,
    razorpayPaymentId: params.razorpayPaymentId,
    razorpaySignature: params.razorpaySignature,
  });

  return markOrderPaid({
    orderId: params.orderId,
    razorpayOrderId: params.razorpayOrderId,
    razorpayPaymentId: params.razorpayPaymentId,
    razorpaySignature: params.razorpaySignature,
    source: 'callback',
  });
}

export async function recordFailedPayment(params: {
  orderId: string; razorpayPaymentId: string; errorCode?: string; errorDescription?: string;
  raw?: Record<string, unknown>;
}): Promise<void> {
  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, params.orderId)).limit(1);
  if (!order) return;

  await db.insert(payments).values({
    orderId: order.id, provider: 'razorpay',
    razorpayPaymentId: params.razorpayPaymentId,
    amount: order.grandTotal, status: 'failed',
    errorCode: params.errorCode ?? null,
    errorDescription: params.errorDescription ?? null,
    raw: params.raw ?? null,
  }).onConflictDoUpdate({
    target: payments.razorpayPaymentId,
    set: { status: 'failed', errorCode: params.errorCode ?? null, updatedAt: new Date() },
  });

  await db.insert(orderEvents).values({
    orderId: order.id, status: 'pending_payment',
    note: `Payment attempt failed${params.errorDescription ? `: ${params.errorDescription}` : '.'}`,
    isCustomerVisible: false,
  });
}

/**
 * Admin status change. The legal-transition table is enforced here so an order
 * cannot jump from cancelled back to shipped, and the timeline stays coherent.
 * Cancelling or refunding returns stock to the shelf.
 */
export async function updateOrderStatus(params: {
  orderId: string; status: OrderStatus; note?: string | null;
  carrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null; actorId: string;
}): Promise<Order> {
  const db = getDb();

  const result = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, params.orderId)).limit(1).for('update');
    if (!order) throw new NotFoundError('Order');

    if (order.status === params.status) throw new ConflictError(`This order is already ${params.status}.`);
    if (!canTransition(order.status, params.status)) {
      throw new InvalidTransitionError(order.status, params.status);
    }

    /* Checked after the transition itself is confirmed legal: a request that
       is illegal for an unrelated reason (skipping a status) should report as
       that, not as "you forgot the tracking number". Marking an order shipped
       without saying who is carrying it is the one gap that actually breaks
       the point of shipping it — the customer has no way to track it and
       support has no way to answer "where is my table". */
    const carrier = params.carrier ?? order.carrier;
    const trackingNumber = params.trackingNumber ?? order.trackingNumber;
    if (params.status === 'shipped' && !(carrier && trackingNumber)) {
      throw new ValidationError(
        { carrier: ['Add the carrier and tracking number before marking an order shipped.'] },
        'Add the carrier and tracking number before marking an order shipped.',
      );
    }

    const restocking = params.status === 'cancelled' || params.status === 'refunded';
    if (restocking) {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      for (const item of items) {
        if (!item.variantId) continue;
        await tx.update(productVariants)
          .set({ stockQty: sql`${productVariants.stockQty} + ${item.quantity}` })
          .where(eq(productVariants.id, item.variantId));
      }
    }

    /* An order can reach a paid state without going through the gateway — a bank
       transfer, or an admin reconciling a payment the webhook never delivered.
       Those orders still need a GST invoice, and the number must come from the
       same gap-free sequence, so it is issued here too rather than only on the
       payment path. */
    const needsInvoice = INVOICEABLE_STATUSES.includes(params.status) && !order.invoiceNumber;
    const invoiceNumber = needsInvoice
      ? await nextInvoiceNumber(tx as unknown as Database)
      : order.invoiceNumber;

    const [updated] = await tx.update(orders).set({
      status: params.status,
      invoiceNumber,
      placedAt: order.placedAt ?? (needsInvoice ? new Date() : null),
      carrier: params.carrier ?? order.carrier,
      trackingNumber: params.trackingNumber ?? order.trackingNumber,
      trackingUrl: params.trackingUrl ?? order.trackingUrl,
      updatedAt: new Date(),
    }).where(eq(orders.id, order.id)).returning();

    await tx.insert(orderEvents).values({
      orderId: order.id, status: params.status,
      note: params.note ?? null, createdBy: params.actorId,
    });

    return updated ?? order;
  });

  const hydrated = await hydrateOrder(result);
  await notifyBuyerOfStatusChange(hydrated, params.status);
  return hydrated;
}

/**
 * Release stock held by orders whose payment never completed.
 *
 * Stock is reserved at order creation so a shopper is not beaten to the last
 * table while typing their card number. That reservation has to expire, or an
 * abandoned checkout removes stock from sale forever. Runs on a timer.
 */
export async function releaseAbandonedOrders(olderThanMinutes = 45): Promise<number> {
  const db = getDb();
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);

  const stale = await db.select({ id: orders.id, orderNumber: orders.orderNumber })
    .from(orders)
    .where(and(eq(orders.status, 'pending_payment'), lt(orders.createdAt, cutoff)));

  if (stale.length === 0) return 0;

  for (const order of stale) {
    await db.transaction(async (tx) => {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      for (const item of items) {
        if (!item.variantId) continue;
        await tx.update(productVariants)
          .set({ stockQty: sql`${productVariants.stockQty} + ${item.quantity}` })
          .where(eq(productVariants.id, item.variantId));
      }
      await tx.update(orders).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(orders.id, order.id));
      await tx.insert(orderEvents).values({
        orderId: order.id, status: 'cancelled',
        note: 'Cancelled automatically — payment was not completed.', isCustomerVisible: false,
      });
    });
  }

  logger.info({ count: stale.length }, 'released stock from abandoned orders');
  return stale.length;
}

/** Look up the order a Razorpay order id belongs to, for webhook processing. */
export async function findOrderByRazorpayOrderId(razorpayOrderId: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db.select({ orderId: payments.orderId }).from(payments)
    .where(eq(payments.razorpayOrderId, razorpayOrderId)).limit(1);
  return row?.orderId ?? null;
}
