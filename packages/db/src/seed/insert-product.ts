import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { createDb } from '../client.ts';
import * as s from '../schema/index.ts';
import type { SeedProduct } from './products.data.ts';

/** A database handle or a transaction on one — all this needs is `insert`. */
export type Executor = Pick<ReturnType<typeof createDb>, 'insert'>;

/**
 * Image URLs are read from what is actually on disk in the web app's public
 * folder, rather than assembled from an assumed extension.
 *
 * The catalogue mixes .jpg photographs, a .png, and .svg renders for the round
 * range — and it will mix more as real product shots replace placeholders.
 * Guessing the extension meant every new asset needed a matching code change,
 * and a wrong guess produced a silently broken image rather than an error.
 */
const IMAGES_PER_PRODUCT = 4;

const PUBLIC_PRODUCTS = resolve(
  dirname(fileURLToPath(import.meta.url)), '../../../../apps/web/public/products',
);

function findAsset(slug: string, base: string): string | null {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'avif', 'svg']) {
    if (existsSync(join(PUBLIC_PRODUCTS, slug, `${base}.${ext}`))) {
      return `/products/${slug}/${base}.${ext}`;
    }
  }
  return null;
}

/** A collection photo, or null while there is none — the storefront copes. */
export function categoryImage(slug: string): string | null {
  const file = `${slug}.jpg`;
  return existsSync(join(PUBLIC_PRODUCTS, '../categories', file)) ? `/categories/${file}` : null;
}

function imageUrls(slug: string): { url: string; alt: string }[] {
  return Array.from({ length: IMAGES_PER_PRODUCT }, (_, i) => findAsset(slug, String(i + 1).padStart(2, '0')))
    .filter((url): url is string => url !== null)
    .map((url) => ({ url, alt: '' }));
}


/**
 * Insert one product and everything that hangs off it. Shared by the full seed
 * and by add-extra.ts, so a product looks identical whichever way it arrived.
 */
export async function insertProduct(
  db: Executor, p: SeedProduct, categoryId: string, sortOrder: number,
): Promise<{ variants: number; specs: number }> {
  const [product] = await db.insert(s.products).values({
    slug: p.slug, sku: p.sku, name: p.name, tagline: p.tagline, summary: p.summary,
    description: p.description, categoryId, brand: 'Auto Precision',
    basePrice: p.basePrice, compareAtPrice: p.compareAtPrice,
    status: 'active', hsnCode: p.hsnCode ?? '9403', taxRateBps: 1800,
    weightG: p.weightG, lengthMm: p.lengthMm, widthMm: p.widthMm,
    heightMinMm: p.heightMinMm, heightMaxMm: p.heightMaxMm,
    loadCapacityKg: p.loadCapacityKg, warrantyMonths: p.warrantyMonths,
    badges: p.badges, isFeatured: p.isFeatured, sortOrder,
    metaTitle: p.name,
    metaDescription: p.summary.slice(0, 165),
  }).returning();
  if (!product) throw new Error(`Failed to insert ${p.slug}`);

  const variants = await db.insert(s.productVariants).values(
    p.variants.map((v, vi) => ({
      productId: product.id,
      sku: `${p.sku}-${v.skuSuffix}`,
      optionName: v.optionName, optionValue: v.optionValue,
      priceDelta: v.priceDelta, stockQty: v.stockQty,
      lowStockThreshold: 2, weightG: v.weightG,
      hexColour: v.hexColour ?? null, sortOrder: vi,
    })),
  ).returning();
  
  /* A product with no photographs yet inserts no image rows — values([])
     throws — and its card shows "No image" until real files are dropped in. */
  const images = imageUrls(p.slug);
  if (images.length > 0) {
    await db.insert(s.productImages).values(
      images.map((img, ii) => ({
        productId: product.id,
        url: img.url,
        alt: `${p.name} — view ${ii + 1}`,
        sortOrder: ii,
        isPrimary: ii === 0,
      })),
    );
  }

  if (p.specs.length > 0) {
    await db.insert(s.productSpecs).values(
      p.specs.map((spec, si) => ({
        productId: product.id, group: spec.group, label: spec.label, value: spec.value, sortOrder: si,
      })),
    );
  }

  if (p.features.length > 0) {
    await db.insert(s.productFeatures).values(
      p.features.map((f, fi) => ({
        productId: product.id,
        eyebrow: f.eyebrow ?? null, title: f.title, body: f.body ?? null,
        mediaUrl: findAsset(p.slug, `feature-${(fi % IMAGES_PER_PRODUCT) + 1}`),
        mediaAlt: f.title,
        layout: f.layout, stats: f.stats ?? [], sortOrder: fi,
      })),
    );
  }

  if (p.faqs.length > 0) {
    await db.insert(s.productFaqs).values(
      p.faqs.map((f, fi) => ({ productId: product.id, question: f.question, answer: f.answer, sortOrder: fi })),
    );
  }

  return { variants: variants.length, specs: p.specs.length };
}
