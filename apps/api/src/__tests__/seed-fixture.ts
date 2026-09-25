import {
  categories, cmsPages, coupons, getDb, hashPassword, pincodes, productFaqs, productFeatures,
  productImages, products, productSpecs, productVariants, shippingRates, shippingZones, users,
} from '@aps/db';

/**
 * A deliberately small fixture — two products, three coupons, two zones.
 *
 * The full development seed is intentionally not reused here: tests should
 * assert against data they can hold in their head, and should not start failing
 * because someone repriced a product in the catalogue.
 */
export async function seedFixture() {
  const db = getDb();

  const [category] = await db.insert(categories).values({
    slug: 'electric-lifting', name: 'Electric Lifting', sortOrder: 1,
  }).returning();
  if (!category) throw new Error('fixture: category insert failed');

  const [product] = await db.insert(products).values({
    slug: 'apex-e9-test', sku: 'TEST-APEX-E9', name: 'Apex E9 Electric Grooming Table',
    tagline: 'The one you buy once.',
    summary: 'Flagship electric table used across the integration tests.',
    categoryId: category.id,
    basePrice: 11_240_000,        // ₹1,12,400
    compareAtPrice: 14_800_000,   // ₹1,48,000
    status: 'active', hsnCode: '9403', taxRateBps: 1800,
    weightG: 58_000, warrantyMonths: 36, isFeatured: true, sortOrder: 0,
  }).returning();
  if (!product) throw new Error('fixture: product insert failed');

  const [variant] = await db.insert(productVariants).values({
    productId: product.id, sku: 'TEST-APEX-E9-GR',
    optionName: 'Finish', optionValue: 'Graphite',
    priceDelta: 0, stockQty: 6, lowStockThreshold: 2, weightG: 58_000,
  }).returning();
  if (!variant) throw new Error('fixture: variant insert failed');

  // A variant with exactly one unit left, for the out-of-stock assertions.
  const [lastOne] = await db.insert(productVariants).values({
    productId: product.id, sku: 'TEST-APEX-E9-WH',
    optionName: 'Finish', optionValue: 'Bone White',
    priceDelta: 0, stockQty: 1, lowStockThreshold: 2, weightG: 58_000, sortOrder: 1,
  }).returning();
  if (!lastOne) throw new Error('fixture: second variant insert failed');

  await db.insert(productImages).values({
    productId: product.id, url: '/products/apex-e9-test/01.svg', alt: 'Apex E9', isPrimary: true, sortOrder: 0,
  });
  await db.insert(productSpecs).values([
    { productId: product.id, group: 'Lift', label: 'Load capacity', value: '120 kg', sortOrder: 0 },
    { productId: product.id, group: 'Lift', label: 'Height range', value: '540 – 1,050 mm', sortOrder: 1 },
  ]);
  await db.insert(productFeatures).values({
    productId: product.id, title: 'Eleven seconds, end to end.',
    body: 'A single column, nothing to synchronise.', layout: 'media_right',
    stats: [{ value: '120kg', label: 'Load capacity' }], sortOrder: 0,
  });
  await db.insert(productFaqs).values({
    productId: product.id, question: 'Will it fit through a standard doorway?',
    answer: 'Yes — the deck is 610 mm wide against a 750 mm door.', sortOrder: 0,
  });

  // A cheaper second product, so sort-by-price has something to order.
  const [cheap] = await db.insert(products).values({
    slug: 'stride-air-test', sku: 'TEST-STRIDE', name: 'Stride Air Ultra-Light Table',
    summary: 'Lightweight portable table.', categoryId: category.id,
    basePrice: 1_290_000, status: 'active', weightG: 11_000, sortOrder: 1,
  }).returning();
  if (cheap) {
    await db.insert(productVariants).values({
      productId: cheap.id, sku: 'TEST-STRIDE-SV', optionName: 'Colour', optionValue: 'Silver',
      priceDelta: 0, stockQty: 10, weightG: 11_000,
    });
    await db.insert(productImages).values({
      productId: cheap.id, url: '/products/stride-air-test/01.svg', alt: 'Stride Air', isPrimary: true,
    });
  }

  // ---- Fulfilment ---------------------------------------------------------
  const [zone] = await db.insert(shippingZones).values({
    name: 'Karnataka', states: ['Karnataka'], sortOrder: 1,
  }).returning();
  const [westZone] = await db.insert(shippingZones).values({
    name: 'West & Central', states: ['Maharashtra', 'Gujarat'], sortOrder: 2,
  }).returning();

  if (zone) {
    await db.insert(shippingRates).values([
      { zoneId: zone.id, minWeightG: 0, maxWeightG: 15_000, price: 30_000, etaDaysMin: 2, etaDaysMax: 4, freeAbove: 2_500_000 },
      { zoneId: zone.id, minWeightG: 15_001, maxWeightG: 50_000, price: 90_000, etaDaysMin: 2, etaDaysMax: 4, freeAbove: 2_500_000 },
      { zoneId: zone.id, minWeightG: 50_001, maxWeightG: null, price: 140_000, etaDaysMin: 3, etaDaysMax: 5, freeAbove: 2_500_000 },
    ]);
  }
  if (westZone) {
    await db.insert(shippingRates).values([
      { zoneId: westZone.id, minWeightG: 0, maxWeightG: 50_000, price: 160_000, etaDaysMin: 4, etaDaysMax: 7, freeAbove: null },
      { zoneId: westZone.id, minWeightG: 50_001, maxWeightG: null, price: 240_000, etaDaysMin: 4, etaDaysMax: 7, freeAbove: null },
    ]);
  }

  await db.insert(pincodes).values([
    { pincode: '560001', city: 'Bengaluru', state: 'Karnataka', zoneId: zone?.id ?? null, isServiceable: true },
    { pincode: '400050', city: 'Mumbai', state: 'Maharashtra', zoneId: westZone?.id ?? null, isServiceable: true },
    { pincode: '744101', city: 'Port Blair', state: 'Andaman and Nicobar Islands', zoneId: null, isServiceable: false },
  ]);

  // ---- Coupons ------------------------------------------------------------
  await db.insert(coupons).values([
    { code: 'SAVE10', type: 'percent', value: 1000, scope: 'all', isActive: true },
    { code: 'BIGSPEND', type: 'flat', value: 500_000, minOrderValue: 50_000_000, scope: 'all', isActive: true },
    { code: 'FREIGHTFREE', type: 'free_shipping', value: 0, scope: 'all', isActive: true },
  ]);

  await db.insert(cmsPages).values({
    slug: 'shipping', title: 'Shipping & Delivery', body: 'Crated on a pallet, kerbside delivery.', isPublished: true,
  });

  // ---- Admin --------------------------------------------------------------
  const adminEmail = 'admin@test.local';
  const adminPassword = 'TestAdmin!2026';
  await db.insert(users).values({
    email: adminEmail, passwordHash: await hashPassword(adminPassword),
    fullName: 'Test Admin', role: 'superadmin',
  });

  return {
    categoryId: category.id,
    productId: product.id,
    productSlug: product.slug,
    variantId: variant.id,
    variantPrice: product.basePrice + variant.priceDelta,
    variantStock: variant.stockQty,
    lastOneVariantId: lastOne.id,
    adminEmail,
    adminPassword,
  };
}
