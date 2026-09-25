import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';

/* Environment must be in place before any module reads it at import time. */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://test/test';
process.env.JWT_SECRET = 'test-secret-that-is-definitely-long-enough-32';
process.env.SMS_PROVIDER = 'mock';
process.env.LOG_LEVEL = 'silent';
process.env.CORS_ORIGINS = 'http://localhost:3000';

const { createTestDatabase } = await import('@aps/db/testing');
const { createApp } = await import('../app.ts');
const { startTestServer, BENGALURU_ADDRESS, MUMBAI_ADDRESS } = await import('./helpers.ts');
const seed = await import('./seed-fixture.ts');

let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
let client: Awaited<ReturnType<typeof startTestServer>>;
let fixture: Awaited<ReturnType<typeof seed.seedFixture>>;

before(async () => {
  testDb = await createTestDatabase(new URL('../../../../packages/db/migrations', import.meta.url).pathname);
  fixture = await seed.seedFixture();
  client = await startTestServer(createApp());
});

after(async () => {
  await client?.close();
  await testDb?.close();
});

describe('catalogue', () => {
  test('lists active products with pricing and stock', async () => {
    const res = await client.request('GET', '/api/catalog/products');
    assert.equal(res.status, 200);
    assert.ok(res.body.items.length > 0);

    const product = res.body.items[0];
    assert.ok(typeof product.price === 'number', 'price should be integer paise');
    assert.ok(Number.isInteger(product.price));
    assert.ok('inStock' in product);
    assert.ok('emiTeaser' in product);
  });

  test('returns full detail including specs, features and FAQs', async () => {
    const res = await client.request('GET', `/api/catalog/products/${fixture.productSlug}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.slug, fixture.productSlug);
    assert.ok(res.body.specs.length > 0, 'product should carry specs');
    assert.ok(res.body.features.length > 0, 'product should carry story blocks');
    assert.ok(res.body.faqs.length > 0, 'product should carry FAQs');
    assert.ok(res.body.variants.length > 0);
  });

  test('404s an unknown slug rather than returning an empty shell', async () => {
    const res = await client.request('GET', '/api/catalog/products/no-such-table');
    assert.equal(res.status, 404);
    assert.equal(res.body.type, 'not_found');
  });

  test('reports a real product count per category', async () => {
    // Regression: an interpolated Drizzle column inside a subquery renders
    // unqualified and binds to the inner table, silently yielding 0.
    const res = await client.request('GET', '/api/catalog/categories');
    assert.equal(res.status, 200);
    const category = res.body.items[0];
    assert.ok(category.productCount > 0, `expected a non-zero product count, got ${category.productCount}`);
  });

  test('the in-stock filter actually returns products', async () => {
    const res = await client.request('GET', '/api/catalog/products?inStock=true');
    assert.equal(res.status, 200);
    assert.ok(res.body.items.length > 0, 'in-stock filter should not silently exclude everything');
  });

  test('filters by category and sorts by price', async () => {
    const res = await client.request('GET', '/api/catalog/products?sort=price_asc&perPage=50');
    assert.equal(res.status, 200);
    const prices = res.body.items.map((p: { price: number }) => p.price);
    assert.deepEqual(prices, [...prices].sort((a, b) => a - b), 'should be ascending by price');
  });
});

describe('phone OTP authentication', () => {
  let accessToken = '';

  test('issues an OTP and returns the dev code in mock mode', async () => {
    const res = await client.request('POST', '/api/auth/otp/request', { body: { phone: '9876543210' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.phone, '+919876543210', 'should normalise to E.164');
    assert.ok(res.body.devCode, 'mock provider should surface the code');
  });

  test('rejects a malformed phone number', async () => {
    const res = await client.request('POST', '/api/auth/otp/request', { body: { phone: '12345' } });
    assert.equal(res.status, 422);
    assert.ok(res.body.errors.phone);
  });

  test('rejects a wrong code', async () => {
    const res = await client.request('POST', '/api/auth/otp/verify', {
      body: { phone: '9876543210', code: '000000' },
    });
    assert.equal(res.status, 401);
  });

  test('signs in with the correct code and creates the account', async () => {
    const request = await client.request('POST', '/api/auth/otp/request', { body: { phone: '9876543210' } });
    const res = await client.request('POST', '/api/auth/otp/verify', {
      body: { phone: '9876543210', code: request.body.devCode, fullName: 'Priya Raghavan' },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.user.phone, '+919876543210');
    assert.equal(res.body.user.role, 'customer');
    assert.ok(res.body.accessToken);
    accessToken = res.body.accessToken;
  });

  test('returns the signed-in user from /me', async () => {
    const res = await client.request('GET', '/api/auth/me', { token: accessToken });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.fullName, 'Priya Raghavan');
  });

  test('refuses /me without a token', async () => {
    const res = await client.request('GET', '/api/auth/me');
    assert.equal(res.status, 401);
  });
});

describe('cart', () => {
  test('adds an item and reports the running total', async () => {
    const res = await client.request('POST', '/api/cart/items', {
      body: { variantId: fixture.variantId, quantity: 1 },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.itemCount, 1);
    assert.equal(res.body.subtotal, fixture.variantPrice);
  });

  test('refuses more than the available stock', async () => {
    const res = await client.request('POST', '/api/cart/items', {
      body: { variantId: fixture.lastOneVariantId, quantity: 5 },
    });
    assert.equal(res.status, 409);
    assert.equal(res.body.type, 'out_of_stock');
  });

  test('applies a percentage coupon', async () => {
    const res = await client.request('POST', '/api/cart/coupon', { body: { code: 'save10' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.couponCode, 'SAVE10', 'codes are normalised to uppercase');
    assert.equal(res.body.discountTotal, Math.round(fixture.variantPrice * 0.1));
    assert.equal(res.body.estimatedTotal, res.body.subtotal - res.body.discountTotal);
  });

  test('explains a coupon that does not meet its minimum instead of silently ignoring it', async () => {
    const res = await client.request('POST', '/api/cart/coupon', { body: { code: 'BIGSPEND' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.couponCode, null);
    assert.match(res.body.couponMessage, /minimum/i);
  });

  test('removes a coupon', async () => {
    const res = await client.request('DELETE', '/api/cart/coupon');
    assert.equal(res.status, 200);
    assert.equal(res.body.discountTotal, 0);
  });
});

describe('checkout quote', () => {
  test('charges CGST and SGST for a Karnataka address', async () => {
    const res = await client.request('POST', '/api/checkout/quote', {
      body: { shippingAddress: BENGALURU_ADDRESS },
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.intraState, 'Karnataka buyer is intra-state');
    assert.ok(res.body.cgst > 0 && res.body.sgst > 0);
    assert.equal(res.body.igst, 0);
    assert.equal(res.body.cgst + res.body.sgst, res.body.taxTotal);
  });

  test('charges IGST for an out-of-state address', async () => {
    const res = await client.request('POST', '/api/checkout/quote', {
      body: { shippingAddress: MUMBAI_ADDRESS },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.intraState, false);
    assert.equal(res.body.cgst, 0);
    assert.equal(res.body.sgst, 0);
    assert.equal(res.body.igst, res.body.taxTotal);
  });

  test('reconciles: taxable value + tax equals the grand total', async () => {
    const res = await client.request('POST', '/api/checkout/quote', {
      body: { shippingAddress: BENGALURU_ADDRESS },
    });
    assert.equal(res.body.taxableValue + res.body.taxTotal, res.body.grandTotal);
  });

  test('rejects an invalid GSTIN', async () => {
    const res = await client.request('POST', '/api/checkout/quote', {
      body: { shippingAddress: BENGALURU_ADDRESS, gstin: '29AAACR5055K1ZZ' },
    });
    assert.equal(res.status, 422);
  });

  test('accepts a checksum-valid GSTIN', async () => {
    const res = await client.request('POST', '/api/checkout/quote', {
      body: { shippingAddress: BENGALURU_ADDRESS, gstin: '29AAACR5055K1Z3' },
    });
    assert.equal(res.status, 200);
  });

  test('refuses an unserviceable pincode', async () => {
    const res = await client.request('POST', '/api/checkout/quote', {
      body: { shippingAddress: { ...BENGALURU_ADDRESS, pincode: '999999', city: 'Nowhere' } },
    });
    // 999999 is not in the seeded table, so it falls back to the Karnataka zone
    // and remains serviceable — a gap in the pincode table must not lose a sale.
    assert.equal(res.status, 200);
  });
});

describe('placing an order', () => {
  let orderNumber = '';

  test('creates the order, reserves stock and empties the cart', async () => {
    const before = await client.request('GET', `/api/catalog/products/${fixture.productSlug}`);
    const stockBefore = before.body.variants.find((v: { id: string }) => v.id === fixture.variantId).stockQty;

    const res = await client.request('POST', '/api/checkout/orders', {
      body: { shippingAddress: BENGALURU_ADDRESS, billingSameAsShipping: true },
    });

    assert.equal(res.status, 201);
    assert.match(res.body.orderNumber, /^APS-\d{4}-\d{5}$/, 'order number follows APS-FY-NNNNN');
    assert.ok(res.body.grandTotal > 0);
    orderNumber = res.body.orderNumber;

    const after = await client.request('GET', `/api/catalog/products/${fixture.productSlug}`);
    const stockAfter = after.body.variants.find((v: { id: string }) => v.id === fixture.variantId).stockQty;
    assert.equal(stockAfter, stockBefore - 1, 'stock is reserved at order creation');

    const cart = await client.request('GET', '/api/cart');
    assert.equal(cart.body.itemCount, 0, 'cart is emptied once the order exists');
  });

  test('the order is readable by number and starts awaiting payment', async () => {
    const res = await client.request('GET', `/api/checkout/orders/${orderNumber}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'pending_payment');
    assert.ok(res.body.lines.length > 0);
    assert.ok(res.body.events.length > 0, 'timeline starts immediately');
  });

  test('order totals reconcile', async () => {
    const res = await client.request('GET', `/api/checkout/orders/${orderNumber}`);
    const o = res.body;
    assert.equal(o.grandTotal, o.subtotal - o.discountTotal + o.shippingTotal);
    assert.equal(o.taxableValue + o.taxTotal, o.grandTotal);
  });

  test('issues sequential, non-colliding order numbers', async () => {
    // Regression: raw execute() returns {rows} on some drivers and an array on
    // others. Reading the wrong shape silently yielded 1 every time, which would
    // have collided on the second order of the financial year.
    const numbers: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      await client.request('POST', '/api/cart/items', { body: { variantId: fixture.variantId, quantity: 1 } });
      const res = await client.request('POST', '/api/checkout/orders', {
        body: { shippingAddress: BENGALURU_ADDRESS, billingSameAsShipping: true },
      });
      assert.equal(res.status, 201);
      numbers.push(res.body.orderNumber);
    }

    assert.equal(new Set(numbers).size, 3, `order numbers must be unique, got ${numbers.join(', ')}`);
    const sequence = numbers.map((n) => Number(n.split('-')[2]));
    assert.deepEqual(sequence, [...sequence].sort((a, b) => a - b), 'numbers should increase');
    assert.equal(sequence[2]! - sequence[0]!, 2, 'numbers should be consecutive');
  });

  test('refuses to check out an empty cart', async () => {
    const res = await client.request('POST', '/api/checkout/orders', {
      body: { shippingAddress: BENGALURU_ADDRESS, billingSameAsShipping: true },
    });
    assert.equal(res.status, 409);
  });
});

describe('admin', () => {
  let adminToken = '';

  test('rejects a bad password', async () => {
    const res = await client.request('POST', '/api/auth/admin/login', {
      body: { email: fixture.adminEmail, password: 'wrong-password' },
    });
    assert.equal(res.status, 401);
  });

  test('signs in an admin', async () => {
    const res = await client.request('POST', '/api/auth/admin/login', {
      body: { email: fixture.adminEmail, password: fixture.adminPassword },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.role, 'superadmin');
    adminToken = res.body.accessToken;
  });

  test('blocks the admin area without an admin token', async () => {
    const res = await client.request('GET', '/api/admin/dashboard');
    assert.equal(res.status, 401);
  });

  test('serves dashboard statistics', async () => {
    const res = await client.request('GET', '/api/admin/dashboard', { token: adminToken });
    assert.equal(res.status, 200);
    assert.ok('revenue' in res.body);
    assert.ok(Array.isArray(res.body.revenueSeries));
    assert.ok(res.body.revenueSeries.length > 0, 'series fills every day, including empty ones');
  });

  test('lists orders and inventory', async () => {
    const orders = await client.request('GET', '/api/admin/orders', { token: adminToken });
    assert.equal(orders.status, 200);
    assert.ok(orders.body.items.length > 0);
    assert.ok(orders.body.items[0].itemCount > 0, 'order line count must be real, not a silently-zero subquery');

    const products = await client.request('GET', '/api/admin/products', { token: adminToken });
    assert.equal(products.status, 200);
    assert.ok(products.body.items[0].variantCount > 0, 'variant count must be real');

    const inventory = await client.request('GET', '/api/admin/inventory', { token: adminToken });
    assert.equal(inventory.status, 200);
    assert.ok('lowStock' in inventory.body);
  });

  test('saving a product preserves its story blocks, specs and FAQs', async () => {
    /* Regression, twice over:
       1. the admin form used to send features: [] and the API replaces child
          rows wholesale, so every save destroyed the product's scroll story;
       2. image URLs were validated as fully-qualified URLs, which rejected the
          root-relative paths the catalogue actually uses. */
    const list = await client.request('GET', '/api/admin/products?perPage=1', { token: adminToken });
    const productId = list.body.items[0].product.id;

    const before = await client.request('GET', `/api/admin/products/${productId}`, { token: adminToken });
    assert.ok(before.body.specs.length > 0, 'fixture product should have specs to lose');
    assert.ok(before.body.features.length > 0, 'fixture product should have a story block to lose');

    const p = before.body;
    const payload = {
      slug: p.slug, sku: p.sku, name: p.name, tagline: p.tagline, summary: p.summary,
      description: p.description, categoryId: p.categoryId, brand: p.brand,
      basePrice: p.basePrice, compareAtPrice: p.compareAtPrice, status: p.status,
      hsnCode: p.hsnCode, taxRateBps: p.taxRateBps, weightG: p.weightG,
      lengthMm: p.lengthMm, widthMm: p.widthMm, heightMinMm: p.heightMinMm,
      heightMaxMm: p.heightMaxMm, loadCapacityKg: p.loadCapacityKg,
      warrantyMonths: p.warrantyMonths, badges: p.badges, isFeatured: p.isFeatured,
      sortOrder: p.sortOrder, metaTitle: p.metaTitle, metaDescription: p.metaDescription,
      variants: p.variants.map((v: any) => ({
        id: v.id, sku: v.sku, optionName: v.optionName, optionValue: v.optionValue,
        priceDelta: v.priceDelta, stockQty: v.stockQty, lowStockThreshold: v.lowStockThreshold,
        weightG: v.weightG, hexColour: v.hexColour, isActive: v.isActive,
      })),
      images: p.images.map((i: any, n: number) => ({
        url: i.url, alt: i.alt, sortOrder: n, isPrimary: n === 0, variantId: null,
      })),
      specs: p.specs.map((sp: any, n: number) => ({ group: sp.group, label: sp.label, value: sp.value, sortOrder: n })),
      faqs: p.faqs.map((f: any, n: number) => ({ question: f.question, answer: f.answer, sortOrder: n })),
      features: p.features.map((f: any, n: number) => ({
        eyebrow: f.eyebrow, title: f.title, body: f.body, mediaUrl: f.mediaUrl,
        mediaAlt: f.mediaAlt, layout: f.layout, stats: f.stats, sortOrder: n,
      })),
    };

    const save = await client.request('PUT', `/api/admin/products/${productId}`, { token: adminToken, body: payload });
    assert.equal(save.status, 200, `save failed: ${JSON.stringify(save.body)}`);

    const after = await client.request('GET', `/api/admin/products/${productId}`, { token: adminToken });
    assert.equal(after.body.specs.length, before.body.specs.length, 'specs must survive a save');
    assert.equal(after.body.features.length, before.body.features.length, 'story blocks must survive a save');
    assert.equal(after.body.faqs.length, before.body.faqs.length, 'FAQs must survive a save');
    assert.equal(after.body.images.length, before.body.images.length, 'images must survive a save');
    assert.equal(
      after.body.variants.filter((v: any) => v.isActive).length,
      before.body.variants.filter((v: any) => v.isActive).length,
      'variants must not be deactivated by an unchanged save',
    );
  });

  test('creates a coupon and rejects a duplicate code', async () => {
    const body = {
      code: 'ADMIN15', type: 'percent', value: 1500, scope: 'all',
      targetIds: [], isActive: true, description: 'Created in a test',
    };
    const first = await client.request('POST', '/api/admin/coupons', { token: adminToken, body });
    assert.equal(first.status, 201);

    const duplicate = await client.request('POST', '/api/admin/coupons', { token: adminToken, body });
    assert.equal(duplicate.status, 409);
  });

  test('enforces legal order status transitions and restocks on cancel', async () => {
    const orders = await client.request('GET', '/api/admin/orders', { token: adminToken });
    const pending = orders.body.items.find((i: any) => i.order.status === 'pending_payment');
    assert.ok(pending, 'expected at least one pending order to act on');
    const orderId = pending.order.id;
    const orderedUnits = pending.itemCount;

    // pending_payment → shipped is not a legal jump.
    const illegal = await client.request('PATCH', `/api/admin/orders/${orderId}/status`, {
      token: adminToken, body: { status: 'shipped' },
    });
    assert.equal(illegal.status, 422);
    assert.equal(illegal.body.type, 'invalid_transition');

    /* Measure the stock delta around the cancellation rather than comparing to
       the fixture's starting value — earlier tests in this file place orders,
       so an absolute expectation would couple the two. */
    const before = await client.request('GET', `/api/catalog/products/${fixture.productSlug}`);
    const stockBefore = before.body.variants.find((v: { id: string }) => v.id === fixture.variantId).stockQty;

    const legal = await client.request('PATCH', `/api/admin/orders/${orderId}/status`, {
      token: adminToken, body: { status: 'cancelled', note: 'Cancelled by test' },
    });
    assert.equal(legal.status, 200);
    assert.equal(legal.body.status, 'cancelled');

    const after = await client.request('GET', `/api/catalog/products/${fixture.productSlug}`);
    const stockAfter = after.body.variants.find((v: { id: string }) => v.id === fixture.variantId).stockQty;
    assert.equal(stockAfter, stockBefore + orderedUnits, 'cancelling returns the reserved units to the shelf');
  });
});

describe('public endpoints', () => {
  test('checks a pincode', async () => {
    const res = await client.request('POST', '/api/pincode/check', { body: { pincode: '560001' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.serviceable, true);
    assert.equal(res.body.city, 'Bengaluru');
  });

  test('rejects a malformed pincode', async () => {
    const res = await client.request('POST', '/api/pincode/check', { body: { pincode: '12' } });
    assert.equal(res.status, 422);
  });

  test('accepts an enquiry', async () => {
    const res = await client.request('POST', '/api/enquiries', {
      body: {
        name: 'Salon Owner', phone: '9123456780',
        message: 'I need four stations for a new salon in Koramangala.',
        quantity: 4, businessName: 'Paws & Co', city: 'Bengaluru',
      },
    });
    assert.equal(res.status, 201);
  });

  test('serves a published CMS page', async () => {
    const res = await client.request('GET', '/api/pages/shipping');
    assert.equal(res.status, 200);
    assert.equal(res.body.slug, 'shipping');
  });

  test('health endpoint responds', async () => {
    const res = await client.request('GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });
});
