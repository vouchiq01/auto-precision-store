import { asc, eq } from 'drizzle-orm';
import { createDb, isPgliteUrl } from '../client.ts';
import { bootstrapLocalDatabase } from '../bootstrap.ts';
import * as s from '../schema/index.ts';
import { featureMedia, imageUrls } from './insert-product.ts';

/**
 * Re-read every product's photographs from apps/web/public/products and bring
 * the database in line — WITHOUT touching anything else.
 *
 * This is the "I have new photos" step. Drop files in
 * public/products/<slug>/ (01.jpg … 04.jpg, feature-1.jpg …, optionally an
 * images.json listing exactly which to use), deploy the web app, then run this.
 * It replaces only product_images rows and the mediaUrl on product_features,
 * so it is safe on a database holding real orders — unlike the full seed, whose
 * CASCADE truncate empties order lines and carts.
 *
 *   DATABASE_URL=<direct url> npm run seed:images -w @aps/db
 */
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL ?? '';
  const db = isPgliteUrl(url) ? await bootstrapLocalDatabase(url) : createDb({ max: 1 });

  const products = await db.select({ id: s.products.id, slug: s.products.slug, name: s.products.name }).from(s.products);
  let galleries = 0;

  /* A product whose photographs have been uploaded in the admin (they live in
     Supabase Storage, not under /products/) is managed there from then on. Re-
     syncing it from the repository's folders would delete the client's uploads and
     bring back the stand-in photos he replaced. */
  const existing = await db.select({ productId: s.productImages.productId, url: s.productImages.url }).from(s.productImages);
  const adminManaged = new Set(existing.filter((row) => !row.url.startsWith('/products/')).map((row) => row.productId));
  let skipped = 0;

  for (const product of products) {
    if (adminManaged.has(product.id)) {
      skipped += 1;
      console.log(`  ${product.slug}: left alone (photos managed in the admin)`);
      continue;
    }
    const images = imageUrls(product.slug);

    await db.transaction(async (tx) => {
      await tx.delete(s.productImages).where(eq(s.productImages.productId, product.id));
      if (images.length > 0) {
        await tx.insert(s.productImages).values(
          images.map((img, i) => ({
            productId: product.id, url: img.url, alt: `${product.name} — view ${i + 1}`,
            sortOrder: i, isPrimary: i === 0,
          })),
        );
      }

      const features = await tx.select({ id: s.productFeatures.id })
        .from(s.productFeatures).where(eq(s.productFeatures.productId, product.id))
        .orderBy(asc(s.productFeatures.sortOrder));
      for (const [index, feature] of features.entries()) {
        await tx.update(s.productFeatures)
          .set({ mediaUrl: featureMedia(product.slug, index) })
          .where(eq(s.productFeatures.id, feature.id));
      }
    });

    galleries += images.length;
    console.log(`  ${product.slug}: ${images.length} image${images.length === 1 ? '' : 's'}`);
  }

  console.log(`\nSynced ${products.length - skipped} products (${galleries} gallery images)${skipped ? `, left ${skipped} admin-managed product${skipped === 1 ? '' : 's'} alone` : ''}. Nothing else was changed.`);
  process.exit(0);
}

main().catch((err) => { console.error('seed:images failed:', err); process.exit(1); });
