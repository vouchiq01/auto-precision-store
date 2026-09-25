import { Router } from 'express';
import { z } from 'zod';
import { paginationSchema, productFilterSchema, slugSchema } from '@aps/shared';
import { asyncHandler } from '../lib/async-handler.ts';
import { params, query, validateParams, validateQuery } from '../middleware/validate.ts';
import {
  compareProducts, getProductBySlug, listBanners, listCategories, listProducts, listProductSlugs,
} from '../services/catalog.service.ts';

export const catalogRouter: Router = Router();

catalogRouter.get('/categories', asyncHandler(async (_req, res) => {
  res.json({ items: await listCategories() });
}));

catalogRouter.get('/products',
  validateQuery(productFilterSchema.merge(paginationSchema)),
  asyncHandler(async (req, res) => {
    const q = query<z.infer<typeof productFilterSchema> & { page: number; perPage: number }>(req);
    res.json(await listProducts(q, q.page, q.perPage));
  }),
);

/** Slugs and timestamps for sitemap generation and static rendering. */
catalogRouter.get('/products/slugs', asyncHandler(async (_req, res) => {
  res.json({ items: await listProductSlugs() });
}));

catalogRouter.get('/products/compare',
  validateQuery(z.object({ slugs: z.string().transform((v) => v.split(',').filter(Boolean)) })),
  asyncHandler(async (req, res) => {
    const { slugs } = query<{ slugs: string[] }>(req);
    res.json({ items: await compareProducts(slugs) });
  }),
);

catalogRouter.get('/products/:slug',
  validateParams(z.object({ slug: slugSchema })),
  asyncHandler(async (req, res) => {
    res.json(await getProductBySlug(params<{ slug: string }>(req).slug));
  }),
);

catalogRouter.get('/banners',
  validateQuery(z.object({ placement: z.enum(['hero', 'strip', 'category', 'product']).optional() })),
  asyncHandler(async (req, res) => {
    res.json({ items: await listBanners(query<{ placement?: string }>(req).placement) });
  }),
);
