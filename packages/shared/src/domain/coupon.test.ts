import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCoupon, normaliseCouponCode, type Coupon, type CouponContext } from './coupon.ts';
import { rupeesToPaise } from '../money.ts';

const NOW = new Date('2026-09-25T10:00:00Z');

const coupon = (over: Partial<Coupon> = {}): Coupon => ({
  id: 'c1', code: 'SAVE20', type: 'percent', value: 2000,
  minOrderValue: null, maxDiscount: null,
  usageLimitTotal: null, usageLimitPerUser: null,
  startsAt: null, endsAt: null, scope: 'all', targetIds: [], isActive: true,
  ...over,
});

const ctx = (over: Partial<CouponContext> = {}): CouponContext => ({
  lines: [{ productId: 'p1', categoryId: 'cat1', lineTotal: rupeesToPaise(50_000) }],
  subtotal: rupeesToPaise(50_000),
  shippingTotal: rupeesToPaise(1_000),
  now: NOW, timesUsedTotal: 0, timesUsedByUser: 0,
  ...over,
});

describe('evaluateCoupon', () => {
  test('applies a percentage discount', () => {
    const result = evaluateCoupon(coupon(), ctx());
    assert.ok(result.ok);
    assert.equal(result.discount, rupeesToPaise(10_000));
  });

  test('caps a percentage discount at maxDiscount', () => {
    const result = evaluateCoupon(coupon({ maxDiscount: rupeesToPaise(2_000) }), ctx());
    assert.ok(result.ok);
    assert.equal(result.discount, rupeesToPaise(2_000));
  });

  test('applies a flat discount', () => {
    const result = evaluateCoupon(coupon({ type: 'flat', value: rupeesToPaise(3_000) }), ctx());
    assert.ok(result.ok);
    assert.equal(result.discount, rupeesToPaise(3_000));
  });

  test('a flat discount never exceeds the cart value', () => {
    const result = evaluateCoupon(
      coupon({ type: 'flat', value: rupeesToPaise(99_000) }),
      ctx({ lines: [{ productId: 'p1', categoryId: 'cat1', lineTotal: rupeesToPaise(5_000) }], subtotal: rupeesToPaise(5_000) }),
    );
    assert.ok(result.ok);
    assert.equal(result.discount, rupeesToPaise(5_000));
  });

  test('free shipping discounts nothing but sets the flag', () => {
    const result = evaluateCoupon(coupon({ type: 'free_shipping' }), ctx());
    assert.ok(result.ok);
    assert.equal(result.discount, 0);
    assert.equal(result.freeShipping, true);
  });

  test('rejects an inactive coupon', () => {
    const result = evaluateCoupon(coupon({ isActive: false }), ctx());
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.reason, 'inactive');
  });

  test('rejects before the start date and after the end date', () => {
    const early = evaluateCoupon(coupon({ startsAt: new Date('2026-10-01') }), ctx());
    assert.equal(early.ok === false && early.reason, 'not_started');
    const late = evaluateCoupon(coupon({ endsAt: new Date('2026-09-01') }), ctx());
    assert.equal(late.ok === false && late.reason, 'expired');
  });

  test('enforces the minimum order value against the whole cart', () => {
    const result = evaluateCoupon(coupon({ minOrderValue: rupeesToPaise(60_000) }), ctx());
    assert.equal(result.ok === false && result.reason, 'below_minimum');
  });

  test('enforces total and per-user usage limits', () => {
    const total = evaluateCoupon(coupon({ usageLimitTotal: 5 }), ctx({ timesUsedTotal: 5 }));
    assert.equal(total.ok === false && total.reason, 'usage_limit_reached');
    const perUser = evaluateCoupon(coupon({ usageLimitPerUser: 1 }), ctx({ timesUsedByUser: 1 }));
    assert.equal(perUser.ok === false && perUser.reason, 'user_limit_reached');
  });

  test('applies a category-scoped coupon only to matching lines', () => {
    const result = evaluateCoupon(
      coupon({ scope: 'category', targetIds: ['cat1'] }),
      ctx({
        lines: [
          { productId: 'p1', categoryId: 'cat1', lineTotal: rupeesToPaise(50_000) },
          { productId: 'p2', categoryId: 'cat2', lineTotal: rupeesToPaise(50_000) },
        ],
        subtotal: rupeesToPaise(100_000),
      }),
    );
    assert.ok(result.ok);
    // 20% of the ₹50,000 eligible line only, not the ₹1,00,000 cart.
    assert.equal(result.discount, rupeesToPaise(10_000));
    assert.equal(result.eligibleSubtotal, rupeesToPaise(50_000));
  });

  test('rejects when no line matches the scope', () => {
    const result = evaluateCoupon(coupon({ scope: 'product', targetIds: ['nope'] }), ctx());
    assert.equal(result.ok === false && result.reason, 'not_applicable');
  });

  test('never produces a negative discount', () => {
    const result = evaluateCoupon(coupon({ type: 'flat', value: 0 }), ctx());
    assert.ok(result.ok);
    assert.ok(result.discount >= 0);
  });
});

describe('normaliseCouponCode', () => {
  test('uppercases and strips whitespace', () => {
    assert.equal(normaliseCouponCode('  save 20 '), 'SAVE20');
  });
});
