import { Router } from 'express';
import { and, asc, desc, eq, gte, ilike, isNull, lte, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  banners, cmsPages, coupons, enquiries, getDb, orderItems, orders, productVariants, products,
  reviews, stockNotifications, users,
} from '@aps/db';
import {
  bannerInputSchema, cmsPageInputSchema, couponInputSchema, moderateReviewSchema, ORDER_STATUSES,
  paginationSchema, updateEnquirySchema, updateOrderStatusSchema, uuidSchema,
} from '@aps/shared';
import { asyncHandler } from '../../lib/async-handler.ts';
import { ConflictError, NotFoundError } from '../../lib/errors.ts';
import { params, query, validateBody, validateParams, validateQuery } from '../../middleware/validate.ts';
import { audit } from '../../services/audit.service.ts';
import { generateInvoicePdf } from '../../services/invoice.service.ts';
import { updateOrderStatus } from '../../services/order.service.ts';

/* Correlated subqueries are written with an explicit inner alias and a
   table-qualified outer reference. Interpolating a Drizzle column (${table.col})
   renders it UNQUALIFIED, so inside a subquery it silently binds to the inner
   table instead of the outer one — the predicate then never matches and the
   count comes back 0 with no error. */

export const adminCommerceRouter: Router = Router();

// ---- Banners --------------------------------------------------------------

adminCommerceRouter.get('/banners', asyncHandler(async (_req, res) => {
  const db = getDb();
  res.json({ items: await db.select().from(banners).orderBy(asc(banners.placement), asc(banners.sortOrder)) });
}));

adminCommerceRouter.post('/banners', validateBody(bannerInputSchema), asyncHandler(async (req, res) => {
  const db = getDb();
  const [created] = await db.insert(banners).values(req.body as z.infer<typeof bannerInputSchema>).returning();
  await audit({ actorId: req.user?.id, action: 'banner.create', entity: 'banner', entityId: created?.id, ip: req.ip });
  res.status(201).json(created);
}));

adminCommerceRouter.put('/banners/:id',
  validateParams(z.object({ id: uuidSchema })), validateBody(bannerInputSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { id } = params<{ id: string }>(req);
    const [updated] = await db.update(banners).set(req.body as z.infer<typeof bannerInputSchema>)
      .where(eq(banners.id, id)).returning();
    if (!updated) throw new NotFoundError('Banner');
    await audit({ actorId: req.user?.id, action: 'banner.update', entity: 'banner', entityId: id, ip: req.ip });
    res.json(updated);
  }),
);

adminCommerceRouter.delete('/banners/:id', validateParams(z.object({ id: uuidSchema })), asyncHandler(async (req, res) => {
  const db = getDb();
  const { id } = params<{ id: string }>(req);
  await db.delete(banners).where(eq(banners.id, id));
  await audit({ actorId: req.user?.id, action: 'banner.delete', entity: 'banner', entityId: id, ip: req.ip });
  res.json({ ok: true });
}));

// ---- Coupons --------------------------------------------------------------

adminCommerceRouter.get('/coupons', asyncHandler(async (_req, res) => {
  const db = getDb();
  res.json({ items: await db.select().from(coupons).orderBy(desc(coupons.createdAt)) });
}));

adminCommerceRouter.post('/coupons', validateBody(couponInputSchema), asyncHandler(async (req, res) => {
  const db = getDb();
  const input = req.body as z.infer<typeof couponInputSchema>;

  const [clash] = await db.select({ id: coupons.id }).from(coupons).where(eq(coupons.code, input.code)).limit(1);
  if (clash) throw new ConflictError(`A coupon with the code ${input.code} already exists.`);

  const [created] = await db.insert(coupons).values(input).returning();
  await audit({ actorId: req.user?.id, action: 'coupon.create', entity: 'coupon', entityId: created?.id, diff: { code: input.code }, ip: req.ip });
  res.status(201).json(created);
}));

adminCommerceRouter.put('/coupons/:id',
  validateParams(z.object({ id: uuidSchema })), validateBody(couponInputSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { id } = params<{ id: string }>(req);
    const [updated] = await db.update(coupons).set(req.body as z.infer<typeof couponInputSchema>)
      .where(eq(coupons.id, id)).returning();
    if (!updated) throw new NotFoundError('Coupon');
    res.json(updated);
  }),
);

adminCommerceRouter.delete('/coupons/:id', validateParams(z.object({ id: uuidSchema })), asyncHandler(async (req, res) => {
  const db = getDb();
  const { id } = params<{ id: string }>(req);
  /* Deactivate rather than delete: coupon_redemptions reference this row and
     the reporting needs to explain historic discounts. */
  const [updated] = await db.update(coupons).set({ isActive: false }).where(eq(coupons.id, id)).returning();
  if (!updated) throw new NotFoundError('Coupon');
  res.json({ ok: true, deactivated: true });
}));

// ---- Orders ---------------------------------------------------------------

const orderListQuery = paginationSchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  search: z.string().trim().max(80).optional(),
});

adminCommerceRouter.get('/orders', validateQuery(orderListQuery), asyncHandler(async (req, res) => {
  const db = getDb();
  const q = query<z.infer<typeof orderListQuery>>(req);

  const conditions = [];
  if (q.status) conditions.push(eq(orders.status, q.status));
  if (q.search) {
    const term = `%${q.search}%`;
    conditions.push(or(
      ilike(orders.orderNumber, term),
      sql`${orders.shippingAddress}->>'fullName' ilike ${term}`,
      sql`${orders.shippingAddress}->>'phone' ilike ${term}`,
    ) ?? sql`true`);
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total } = { total: 0 }] = await db.select({ total: sql<number>`count(*)::int` }).from(orders).where(where);

  const rows = await db.select({
    order: orders,
    itemCount: sql<number>`(select coalesce(sum(oi.quantity), 0) from order_items oi where oi.order_id = orders.id)::int`,
  })
    .from(orders).where(where)
    .orderBy(desc(orders.createdAt))
    .limit(q.perPage).offset((q.page - 1) * q.perPage);

  res.json({ items: rows, page: q.page, perPage: q.perPage, total, totalPages: Math.max(1, Math.ceil(total / q.perPage)) });
}));

adminCommerceRouter.get('/orders/:id', validateParams(z.object({ id: uuidSchema })), asyncHandler(async (req, res) => {
  const db = getDb();
  const { id } = params<{ id: string }>(req);
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) throw new NotFoundError('Order');

  const { orderEvents, payments } = await import('@aps/db');
  const [items, events, paymentRows] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, id)).orderBy(asc(orderEvents.createdAt)),
    db.select().from(payments).where(eq(payments.orderId, id)).orderBy(desc(payments.createdAt)),
  ]);

  res.json({ ...order, items, events, payments: paymentRows });
}));

adminCommerceRouter.patch('/orders/:id/status',
  validateParams(z.object({ id: uuidSchema })), validateBody(updateOrderStatusSchema),
  asyncHandler(async (req, res) => {
    const { id } = params<{ id: string }>(req);
    const body = req.body as z.infer<typeof updateOrderStatusSchema>;

    const order = await updateOrderStatus({
      orderId: id, status: body.status, note: body.note,
      trackingNumber: body.trackingNumber, trackingUrl: body.trackingUrl,
      actorId: req.user!.id,
    });

    await audit({
      actorId: req.user?.id, action: 'order.status', entity: 'order', entityId: id,
      diff: { status: body.status }, ip: req.ip,
    });
    res.json(order);
  }),
);

adminCommerceRouter.get('/orders/:id/invoice', validateParams(z.object({ id: uuidSchema })), asyncHandler(async (req, res) => {
  const { buffer, filename } = await generateInvoicePdf(params<{ id: string }>(req).id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}));

// ---- Inventory ------------------------------------------------------------

adminCommerceRouter.get('/inventory', asyncHandler(async (_req, res) => {
  const db = getDb();
  const rows = await db.select({
    variantId: productVariants.id,
    sku: productVariants.sku,
    optionLabel: sql<string>`${productVariants.optionName} || ': ' || ${productVariants.optionValue}`,
    stockQty: productVariants.stockQty,
    lowStockThreshold: productVariants.lowStockThreshold,
    productId: products.id,
    productName: products.name,
    productSlug: products.slug,
    status: products.status,
    waitlist: sql<number>`(
      select count(*) from stock_notifications sn
      where sn.variant_id = product_variants.id and sn.notified_at is null
    )::int`,
  })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(productVariants.isActive, true))
    .orderBy(asc(productVariants.stockQty), asc(products.name));

  res.json({
    items: rows,
    lowStock: rows.filter((r) => r.stockQty <= r.lowStockThreshold).length,
    outOfStock: rows.filter((r) => r.stockQty === 0).length,
  });
}));

/** People waiting for a restock, so the admin knows who to tell. */
adminCommerceRouter.get('/inventory/waitlist', asyncHandler(async (_req, res) => {
  const db = getDb();
  const rows = await db.select({
    id: stockNotifications.id, phone: stockNotifications.phone, email: stockNotifications.email,
    createdAt: stockNotifications.createdAt,
    sku: productVariants.sku, productName: products.name,
  })
    .from(stockNotifications)
    .innerJoin(productVariants, eq(stockNotifications.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(isNull(stockNotifications.notifiedAt))
    .orderBy(desc(stockNotifications.createdAt));
  res.json({ items: rows });
}));

// ---- Customers ------------------------------------------------------------

adminCommerceRouter.get('/customers', validateQuery(paginationSchema.extend({ search: z.string().trim().max(80).optional() })),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const q = query<{ page: number; perPage: number; search?: string }>(req);

    const conditions = [eq(users.role, 'customer')];
    if (q.search) {
      const term = `%${q.search}%`;
      conditions.push(or(ilike(users.fullName, term), ilike(users.phone, term), ilike(users.email, term)) ?? sql`true`);
    }
    const where = and(...conditions);

    const [{ total } = { total: 0 }] = await db.select({ total: sql<number>`count(*)::int` }).from(users).where(where);

    const rows = await db.select({
      id: users.id, phone: users.phone, email: users.email, fullName: users.fullName,
      isBlocked: users.isBlocked, createdAt: users.createdAt, lastLoginAt: users.lastLoginAt,
      orderCount: sql<number>`(select count(*) from orders o where o.user_id = users.id and o.status <> 'cancelled')::int`,
      lifetimeValue: sql<number>`(
        select coalesce(sum(o.grand_total), 0) from orders o
        where o.user_id = users.id and o.status in ('paid','confirmed','packed','shipped','delivered')
      )::bigint`,
    })
      .from(users).where(where)
      .orderBy(desc(users.createdAt))
      .limit(q.perPage).offset((q.page - 1) * q.perPage);

    res.json({
      items: rows.map((r) => ({ ...r, lifetimeValue: Number(r.lifetimeValue) })),
      page: q.page, perPage: q.perPage, total, totalPages: Math.max(1, Math.ceil(total / q.perPage)),
    });
  }),
);

adminCommerceRouter.patch('/customers/:id/block',
  validateParams(z.object({ id: uuidSchema })),
  validateBody(z.object({ isBlocked: z.boolean() })),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { id } = params<{ id: string }>(req);
    const { isBlocked } = req.body as { isBlocked: boolean };
    const [updated] = await db.update(users).set({ isBlocked }).where(eq(users.id, id)).returning();
    if (!updated) throw new NotFoundError('Customer');
    await audit({ actorId: req.user?.id, action: isBlocked ? 'customer.block' : 'customer.unblock', entity: 'user', entityId: id, ip: req.ip });
    res.json({ ok: true, isBlocked });
  }),
);

// ---- Reviews --------------------------------------------------------------

adminCommerceRouter.get('/reviews',
  validateQuery(paginationSchema.extend({ status: z.enum(['pending', 'approved', 'rejected']).optional() })),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const q = query<{ page: number; perPage: number; status?: 'pending' | 'approved' | 'rejected' }>(req);
    const where = q.status ? eq(reviews.status, q.status) : undefined;

    const [{ total } = { total: 0 }] = await db.select({ total: sql<number>`count(*)::int` }).from(reviews).where(where);

    const rows = await db.select({
      review: reviews,
      productName: products.name,
      productSlug: products.slug,
    })
      .from(reviews)
      .innerJoin(products, eq(reviews.productId, products.id))
      .where(where)
      .orderBy(desc(reviews.createdAt))
      .limit(q.perPage).offset((q.page - 1) * q.perPage);

    res.json({ items: rows, page: q.page, perPage: q.perPage, total, totalPages: Math.max(1, Math.ceil(total / q.perPage)) });
  }),
);

adminCommerceRouter.patch('/reviews/:id',
  validateParams(z.object({ id: uuidSchema })), validateBody(moderateReviewSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { id } = params<{ id: string }>(req);
    const body = req.body as z.infer<typeof moderateReviewSchema>;

    const [updated] = await db.update(reviews).set({
      status: body.status, moderationNote: body.moderationNote ?? null,
      moderatedBy: req.user!.id, moderatedAt: new Date(),
    }).where(eq(reviews.id, id)).returning();

    if (!updated) throw new NotFoundError('Review');
    await audit({ actorId: req.user?.id, action: `review.${body.status}`, entity: 'review', entityId: id, ip: req.ip });
    res.json(updated);
  }),
);

// ---- Enquiries ------------------------------------------------------------

adminCommerceRouter.get('/enquiries',
  validateQuery(paginationSchema.extend({ status: z.enum(['new', 'contacted', 'quoted', 'won', 'lost']).optional() })),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const q = query<{ page: number; perPage: number; status?: 'new' }>(req);
    const where = q.status ? eq(enquiries.status, q.status) : undefined;

    const [{ total } = { total: 0 }] = await db.select({ total: sql<number>`count(*)::int` }).from(enquiries).where(where);

    const rows = await db.select({
      enquiry: enquiries,
      productName: products.name,
    })
      .from(enquiries)
      .leftJoin(products, eq(enquiries.productId, products.id))
      .where(where)
      .orderBy(desc(enquiries.createdAt))
      .limit(q.perPage).offset((q.page - 1) * q.perPage);

    res.json({ items: rows, page: q.page, perPage: q.perPage, total, totalPages: Math.max(1, Math.ceil(total / q.perPage)) });
  }),
);

adminCommerceRouter.patch('/enquiries/:id',
  validateParams(z.object({ id: uuidSchema })), validateBody(updateEnquirySchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { id } = params<{ id: string }>(req);
    const body = req.body as z.infer<typeof updateEnquirySchema>;
    const [updated] = await db.update(enquiries).set({
      status: body.status, internalNote: body.internalNote ?? null,
      assignedTo: req.user!.id, updatedAt: new Date(),
    }).where(eq(enquiries.id, id)).returning();
    if (!updated) throw new NotFoundError('Enquiry');
    res.json(updated);
  }),
);

// ---- CMS ------------------------------------------------------------------

adminCommerceRouter.get('/pages', asyncHandler(async (_req, res) => {
  const db = getDb();
  res.json({ items: await db.select().from(cmsPages).orderBy(asc(cmsPages.slug)) });
}));

adminCommerceRouter.put('/pages/:slug', validateBody(cmsPageInputSchema), asyncHandler(async (req, res) => {
  const db = getDb();
  const slug = String(req.params.slug);
  const input = req.body as z.infer<typeof cmsPageInputSchema>;

  const [updated] = await db.insert(cmsPages)
    .values({ ...input, slug, updatedBy: req.user!.id })
    .onConflictDoUpdate({
      target: cmsPages.slug,
      set: {
        title: input.title, body: input.body, metaTitle: input.metaTitle,
        metaDescription: input.metaDescription, isPublished: input.isPublished,
        updatedBy: req.user!.id, updatedAt: new Date(),
      },
    }).returning();

  await audit({ actorId: req.user?.id, action: 'page.update', entity: 'cms_page', entityId: slug, ip: req.ip });
  res.json(updated);
}));
