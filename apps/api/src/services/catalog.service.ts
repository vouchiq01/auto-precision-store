import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import {
  getDb, categories, productFaqs, productFeatures, productImages, products, productSpecs,
  productVariants, reviews, banners,
} from '@aps/db';
import {
  discountPercent, formatEmiTeaser,
  type Banner, type Category, type ProductDetail, type ProductFilter, type ProductSummary,
  type ProductVariant, type Paginated,
} from '@aps/shared';
import { NotFoundError } from '../lib/errors.ts';

/* Correlated subqueries are written with an explicit inner alias and a
   table-qualified outer reference. Interpolating a Drizzle column (${table.col})
   renders it UNQUALIFIED, so inside a subquery it silently binds to the inner
   table instead of the outer one — the predicate then never matches and the
   count comes back 0 with no error. */

/**
 * Catalogue reads.
 *
 * Listing queries deliberately avoid Drizzle's nested relational API: for a
 * grid we need one row per product with a single image, and `with: { images }`
 * would fan out to every image of every product and then discard most of them.
 */

type ProductRow = typeof products.$inferSelect;

function variantPrice(product: Pick<ProductRow, 'basePrice'>, variant: typeof productVariants.$inferSelect): number {
  return product.basePrice + variant.priceDelta;
}

function toVariant(product: ProductRow, row: typeof productVariants.$inferSelect): ProductVariant {
  const price = variantPrice(product, row);
  return {
    id: row.id, sku: row.sku, optionName: row.optionName, optionValue: row.optionValue,
    price,
    compareAtPrice: product.compareAtPrice ? product.compareAtPrice + row.priceDelta : null,
    stockQty: row.stockQty,
    inStock: row.stockQty > 0,
    isLowStock: row.stockQty > 0 && row.stockQty <= row.lowStockThreshold,
    weightG: row.weightG > 0 ? row.weightG : product.weightG,
    hexColour: row.hexColour,
  };
}

export async function listCategories(): Promise<Category[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: categories.id, slug: categories.slug, name: categories.name,
      description: categories.description, imageUrl: categories.imageUrl,
      sortOrder: categories.sortOrder,
      productCount: sql<number>`(
        select count(*)::int from products p
        where p.category_id = categories.id and p.status = 'active'
      )`,
    })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder));
  return rows;
}

export async function listProducts(filter: ProductFilter, page = 1, perPage = 24): Promise<Paginated<ProductSummary>> {
  const db = getDb();
  const conditions = [eq(products.status, 'active')];

  if (filter.category) {
    const [category] = await db.select({ id: categories.id }).from(categories)
      .where(eq(categories.slug, filter.category)).limit(1);
    // An unknown category slug returns nothing rather than silently ignoring the filter.
    conditions.push(eq(products.categoryId, category?.id ?? '00000000-0000-0000-0000-000000000000'));
  }
  if (filter.brand) conditions.push(eq(products.brand, filter.brand));
  if (filter.featured) conditions.push(eq(products.isFeatured, true));
  if (typeof filter.minPrice === 'number') conditions.push(gte(products.basePrice, filter.minPrice));
  if (typeof filter.maxPrice === 'number') conditions.push(lte(products.basePrice, filter.maxPrice));
  if (filter.search) {
    const term = `%${filter.search}%`;
    conditions.push(
      or(ilike(products.name, term), ilike(products.summary, term), ilike(products.sku, term)) ??
      sql`true`,
    );
  }
  if (filter.inStock) {
    conditions.push(sql`exists (
      select 1 from product_variants pv
      where pv.product_id = products.id
        and pv.is_active = true
        and pv.stock_qty > 0
    )`);
  }

  const where = and(...conditions);

  const orderBy = (() => {
    switch (filter.sort) {
      case 'price_asc': return [asc(products.basePrice)];
      case 'price_desc': return [desc(products.basePrice)];
      case 'newest': return [desc(products.createdAt)];
      case 'name': return [asc(products.name)];
      default: return [desc(products.isFeatured), asc(products.sortOrder), asc(products.name)];
    }
  })();

  const [{ total } = { total: 0 }] = await db
    .select({ total: sql<number>`count(*)::int` }).from(products).where(where);

  const rows = await db.select({
    product: products,
    category: { id: categories.id, slug: categories.slug, name: categories.name },
  })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(where)
    .orderBy(...orderBy)
    .limit(perPage)
    .offset((page - 1) * perPage);

  const items = await hydrateSummaries(rows);

  return { items, page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

/**
 * Attach the primary image, stock flag and rating to a page of products in
 * three queries total, rather than three per product.
 */
async function hydrateSummaries(
  rows: { product: ProductRow; category: { id: string; slug: string; name: string } }[],
): Promise<ProductSummary[]> {
  if (rows.length === 0) return [];
  const db = getDb();
  const productIds = rows.map((r) => r.product.id);

  const images = await db.select().from(productImages)
    .where(and(inArray(productImages.productId, productIds), eq(productImages.isPrimary, true)));
  const imageByProduct = new Map(images.map((img) => [img.productId, img]));

  /* The variants themselves, not just a stock total: a listing card offers
     add-to-cart, and for the eight tables that come in two finishes it has to
     be able to ask which one. At most a couple of rows per product. */
  const variantRows = await db
    .select()
    .from(productVariants)
    .where(and(inArray(productVariants.productId, productIds), eq(productVariants.isActive, true)))
    .orderBy(asc(productVariants.sortOrder));

  const variantsByProduct = new Map<string, typeof variantRows>();
  for (const row of variantRows) {
    const list = variantsByProduct.get(row.productId) ?? [];
    list.push(row);
    variantsByProduct.set(row.productId, list);
  }

  const ratings = await db
    .select({
      productId: reviews.productId,
      average: sql<number>`round(avg(${reviews.rating})::numeric, 1)::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(and(inArray(reviews.productId, productIds), eq(reviews.status, 'approved')))
    .groupBy(reviews.productId);
  const ratingByProduct = new Map(ratings.map((r) => [r.productId, r]));

  return rows.map(({ product, category }) => {
    const image = imageByProduct.get(product.id);
    const rating = ratingByProduct.get(product.id);
    return {
      id: product.id, slug: product.slug, sku: product.sku, name: product.name,
      tagline: product.tagline, summary: product.summary, brand: product.brand,
      status: product.status,
      price: product.basePrice,
      compareAtPrice: product.compareAtPrice,
      discountPercent: discountPercent(product.basePrice, product.compareAtPrice),
      primaryImage: image
        ? { id: image.id, url: image.url, alt: image.alt, variantId: image.variantId, sortOrder: image.sortOrder, isPrimary: image.isPrimary }
        : null,
      category,
      badges: product.badges,
      inStock: (variantsByProduct.get(product.id) ?? []).some((v) => v.stockQty > 0),
      options: (variantsByProduct.get(product.id) ?? []).map((v) => ({
        id: v.id,
        label: v.optionValue,
        hexColour: v.hexColour,
        inStock: v.stockQty > 0,
      })),
      isFeatured: product.isFeatured,
      rating: rating ? { average: rating.average, count: rating.count } : null,
      emiTeaser: formatEmiTeaser(product.basePrice),
    };
  });
}

export async function getProductBySlug(slug: string): Promise<ProductDetail> {
  const db = getDb();

  const [row] = await db.select({
    product: products,
    category: { id: categories.id, slug: categories.slug, name: categories.name },
  })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.slug, slug), eq(products.status, 'active')))
    .limit(1);

  if (!row) throw new NotFoundError('Product');
  const { product, category } = row;

  const [images, variants, specs, features, faqs, ratingRows] = await Promise.all([
    db.select().from(productImages).where(eq(productImages.productId, product.id)).orderBy(asc(productImages.sortOrder)),
    db.select().from(productVariants)
      .where(and(eq(productVariants.productId, product.id), eq(productVariants.isActive, true)))
      .orderBy(asc(productVariants.sortOrder)),
    db.select().from(productSpecs).where(eq(productSpecs.productId, product.id)).orderBy(asc(productSpecs.sortOrder)),
    db.select().from(productFeatures).where(eq(productFeatures.productId, product.id)).orderBy(asc(productFeatures.sortOrder)),
    db.select().from(productFaqs).where(eq(productFaqs.productId, product.id)).orderBy(asc(productFaqs.sortOrder)),
    db.select({
      average: sql<number>`round(avg(${reviews.rating})::numeric, 1)::float`,
      count: sql<number>`count(*)::int`,
    }).from(reviews).where(and(eq(reviews.productId, product.id), eq(reviews.status, 'approved'))),
  ]);

  const rating = ratingRows[0];
  const mappedVariants = variants.map((v) => toVariant(product, v));

  // Related: same category first, topped up with featured products elsewhere.
  const relatedRows = await db.select({
    product: products,
    category: { id: categories.id, slug: categories.slug, name: categories.name },
  })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(
      eq(products.status, 'active'),
      eq(products.categoryId, product.categoryId),
      sql`${products.id} <> ${product.id}`,
    ))
    .orderBy(asc(products.sortOrder))
    .limit(4);

  return {
    id: product.id, slug: product.slug, sku: product.sku, name: product.name,
    tagline: product.tagline, summary: product.summary, description: product.description,
    brand: product.brand, status: product.status,
    price: product.basePrice,
    compareAtPrice: product.compareAtPrice,
    discountPercent: discountPercent(product.basePrice, product.compareAtPrice),
    primaryImage: images.find((i) => i.isPrimary)
      ? { ...(images.find((i) => i.isPrimary) as typeof images[number]) }
      : (images[0] ?? null),
    category,
    badges: product.badges,
    inStock: mappedVariants.some((v) => v.inStock),
    options: mappedVariants.map((v) => ({
      id: v.id, label: v.optionValue, hexColour: v.hexColour, inStock: v.inStock,
    })),
    isFeatured: product.isFeatured,
    rating: rating && rating.count > 0 ? { average: rating.average, count: rating.count } : null,
    emiTeaser: formatEmiTeaser(product.basePrice),
    hsnCode: product.hsnCode,
    taxRateBps: product.taxRateBps,
    weightG: product.weightG,
    dimensions: {
      lengthMm: product.lengthMm, widthMm: product.widthMm,
      heightMinMm: product.heightMinMm, heightMaxMm: product.heightMaxMm,
      loadCapacityKg: product.loadCapacityKg,
    },
    warrantyMonths: product.warrantyMonths,
    images,
    variants: mappedVariants,
    specs,
    features,
    faqs,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    related: await hydrateSummaries(relatedRows),
  };
}

/** Slugs for Next.js static generation. */
export async function listProductSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  const db = getDb();
  return db.select({ slug: products.slug, updatedAt: products.updatedAt })
    .from(products).where(eq(products.status, 'active'));
}

/**
 * Banners for a placement, filtered by their scheduling window so a festival
 * banner can be queued weeks ahead and expire without anyone remembering to
 * turn it off.
 */
export async function listBanners(placement?: string): Promise<Banner[]> {
  const db = getDb();
  const now = new Date();
  const conditions = [
    eq(banners.isActive, true),
    or(sql`${banners.startsAt} is null`, lte(banners.startsAt, now)) ?? sql`true`,
    or(sql`${banners.endsAt} is null`, gte(banners.endsAt, now)) ?? sql`true`,
  ];
  if (placement) conditions.push(eq(banners.placement, placement as 'hero'));

  const rows = await db.select().from(banners).where(and(...conditions)).orderBy(asc(banners.sortOrder));
  return rows.map((b) => ({
    id: b.id, title: b.title, subtitle: b.subtitle, eyebrow: b.eyebrow,
    imageDesktop: b.imageDesktop, imageMobile: b.imageMobile, videoUrl: b.videoUrl,
    ctaLabel: b.ctaLabel, ctaUrl: b.ctaUrl, placement: b.placement, sortOrder: b.sortOrder,
  }));
}

/** Products for the comparison table, by slug. */
export async function compareProducts(slugs: string[]): Promise<ProductDetail[]> {
  const unique = [...new Set(slugs)].slice(0, 4);
  return Promise.all(unique.map((slug) => getProductBySlug(slug)));
}
