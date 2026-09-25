import { Router } from 'express';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { cmsPages, enquiries, getDb, orderItems, orders, products, reviews, stockNotifications } from '@aps/db';
import {
  enquiryInputSchema, paginationSchema, pincodeCheckSchema, reviewInputSchema, slugSchema, stockNotifySchema, uuidSchema,
} from '@aps/shared';
import { asyncHandler } from '../lib/async-handler.ts';
import { ConflictError, NotFoundError } from '../lib/errors.ts';
import { optionalAuth, requireAuth } from '../middleware/auth.ts';
import { publicWriteLimiter } from '../middleware/rate-limit.ts';
import { params, query, validateBody, validateParams, validateQuery } from '../middleware/validate.ts';
import { checkPincode } from '../services/shipping.service.ts';
import { logger } from '../lib/logger.ts';

export const publicRouter: Router = Router();

publicRouter.post('/pincode/check', validateBody(pincodeCheckSchema), asyncHandler(async (req, res) => {
  res.json(await checkPincode((req.body as { pincode: string }).pincode));
}));

// ---- Reviews --------------------------------------------------------------

publicRouter.get('/products/:productId/reviews',
  validateParams(z.object({ productId: uuidSchema })),
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { productId } = params<{ productId: string }>(req);
    const { page, perPage } = query<{ page: number; perPage: number }>(req);

    const where = and(eq(reviews.productId, productId), eq(reviews.status, 'approved'));
    const [{ total } = { total: 0 }] = await db.select({ total: sql<number>`count(*)::int` }).from(reviews).where(where);

    const rows = await db.select({
      id: reviews.id, productId: reviews.productId, rating: reviews.rating,
      title: reviews.title, body: reviews.body, status: reviews.status,
      authorName: reviews.authorName, isVerifiedPurchase: reviews.isVerifiedPurchase,
      createdAt: reviews.createdAt,
    }).from(reviews).where(where)
      .orderBy(desc(reviews.isVerifiedPurchase), desc(reviews.createdAt))
      .limit(perPage).offset((page - 1) * perPage);

    const [distribution] = await db.select({
      five: sql<number>`count(*) filter (where rating = 5)::int`,
      four: sql<number>`count(*) filter (where rating = 4)::int`,
      three: sql<number>`count(*) filter (where rating = 3)::int`,
      two: sql<number>`count(*) filter (where rating = 2)::int`,
      one: sql<number>`count(*) filter (where rating = 1)::int`,
      average: sql<number>`coalesce(round(avg(rating)::numeric, 1), 0)::float`,
    }).from(reviews).where(where);

    res.json({
      items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)),
      distribution,
    });
  }),
);

/**
 * Submit a review. Goes to the moderation queue rather than straight live.
 * "Verified purchase" is computed here from the order history, never accepted
 * from the client — it is the badge that makes reviews worth anything.
 */
publicRouter.post('/reviews',
  publicWriteLimiter,
  optionalAuth, requireAuth,
  validateBody(reviewInputSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const body = req.body as z.infer<typeof reviewInputSchema>;

    const [existing] = await db.select({ id: reviews.id }).from(reviews)
      .where(and(eq(reviews.productId, body.productId), eq(reviews.userId, req.user!.id))).limit(1);
    if (existing) throw new ConflictError('You have already reviewed this product.');

    const [purchase] = await db.select({ id: orderItems.id })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(
        eq(orderItems.productId, body.productId),
        eq(orders.userId, req.user!.id),
        sql`${orders.status} in ('paid','confirmed','packed','shipped','delivered')`,
      ))
      .limit(1);

    const [created] = await db.insert(reviews).values({
      productId: body.productId, userId: req.user!.id,
      rating: body.rating, title: body.title, body: body.body,
      status: 'pending',
      isVerifiedPurchase: Boolean(purchase),
      authorName: req.user!.fullName ?? 'Verified customer',
    }).returning();

    res.status(201).json({
      review: created,
      message: 'Thanks — your review will appear once we have read it.',
    });
  }),
);

// ---- Enquiries ------------------------------------------------------------

publicRouter.post('/enquiries', publicWriteLimiter, validateBody(enquiryInputSchema), asyncHandler(async (req, res) => {
  const db = getDb();
  const body = req.body as z.infer<typeof enquiryInputSchema>;
  const [created] = await db.insert(enquiries).values({ ...body, status: 'new' }).returning();
  logger.info({ enquiryId: created?.id, phone: body.phone }, 'new enquiry received');
  res.status(201).json({ id: created?.id, message: 'Thanks — we will call you back within one working day.' });
}));

// ---- Back-in-stock --------------------------------------------------------

publicRouter.post('/stock-notify', publicWriteLimiter, optionalAuth, validateBody(stockNotifySchema), asyncHandler(async (req, res) => {
  const db = getDb();
  const body = req.body as z.infer<typeof stockNotifySchema>;
  await db.insert(stockNotifications).values({
    variantId: body.variantId, userId: req.user?.id ?? null,
    phone: body.phone ?? null, email: body.email ?? null,
  }).onConflictDoNothing();
  res.status(201).json({ message: 'We will let you know the moment it is back.' });
}));

// ---- CMS ------------------------------------------------------------------

publicRouter.get('/pages', asyncHandler(async (_req, res) => {
  const db = getDb();
  const rows = await db.select({ slug: cmsPages.slug, title: cmsPages.title })
    .from(cmsPages).where(eq(cmsPages.isPublished, true));
  res.json({ items: rows });
}));

publicRouter.get('/pages/:slug',
  validateParams(z.object({ slug: slugSchema })),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const [page] = await db.select().from(cmsPages)
      .where(and(eq(cmsPages.slug, params<{ slug: string }>(req).slug), eq(cmsPages.isPublished, true)))
      .limit(1);
    if (!page) throw new NotFoundError('Page');
    res.json(page);
  }),
);
