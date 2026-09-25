import { Router } from 'express';
import { and, asc, desc, eq, ilike, notInArray, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  categories, getDb, productFaqs, productFeatures, productImages, products, productSpecs, productVariants,
} from '@aps/db';
import { categoryInputSchema, paginationSchema, productInputSchema, updateStockSchema, uuidSchema } from '@aps/shared';
import { asyncHandler } from '../../lib/async-handler.ts';
import { ConflictError, NotFoundError } from '../../lib/errors.ts';
import { params, query, validateBody, validateParams, validateQuery } from '../../middleware/validate.ts';
import { audit } from '../../services/audit.service.ts';

export const adminProductsRouter: Router = Router();

const adminListQuery = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  categoryId: uuidSchema.optional(),
});

adminProductsRouter.get('/', validateQuery(adminListQuery), asyncHandler(async (req, res) => {
  const db = getDb();
  const q = query<z.infer<typeof adminListQuery>>(req);

  const conditions = [];
  if (q.status) conditions.push(eq(products.status, q.status));
  if (q.categoryId) conditions.push(eq(products.categoryId, q.categoryId));
  if (q.search) {
    const term = `%${q.search}%`;
    conditions.push(or(ilike(products.name, term), ilike(products.sku, term)) ?? sql`true`);
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total } = { total: 0 }] = await db.select({ total: sql<number>`count(*)::int` }).from(products).where(where);

  const rows = await db.select({
    product: products,
    category: { id: categories.id, name: categories.name, slug: categories.slug },
    stock: sql<number>`coalesce((select sum(pv.stock_qty) from product_variants pv where pv.product_id = products.id), 0)::int`,
    variantCount: sql<number>`(select count(*) from product_variants pv where pv.product_id = products.id)::int`,
  })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(where)
    .orderBy(asc(products.sortOrder), desc(products.createdAt))
    .limit(q.perPage).offset((q.page - 1) * q.perPage);

  res.json({ items: rows, page: q.page, perPage: q.perPage, total, totalPages: Math.max(1, Math.ceil(total / q.perPage)) });
}));

adminProductsRouter.get('/:id', validateParams(z.object({ id: uuidSchema })), asyncHandler(async (req, res) => {
  const db = getDb();
  const { id } = params<{ id: string }>(req);

  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) throw new NotFoundError('Product');

  const [variants, images, specs, features, faqs] = await Promise.all([
    db.select().from(productVariants).where(eq(productVariants.productId, id)).orderBy(asc(productVariants.sortOrder)),
    db.select().from(productImages).where(eq(productImages.productId, id)).orderBy(asc(productImages.sortOrder)),
    db.select().from(productSpecs).where(eq(productSpecs.productId, id)).orderBy(asc(productSpecs.sortOrder)),
    db.select().from(productFeatures).where(eq(productFeatures.productId, id)).orderBy(asc(productFeatures.sortOrder)),
    db.select().from(productFaqs).where(eq(productFaqs.productId, id)).orderBy(asc(productFaqs.sortOrder)),
  ]);

  res.json({ ...product, variants, images, specs, features, faqs });
}));

/**
 * Create or replace a product and all of its children in one transaction.
 *
 * Children are replaced wholesale rather than diffed: the admin form posts the
 * complete desired state, and a delete-then-insert inside a transaction is far
 * easier to reason about than a three-way merge — with none of the "which row
 * did the user reorder" ambiguity.
 */
async function writeProductTree(productId: string, input: z.infer<typeof productInputSchema>) {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.delete(productSpecs).where(eq(productSpecs.productId, productId));
    await tx.delete(productFeatures).where(eq(productFeatures.productId, productId));
    await tx.delete(productFaqs).where(eq(productFaqs.productId, productId));

    if (input.specs.length > 0) {
      await tx.insert(productSpecs).values(input.specs.map((sp, i) => ({
        productId, group: sp.group, label: sp.label, value: sp.value, sortOrder: sp.sortOrder || i,
      })));
    }
    if (input.features.length > 0) {
      await tx.insert(productFeatures).values(input.features.map((f, i) => ({
        productId, eyebrow: f.eyebrow ?? null, title: f.title, body: f.body ?? null,
        mediaUrl: f.mediaUrl ?? null, mediaAlt: f.mediaAlt ?? null,
        layout: f.layout, stats: f.stats, sortOrder: f.sortOrder || i,
      })));
    }
    if (input.faqs.length > 0) {
      await tx.insert(productFaqs).values(input.faqs.map((f, i) => ({
        productId, question: f.question, answer: f.answer, sortOrder: f.sortOrder || i,
      })));
    }

    /* Variants are upserted rather than replaced, because cart lines and order
       history reference variant ids — deleting one would orphan them. */
    const keepIds: string[] = [];
    for (const [i, v] of input.variants.entries()) {
      if (v.id) {
        await tx.update(productVariants).set({
          sku: v.sku, optionName: v.optionName, optionValue: v.optionValue,
          priceDelta: v.priceDelta, stockQty: v.stockQty, lowStockThreshold: v.lowStockThreshold,
          weightG: v.weightG, hexColour: v.hexColour ?? null, isActive: v.isActive, sortOrder: i,
        }).where(eq(productVariants.id, v.id));
        keepIds.push(v.id);
      } else {
        const [created] = await tx.insert(productVariants).values({
          productId, sku: v.sku, optionName: v.optionName, optionValue: v.optionValue,
          priceDelta: v.priceDelta, stockQty: v.stockQty, lowStockThreshold: v.lowStockThreshold,
          weightG: v.weightG, hexColour: v.hexColour ?? null, isActive: v.isActive, sortOrder: i,
        }).returning();
        if (created) keepIds.push(created.id);
      }
    }
    /* Variants the admin removed are deactivated, never deleted — cart lines and
       order history reference their ids.
       notInArray, not a raw `<> all(...)`: interpolating a JS array into raw SQL
       expands it to ($3, $4), which Postgres parses as a record and refuses to
       cast to uuid[]. */
    if (keepIds.length > 0) {
      await tx.update(productVariants).set({ isActive: false }).where(and(
        eq(productVariants.productId, productId),
        notInArray(productVariants.id, keepIds),
      ));
    }

    await tx.delete(productImages).where(eq(productImages.productId, productId));
    if (input.images.length > 0) {
      const hasPrimary = input.images.some((img) => img.isPrimary);
      await tx.insert(productImages).values(input.images.map((img, i) => ({
        productId, url: img.url, alt: img.alt, variantId: img.variantId ?? null,
        sortOrder: img.sortOrder || i,
        // Guarantee exactly one primary image, so listings always have a thumbnail.
        isPrimary: hasPrimary ? img.isPrimary : i === 0,
      })));
    }
  });
}

adminProductsRouter.post('/', validateBody(productInputSchema), asyncHandler(async (req, res) => {
  const db = getDb();
  const input = req.body as z.infer<typeof productInputSchema>;

  const [clash] = await db.select({ id: products.id }).from(products)
    .where(or(eq(products.slug, input.slug), eq(products.sku, input.sku))).limit(1);
  if (clash) throw new ConflictError('A product with that slug or SKU already exists.');

  const [created] = await db.insert(products).values({
    slug: input.slug, sku: input.sku, name: input.name, tagline: input.tagline,
    summary: input.summary, description: input.description, categoryId: input.categoryId,
    brand: input.brand, basePrice: input.basePrice, compareAtPrice: input.compareAtPrice,
    status: input.status, hsnCode: input.hsnCode, taxRateBps: input.taxRateBps,
    weightG: input.weightG, lengthMm: input.lengthMm, widthMm: input.widthMm,
    heightMinMm: input.heightMinMm, heightMaxMm: input.heightMaxMm,
    loadCapacityKg: input.loadCapacityKg, warrantyMonths: input.warrantyMonths,
    badges: input.badges, isFeatured: input.isFeatured, sortOrder: input.sortOrder,
    metaTitle: input.metaTitle, metaDescription: input.metaDescription,
  }).returning();
  if (!created) throw new Error('Product insert returned nothing');

  await writeProductTree(created.id, input);
  await audit({ actorId: req.user?.id, action: 'product.create', entity: 'product', entityId: created.id, ip: req.ip });

  res.status(201).json(created);
}));

adminProductsRouter.put('/:id',
  validateParams(z.object({ id: uuidSchema })),
  validateBody(productInputSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { id } = params<{ id: string }>(req);
    const input = req.body as z.infer<typeof productInputSchema>;

    const [updated] = await db.update(products).set({
      slug: input.slug, sku: input.sku, name: input.name, tagline: input.tagline,
      summary: input.summary, description: input.description, categoryId: input.categoryId,
      brand: input.brand, basePrice: input.basePrice, compareAtPrice: input.compareAtPrice,
      status: input.status, hsnCode: input.hsnCode, taxRateBps: input.taxRateBps,
      weightG: input.weightG, lengthMm: input.lengthMm, widthMm: input.widthMm,
      heightMinMm: input.heightMinMm, heightMaxMm: input.heightMaxMm,
      loadCapacityKg: input.loadCapacityKg, warrantyMonths: input.warrantyMonths,
      badges: input.badges, isFeatured: input.isFeatured, sortOrder: input.sortOrder,
      metaTitle: input.metaTitle, metaDescription: input.metaDescription,
      updatedAt: new Date(),
    }).where(eq(products.id, id)).returning();

    if (!updated) throw new NotFoundError('Product');

    await writeProductTree(id, input);
    await audit({ actorId: req.user?.id, action: 'product.update', entity: 'product', entityId: id, ip: req.ip });

    res.json(updated);
  }),
);

/** Archive rather than delete — order history references these rows. */
adminProductsRouter.delete('/:id', validateParams(z.object({ id: uuidSchema })), asyncHandler(async (req, res) => {
  const db = getDb();
  const { id } = params<{ id: string }>(req);
  const [updated] = await db.update(products)
    .set({ status: 'archived', isFeatured: false, updatedAt: new Date() })
    .where(eq(products.id, id)).returning();
  if (!updated) throw new NotFoundError('Product');

  await audit({ actorId: req.user?.id, action: 'product.archive', entity: 'product', entityId: id, ip: req.ip });
  res.json({ ok: true, status: 'archived' });
}));

// ---- Stock ----------------------------------------------------------------

adminProductsRouter.patch('/variants/:variantId/stock',
  validateParams(z.object({ variantId: uuidSchema })),
  validateBody(updateStockSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { variantId } = params<{ variantId: string }>(req);
    const body = req.body as z.infer<typeof updateStockSchema>;

    const [updated] = await db.update(productVariants).set({
      stockQty: body.stockQty,
      ...(body.lowStockThreshold !== undefined ? { lowStockThreshold: body.lowStockThreshold } : {}),
    }).where(eq(productVariants.id, variantId)).returning();

    if (!updated) throw new NotFoundError('Variant');
    await audit({
      actorId: req.user?.id, action: 'stock.update', entity: 'variant', entityId: variantId,
      diff: { stockQty: body.stockQty }, ip: req.ip,
    });
    res.json(updated);
  }),
);

// ---- Categories -----------------------------------------------------------

adminProductsRouter.get('/meta/categories', asyncHandler(async (_req, res) => {
  const db = getDb();
  res.json({ items: await db.select().from(categories).orderBy(asc(categories.sortOrder)) });
}));

adminProductsRouter.post('/meta/categories', validateBody(categoryInputSchema), asyncHandler(async (req, res) => {
  const db = getDb();
  const [created] = await db.insert(categories).values(req.body as z.infer<typeof categoryInputSchema>).returning();
  await audit({ actorId: req.user?.id, action: 'category.create', entity: 'category', entityId: created?.id, ip: req.ip });
  res.status(201).json(created);
}));

adminProductsRouter.put('/meta/categories/:id',
  validateParams(z.object({ id: uuidSchema })),
  validateBody(categoryInputSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { id } = params<{ id: string }>(req);
    const [updated] = await db.update(categories)
      .set(req.body as z.infer<typeof categoryInputSchema>)
      .where(eq(categories.id, id)).returning();
    if (!updated) throw new NotFoundError('Category');
    res.json(updated);
  }),
);
