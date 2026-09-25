import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { createDb, isPgliteUrl } from '../client.ts';
import { bootstrapLocalDatabase } from '../bootstrap.ts';
import * as s from '../schema/index.ts';
import { hashPassword } from '../lib/password.ts';
import { CATEGORIES, PRODUCTS } from './products.data.ts';

/**
 * Idempotent development seed.
 *
 * Catalogue, content and fulfilment tables are cleared and rebuilt on every run.
 * Users and orders are left alone, so re-seeding never destroys a test account
 * or an order you were halfway through debugging. The admin account is upserted.
 */

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@autoprecision.store';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!2026';

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

function imageUrls(slug: string): { url: string; alt: string }[] {
  return Array.from({ length: IMAGES_PER_PRODUCT }, (_, i) => findAsset(slug, String(i + 1).padStart(2, '0')))
    .filter((url): url is string => url !== null)
    .map((url) => ({ url, alt: '' }));
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL ?? '';
  /* Seeding the local PGlite database also applies migrations first, so a fresh
     checkout goes from nothing to a working catalogue in one command. */
  const db = isPgliteUrl(connectionString)
    ? await bootstrapLocalDatabase(connectionString)
    : createDb({ max: 1 });
  console.log('Seeding Auto Precision Store…\n');

  // ---- Clear catalogue + content, leave identity and orders intact ----------
  await db.execute(sql`
    TRUNCATE TABLE
      product_faqs, product_features, product_specs, product_images, product_variants,
      products, categories, banners, coupons, shipping_rates, shipping_zones, pincodes,
      cms_pages
    RESTART IDENTITY CASCADE
  `);
  console.log('  cleared catalogue and content tables');

  // ---- Categories ----------------------------------------------------------
  const insertedCategories = await db.insert(s.categories).values(
    CATEGORIES.map((c) => ({
      slug: c.slug, name: c.name, description: c.description,
      imageUrl: `/categories/${c.slug}.jpg`, sortOrder: c.sortOrder,
    })),
  ).returning();
  const categoryBySlug = new Map(insertedCategories.map((c) => [c.slug, c.id]));
  console.log(`  ${insertedCategories.length} categories`);

  // ---- Products and their children ----------------------------------------
  let variantCount = 0;
  let specCount = 0;

  for (const [index, p] of PRODUCTS.entries()) {
    const categoryId = categoryBySlug.get(p.categorySlug);
    if (!categoryId) throw new Error(`Unknown category "${p.categorySlug}" for product ${p.slug}`);

    const [product] = await db.insert(s.products).values({
      slug: p.slug, sku: p.sku, name: p.name, tagline: p.tagline, summary: p.summary,
      description: p.description, categoryId, brand: 'Auto Precision',
      basePrice: p.basePrice, compareAtPrice: p.compareAtPrice,
      status: 'active', hsnCode: '9403', taxRateBps: 1800,
      weightG: p.weightG, lengthMm: p.lengthMm, widthMm: p.widthMm,
      heightMinMm: p.heightMinMm, heightMaxMm: p.heightMaxMm,
      loadCapacityKg: p.loadCapacityKg, warrantyMonths: p.warrantyMonths,
      badges: p.badges, isFeatured: p.isFeatured, sortOrder: index,
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
    variantCount += variants.length;

    await db.insert(s.productImages).values(
      imageUrls(p.slug).map((img, ii) => ({
        productId: product.id,
        url: img.url,
        alt: `${p.name} — view ${ii + 1}`,
        sortOrder: ii,
        isPrimary: ii === 0,
      })),
    );

    if (p.specs.length > 0) {
      await db.insert(s.productSpecs).values(
        p.specs.map((spec, si) => ({
          productId: product.id, group: spec.group, label: spec.label, value: spec.value, sortOrder: si,
        })),
      );
      specCount += p.specs.length;
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
  }
  console.log(`  ${PRODUCTS.length} products, ${variantCount} variants, ${specCount} specs`);

  // ---- Shipping zones and weight-slab rates --------------------------------
  const zones = await db.insert(s.shippingZones).values([
    { name: 'Karnataka', sortOrder: 1, states: ['Karnataka'] },
    { name: 'South India', sortOrder: 2, states: ['Tamil Nadu', 'Kerala', 'Andhra Pradesh', 'Telangana', 'Puducherry', 'Goa'] },
    { name: 'West & Central', sortOrder: 3, states: ['Maharashtra', 'Gujarat', 'Madhya Pradesh', 'Chhattisgarh', 'Rajasthan', 'Dadra and Nagar Haveli and Daman and Diu'] },
    { name: 'North India', sortOrder: 4, states: ['Delhi', 'Haryana', 'Punjab', 'Uttar Pradesh', 'Uttarakhand', 'Himachal Pradesh', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Bihar', 'Jharkhand'] },
    { name: 'East & North-East', sortOrder: 5, states: ['West Bengal', 'Odisha', 'Assam', 'Sikkim', 'Meghalaya', 'Manipur', 'Mizoram', 'Nagaland', 'Tripura', 'Arunachal Pradesh'] },
    { name: 'Islands', sortOrder: 6, states: ['Andaman and Nicobar Islands', 'Lakshadweep'] },
  ]).returning();

  /* Slabs are contiguous: 0–15 kg, 15–30 kg, 30–50 kg, 50 kg and above.
     Freight for a crated 58 kg table is genuinely expensive, and pretending
     otherwise just means eating the cost on every order. */
  const slabs: { min: number; max: number | null }[] = [
    { min: 0, max: 15_000 }, { min: 15_001, max: 30_000 }, { min: 30_001, max: 50_000 }, { min: 50_001, max: null },
  ];
  const zonePricing: Record<string, { base: number[]; eta: [number, number]; freeAbove: number | null }> = {
    'Karnataka':          { base: [30_000, 55_000, 90_000, 140_000],   eta: [2, 4], freeAbove: 2_500_000 },
    'South India':        { base: [45_000, 80_000, 130_000, 195_000],  eta: [3, 6], freeAbove: 4_000_000 },
    'West & Central':     { base: [55_000, 95_000, 160_000, 240_000],  eta: [4, 7], freeAbove: 5_000_000 },
    'North India':        { base: [65_000, 115_000, 190_000, 285_000], eta: [5, 9], freeAbove: 6_000_000 },
    'East & North-East':  { base: [70_000, 125_000, 210_000, 320_000], eta: [6, 11], freeAbove: 6_000_000 },
    'Islands':            { base: [120_000, 210_000, 340_000, 520_000], eta: [9, 16], freeAbove: null },
  };

  const rateRows = zones.flatMap((zone) => {
    const pricing = zonePricing[zone.name];
    if (!pricing) return [];
    return slabs.map((slab, i) => ({
      zoneId: zone.id,
      minWeightG: slab.min,
      maxWeightG: slab.max,
      price: pricing.base[i] ?? 0,
      etaDaysMin: pricing.eta[0],
      etaDaysMax: pricing.eta[1],
      freeAbove: pricing.freeAbove,
    }));
  });
  await db.insert(s.shippingRates).values(rateRows);
  console.log(`  ${zones.length} shipping zones, ${rateRows.length} weight-slab rates`);

  // ---- Pincodes ------------------------------------------------------------
  const zoneByName = new Map(zones.map((z) => [z.name, z.id]));
  const pincodeSeed: [string, string, string, string][] = [
    ['560001', 'Bengaluru', 'Karnataka', 'Karnataka'],
    ['560034', 'Bengaluru', 'Karnataka', 'Karnataka'],
    ['560066', 'Bengaluru', 'Karnataka', 'Karnataka'],
    ['575001', 'Mangaluru', 'Karnataka', 'Karnataka'],
    ['570001', 'Mysuru', 'Karnataka', 'Karnataka'],
    ['600001', 'Chennai', 'Tamil Nadu', 'South India'],
    ['600028', 'Chennai', 'Tamil Nadu', 'South India'],
    ['500001', 'Hyderabad', 'Telangana', 'South India'],
    ['682001', 'Kochi', 'Kerala', 'South India'],
    ['695001', 'Thiruvananthapuram', 'Kerala', 'South India'],
    ['400001', 'Mumbai', 'Maharashtra', 'West & Central'],
    ['400050', 'Mumbai', 'Maharashtra', 'West & Central'],
    ['411001', 'Pune', 'Maharashtra', 'West & Central'],
    ['380001', 'Ahmedabad', 'Gujarat', 'West & Central'],
    ['302001', 'Jaipur', 'Rajasthan', 'West & Central'],
    ['110001', 'New Delhi', 'Delhi', 'North India'],
    ['110048', 'New Delhi', 'Delhi', 'North India'],
    ['122001', 'Gurugram', 'Haryana', 'North India'],
    ['201301', 'Noida', 'Uttar Pradesh', 'North India'],
    ['160017', 'Chandigarh', 'Chandigarh', 'North India'],
    ['700001', 'Kolkata', 'West Bengal', 'East & North-East'],
    ['751001', 'Bhubaneswar', 'Odisha', 'East & North-East'],
    ['781001', 'Guwahati', 'Assam', 'East & North-East'],
    ['744101', 'Port Blair', 'Andaman and Nicobar Islands', 'Islands'],
  ];
  await db.insert(s.pincodes).values(
    pincodeSeed.map(([pincode, city, state, zoneName]) => ({
      pincode, city, state, zoneId: zoneByName.get(zoneName) ?? null, isServiceable: true,
    })),
  );
  console.log(`  ${pincodeSeed.length} pincodes`);

  // ---- Banners -------------------------------------------------------------
  await db.insert(s.banners).values([
    {
      eyebrow: 'Grooming tables', title: 'Stop grooming on the floor.',
      subtitle: 'A table that rises to your height, turns the dog to your hand, and holds it still. From ₹8,900.',
      imageDesktop: '/banners/hero-apex.jpg', imageMobile: '/banners/hero-apex-mobile.jpg',
      ctaLabel: 'See the round tables', ctaUrl: '/collections/round-rotating',
      placement: 'hero', sortOrder: 0, isActive: true,
    },
    {
      eyebrow: 'Free freight', title: 'Free delivery across Karnataka over ₹25,000.',
      subtitle: 'Crated, tracked and kerbside-delivered from our Bengaluru warehouse.',
      imageDesktop: '/banners/strip-freight.jpg',
      ctaLabel: 'Check your pincode', ctaUrl: '/collections/electric-lifting',
      placement: 'strip', sortOrder: 0, isActive: true,
    },
  ]);
  console.log('  2 banners');

  // ---- Coupons -------------------------------------------------------------
  const now = new Date();
  const inNinetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  await db.insert(s.coupons).values([
    {
      code: 'WELCOME5', description: '5% off your first table', type: 'percent', value: 500,
      minOrderValue: 1_000_000, maxDiscount: 500_000, usageLimitPerUser: 1,
      startsAt: now, endsAt: inNinetyDays, scope: 'all', isActive: true,
    },
    {
      code: 'FREIGHTFREE', description: 'Free shipping, any order', type: 'free_shipping', value: 0,
      minOrderValue: 2_000_000, usageLimitTotal: 200,
      startsAt: now, endsAt: inNinetyDays, scope: 'all', isActive: true,
    },
    {
      code: 'SALON2500', description: '₹2,500 off electric lifting tables', type: 'flat', value: 250_000,
      minOrderValue: 4_000_000, usageLimitPerUser: 2,
      startsAt: now, endsAt: inNinetyDays, scope: 'category',
      targetIds: [categoryBySlug.get('electric-lifting') as string], isActive: true,
    },
  ]);
  console.log('  3 coupons');

  // ---- CMS pages -----------------------------------------------------------
  await db.insert(s.cmsPages).values([
    { slug: 'about', title: 'About Auto Precision', isPublished: true, body: 'We build grooming tables in Bengaluru for people who stand at them all day.\n\nEvery table in this catalogue exists because a working groomer told us what was wrong with the one they had.' },
    { slug: 'shipping', title: 'Shipping & Delivery', isPublished: true, body: 'Tables ship crated on a pallet by surface freight from our Bengaluru warehouse.\n\nDelivery is kerbside. The courier will not carry the crate indoors or up stairs, so please have a second pair of hands available. You will receive a tracking number when the crate leaves us, and the courier will call before arriving.\n\nFree delivery applies across Karnataka on orders over ₹25,000. Elsewhere, freight is calculated by weight and destination at checkout.' },
    { slug: 'returns', title: 'Returns & Refunds', isPublished: true, body: 'You may return an unused table in its original crate within 7 days of delivery. Return freight is at your cost unless the table arrived damaged or faulty.\n\nIf a crate arrives visibly damaged, photograph it before opening and tell us within 48 hours. We will collect and replace at our cost.\n\nRefunds are issued to the original payment method within 7 working days of the table reaching our warehouse.' },
    { slug: 'warranty', title: 'Warranty', isPublished: true, body: 'Frames and welded structures are covered for the term printed on each product page — 12 to 36 months depending on the model.\n\nElectrical components (motor, controller, foot switch) are covered for 12 months across the range.\n\nWear items are excluded: deck mats, castors, nooses and hydraulic seals.\n\nWarranty work is carried out at our Bengaluru workshop. For the first 12 months we collect and return at our cost.' },
    { slug: 'faq', title: 'Frequently Asked Questions', isPublished: true, body: 'Product-specific questions are answered on each product page. This page covers everything else — ordering, GST invoicing, payment and bulk pricing.\n\n**Can I get a GST invoice?**\nYes. Enter your GSTIN at checkout and a compliant tax invoice is generated automatically once payment clears.\n\n**Do you offer EMI?**\nYes, on orders over ₹10,000, through all major credit cards and several banks at checkout.\n\n**Do you sell to salons at trade pricing?**\nWe do. Use the bulk enquiry form and tell us how many stations you are fitting out.' },
    { slug: 'privacy', title: 'Privacy Policy', isPublished: true, body: 'We collect your phone number to sign you in, and your name and address to deliver what you ordered. That is the whole list.\n\nWe do not sell your data. We share it only with the courier carrying your table and the payment gateway processing your card.\n\nTo have your account and its data deleted, write to support@autoprecision.store.' },
    { slug: 'terms', title: 'Terms of Service', isPublished: true, body: 'By ordering from Auto Precision you agree to these terms.\n\nPrices are in Indian rupees and include GST. We may change prices at any time, but never after you have paid.\n\nRisk passes to you on delivery. Title passes on full payment.\n\nThese terms are governed by Indian law, and disputes fall to the courts of Bengaluru.' },
  ]);
  console.log('  7 CMS pages');

  // ---- Settings ------------------------------------------------------------
  await db.insert(s.settings).values([
    { key: 'store.seller_state', value: 'Karnataka', description: 'Seller GST state — decides CGST+SGST vs IGST' },
    { key: 'store.seller_gstin', value: '29AAACR5055K1Z3', description: 'Placeholder. Replace with the real GSTIN before going live.' },
    { key: 'store.free_shipping_threshold', value: 2_500_000, description: 'Karnataka free-freight threshold, in paise' },
    { key: 'store.invoice_prefix', value: 'APS', description: 'Tax invoice number prefix' },
    { key: 'store.low_stock_threshold', value: 2, description: 'Default low-stock alert level' },
  ]).onConflictDoUpdate({ target: s.settings.key, set: { value: sql`excluded.value` } });
  console.log('  5 settings');

  // ---- Admin account -------------------------------------------------------
  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  await db.insert(s.users).values({
    email: ADMIN_EMAIL, passwordHash, fullName: 'Store Admin', role: 'superadmin',
  }).onConflictDoUpdate({ target: s.users.email, set: { passwordHash, role: 'superadmin' } });

  console.log(`\n  admin: ${ADMIN_EMAIL}`);
  console.log(`  password: ${ADMIN_PASSWORD}`);
  console.log('\nSeed complete.\n');
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error('\nSeed failed:', error);
  process.exit(1);
});
