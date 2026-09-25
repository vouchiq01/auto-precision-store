import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { allocateDiscount, priceOrder, type PriceableLine } from './pricing.ts';
import { sumPaise, rupeesToPaise } from '../money.ts';

const line = (over: Partial<PriceableLine> = {}): PriceableLine => ({
  productId: 'p1', variantId: 'v1', categoryId: 'c1',
  unitPrice: rupeesToPaise(48_640), quantity: 1, taxRateBps: 1800, weightG: 32_000,
  ...over,
});

describe('allocateDiscount', () => {
  test('splits proportionally', () => {
    const shares = allocateDiscount([10_000, 30_000], 4_000);
    assert.deepEqual(shares, [1_000, 3_000]);
  });

  test('shares always sum exactly to the discount, despite rounding', () => {
    // 10000/3 does not divide evenly — the remainder must not vanish.
    const shares = allocateDiscount([10_000, 10_000, 10_000], 10_000);
    assert.equal(sumPaise(shares), 10_000);
  });

  test('never allocates more than the cart is worth', () => {
    const shares = allocateDiscount([5_000], 999_999);
    assert.equal(sumPaise(shares), 5_000);
  });

  test('handles a zero discount and an empty cart', () => {
    assert.deepEqual(allocateDiscount([1_000, 2_000], 0), [0, 0]);
    assert.deepEqual(allocateDiscount([], 500), []);
  });

  test('puts the rounding remainder on the largest line', () => {
    const shares = allocateDiscount([100, 10_000], 101);
    assert.equal(sumPaise(shares), 101);
    assert.ok((shares[1] ?? 0) > (shares[0] ?? 0));
  });
});

describe('priceOrder', () => {
  test('computes a single-line intra-state order', () => {
    const totals = priceOrder({ lines: [line()], buyerState: 'Karnataka' });
    assert.equal(totals.subtotal, 4_864_000);
    assert.equal(totals.grandTotal, 4_864_000);
    assert.equal(totals.igst, 0);
    assert.equal(totals.cgst + totals.sgst, totals.taxTotal);
  });

  test('grand total equals subtotal minus discount plus shipping', () => {
    const totals = priceOrder({
      lines: [line({ quantity: 2 })],
      discount: rupeesToPaise(5_000),
      shipping: rupeesToPaise(1_200),
      buyerState: 'Tamil Nadu',
    });
    assert.equal(totals.grandTotal, totals.subtotal - totals.discountTotal + totals.shippingTotal);
  });

  test('taxable value plus tax reconciles to the grand total', () => {
    const totals = priceOrder({
      lines: [line(), line({ variantId: 'v2', unitPrice: rupeesToPaise(15_200), weightG: 18_000 })],
      discount: rupeesToPaise(3_000),
      shipping: rupeesToPaise(900),
      buyerState: 'Karnataka',
    });
    // Everything is GST-inclusive, so base + tax must land exactly on the total.
    assert.equal(totals.taxableValue + totals.taxTotal, totals.grandTotal);
  });

  test('taxes each line at its own rate after discount allocation', () => {
    const totals = priceOrder({
      lines: [line({ taxRateBps: 1800 }), line({ variantId: 'v2', taxRateBps: 1200 })],
      discount: rupeesToPaise(1_000),
      buyerState: 'Karnataka',
    });
    assert.equal(totals.lines[0]?.tax.rateBps, 1800);
    assert.equal(totals.lines[1]?.tax.rateBps, 1200);
    // Discount was split, so neither line kept its full pre-discount value.
    assert.ok((totals.lines[0]?.discountShare ?? 0) > 0);
    assert.ok((totals.lines[1]?.discountShare ?? 0) > 0);
  });

  test('accumulates shipping weight across quantities', () => {
    const totals = priceOrder({ lines: [line({ quantity: 3, weightG: 32_000 })] });
    assert.equal(totals.totalWeightG, 96_000);
  });

  test('an empty cart prices to zero rather than NaN', () => {
    const totals = priceOrder({ lines: [] });
    assert.equal(totals.subtotal, 0);
    assert.equal(totals.grandTotal, 0);
    assert.equal(totals.taxTotal, 0);
  });
});
