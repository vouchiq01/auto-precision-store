import { eq } from 'drizzle-orm';
import { createDb, isPgliteUrl } from '../client.ts';
import { bootstrapLocalDatabase } from '../bootstrap.ts';
import * as s from '../schema/index.ts';
import { categoryImage, insertProduct } from './insert-product.ts';
import { CATEGORIES, PRODUCTS } from './products.data.ts';
import { EXTRA_CATEGORIES, EXTRA_PRODUCTS } from './products.extra.ts';
import { HERO_SLIDES, TICKER_MESSAGES } from './slides.data.ts';

/**
 * Add the second-wave catalogue (fixed tables, tubs, combos) to a database that
 * is already live — WITHOUT clearing anything.
 *
 * The full seed (index.ts) truncates the catalogue with CASCADE, which also
 * empties every table that references a product: order lines, carts, reviews.
 * That is fine on a throwaway local database and destructive on one holding
 * real orders. This script only inserts what is missing, keyed on slug, so it is
 * safe to run repeatedly and safe to run in production.
 *
 *   DATABASE_URL=<direct url> npm run seed:extra -w @aps/db
 */
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL ?? '';
  const db = isPgliteUrl(url) ? await bootstrapLocalDatabase(url) : createDb({ max: 1 });

  const existingCategories = await db.select().from(s.categories);
  const categoryBySlug = new Map(existingCategories.map((c) => [c.slug, c.id]));

  /* Keep the collection order in step with the seed (accessories moved last). */
  for (const c of [...CATEGORIES, ...EXTRA_CATEGORIES]) {
    if (categoryBySlug.has(c.slug)) {
      /* Order, and the collection photo when there is one on disk (a collection
         inserted before its photo existed has none). */
      const image = categoryImage(c.slug);
      await db.update(s.categories)
        .set(image ? { sortOrder: c.sortOrder, imageUrl: image } : { sortOrder: c.sortOrder })
        .where(eq(s.categories.slug, c.slug));
    }
  }

  let addedCategories = 0;
  for (const c of EXTRA_CATEGORIES) {
    if (categoryBySlug.has(c.slug)) continue;
    const [row] = await db.insert(s.categories).values({
      slug: c.slug, name: c.name, description: c.description,
      imageUrl: categoryImage(c.slug), sortOrder: c.sortOrder,
    }).returning();
    if (!row) throw new Error(`Failed to insert category ${c.slug}`);
    categoryBySlug.set(c.slug, row.id);
    addedCategories += 1;
  }

  const existingSlugs = new Set((await db.select({ slug: s.products.slug }).from(s.products)).map((p) => p.slug));

  let addedProducts = 0;
  for (const [i, p] of EXTRA_PRODUCTS.entries()) {
    if (existingSlugs.has(p.slug)) continue;
    const categoryId = categoryBySlug.get(p.categorySlug);
    if (!categoryId) throw new Error(`Unknown category "${p.categorySlug}" for ${p.slug}`);
    /* One transaction per product: a failure part-way never leaves a product
       with no variants, which would be on sale and impossible to buy. */
    await db.transaction((tx) => insertProduct(tx, p, categoryId, PRODUCTS.length + i));
    addedProducts += 1;
    console.log(`  + ${p.name}`);
  }

  /* The homepage carousel's banner artwork: installed once. After that the slides
     belong to the admin — deleting one there must not bring it back on the next run.
     The marker is the artwork's filename, so a database that already has them is left
     alone. Any older hero banner (the original coded-hero text banner) is switched
     OFF, not deleted, so it stops showing as a stray first slide. */
  const heroBanners = await db.select({ id: s.banners.id, image: s.banners.imageDesktop })
    .from(s.banners).where(eq(s.banners.placement, 'hero'));
  let addedSlides = 0;
  if (!heroBanners.some((b) => b.image.startsWith('/banners/banner-'))) {
    for (const old of heroBanners) {
      await db.update(s.banners).set({ isActive: false }).where(eq(s.banners.id, old.id));
    }
    await db.insert(s.banners).values(
      HERO_SLIDES.map((slide, i) => ({ ...slide, placement: 'hero' as const, sortOrder: i, isActive: true })),
    );
    addedSlides = HERO_SLIDES.length;
  }

  /* The scrolling offers line: installed once, marker = a strip banner starting "Pan India".
     The original single strip banner ("Free delivery across Karnataka…", which overstated the
     free-freight rule) is switched off, not deleted. */
  const stripBanners = await db.select({ id: s.banners.id, title: s.banners.title })
    .from(s.banners).where(eq(s.banners.placement, 'strip'));
  let addedMessages = 0;
  if (!stripBanners.some((b) => b.title.startsWith('Pan India'))) {
    for (const old of stripBanners) {
      await db.update(s.banners).set({ isActive: false }).where(eq(s.banners.id, old.id));
    }
    await db.insert(s.banners).values(
      TICKER_MESSAGES.map((m, i) => ({ ...m, imageDesktop: '/banners/strip-freight.jpg', placement: 'strip' as const, sortOrder: i, isActive: true })),
    );
    addedMessages = TICKER_MESSAGES.length;
  }

  console.log(`\nAdded ${addedSlides} carousel slides and ${addedMessages} offer-line messages.`);
  console.log(`Added ${addedCategories} categories and ${addedProducts} products (${EXTRA_PRODUCTS.length - addedProducts} already present). Nothing was deleted.`);
  process.exit(0);
}

main().catch((err) => { console.error('seed:extra failed:', err); process.exit(1); });
