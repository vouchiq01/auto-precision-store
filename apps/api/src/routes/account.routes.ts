import { Router } from 'express';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { addresses, getDb, orders, products, users, wishlists } from '@aps/db';
import { addressSchema, paginationSchema, updateProfileSchema, uuidSchema } from '@aps/shared';
import { asyncHandler } from '../lib/async-handler.ts';
import { NotFoundError } from '../lib/errors.ts';
import { optionalAuth, requireAuth } from '../middleware/auth.ts';
import { params, query, validateBody, validateParams, validateQuery } from '../middleware/validate.ts';
import { listOrdersForUser } from '../services/order.service.ts';
import { generateInvoicePdf } from '../services/invoice.service.ts';

export const accountRouter: Router = Router();
accountRouter.use(optionalAuth, requireAuth);

accountRouter.patch('/profile', validateBody(updateProfileSchema), asyncHandler(async (req, res) => {
  const db = getDb();
  const body = req.body as { fullName: string; email?: string | null };
  const [updated] = await db.update(users)
    .set({ fullName: body.fullName, email: body.email ?? null, updatedAt: new Date() })
    .where(eq(users.id, req.user!.id))
    .returning();
  if (!updated) throw new NotFoundError('Account');
  res.json({ user: { id: updated.id, phone: updated.phone, email: updated.email, fullName: updated.fullName, role: updated.role } });
}));

// ---- Addresses ------------------------------------------------------------

accountRouter.get('/addresses', asyncHandler(async (req, res) => {
  const db = getDb();
  const rows = await db.select().from(addresses)
    .where(and(eq(addresses.userId, req.user!.id), isNull(addresses.deletedAt)))
    .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
  res.json({ items: rows });
}));

accountRouter.post('/addresses', validateBody(addressSchema), asyncHandler(async (req, res) => {
  const db = getDb();
  const body = req.body as z.infer<typeof addressSchema>;

  /* Only one address can be the default. Clearing the flag on the others first
     keeps the partial unique index happy and avoids a constraint error. */
  if (body.isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, req.user!.id));
  }

  const [created] = await db.insert(addresses).values({ ...body, userId: req.user!.id }).returning();
  res.status(201).json(created);
}));

accountRouter.put('/addresses/:id',
  validateParams(z.object({ id: uuidSchema })),
  validateBody(addressSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { id } = params<{ id: string }>(req);
    const body = req.body as z.infer<typeof addressSchema>;

    if (body.isDefault) {
      await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, req.user!.id));
    }

    const [updated] = await db.update(addresses).set(body)
      .where(and(eq(addresses.id, id), eq(addresses.userId, req.user!.id)))
      .returning();
    if (!updated) throw new NotFoundError('Address');
    res.json(updated);
  }),
);

accountRouter.delete('/addresses/:id',
  validateParams(z.object({ id: uuidSchema })),
  asyncHandler(async (req, res) => {
    const db = getDb();
    /* Soft delete: an order's shipping address is snapshotted onto the order, but
       keeping the row means the customer's history still renders if anything
       ever references it. */
    await db.update(addresses).set({ deletedAt: new Date(), isDefault: false })
      .where(and(eq(addresses.id, params<{ id: string }>(req).id), eq(addresses.userId, req.user!.id)));
    res.json({ ok: true });
  }),
);

// ---- Orders ---------------------------------------------------------------

accountRouter.get('/orders', validateQuery(paginationSchema), asyncHandler(async (req, res) => {
  const { page, perPage } = query<{ page: number; perPage: number }>(req);
  res.json(await listOrdersForUser(req.user!.id, page, perPage));
}));

accountRouter.get('/orders/:orderNumber/invoice', asyncHandler(async (req, res) => {
  const db = getDb();
  const [order] = await db.select({ id: orders.id }).from(orders)
    .where(and(eq(orders.orderNumber, String(req.params.orderNumber)), eq(orders.userId, req.user!.id)))
    .limit(1);
  if (!order) throw new NotFoundError('Order');

  const { buffer, filename } = await generateInvoicePdf(order.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}));

// ---- Wishlist -------------------------------------------------------------

accountRouter.get('/wishlist', asyncHandler(async (req, res) => {
  const db = getDb();
  const rows = await db.select({ product: products, addedAt: wishlists.createdAt })
    .from(wishlists)
    .innerJoin(products, eq(wishlists.productId, products.id))
    .where(eq(wishlists.userId, req.user!.id))
    .orderBy(desc(wishlists.createdAt));
  res.json({ items: rows });
}));

accountRouter.post('/wishlist/:productId',
  validateParams(z.object({ productId: uuidSchema })),
  asyncHandler(async (req, res) => {
    const db = getDb();
    await db.insert(wishlists)
      .values({ userId: req.user!.id, productId: params<{ productId: string }>(req).productId })
      .onConflictDoNothing();
    res.status(201).json({ ok: true });
  }),
);

accountRouter.delete('/wishlist/:productId',
  validateParams(z.object({ productId: uuidSchema })),
  asyncHandler(async (req, res) => {
    const db = getDb();
    await db.delete(wishlists).where(and(
      eq(wishlists.userId, req.user!.id),
      eq(wishlists.productId, params<{ productId: string }>(req).productId),
    ));
    res.json({ ok: true });
  }),
);
