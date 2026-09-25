import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { formatINR, formatAmount, discountPercent, rupeesToPaise, paiseToRupees, applyBps, assertPaise, sumPaise } from './money.ts';

describe('formatINR', () => {
  test('uses Indian digit grouping, not thousands grouping', () => {
    // ₹1,10,200 — lakh grouping. Getting this wrong looks instantly foreign.
    assert.equal(formatINR(rupeesToPaise(110_200)), '₹1,10,200');
    assert.equal(formatINR(rupeesToPaise(48_640)), '₹48,640');
  });
  test('shows paise only when they are non-zero', () => {
    assert.equal(formatINR(4_864_000), '₹48,640');
    assert.ok(formatINR(4_864_050).includes('.50'));
  });
});

describe('formatAmount', () => {
  test('omits the currency symbol', () => {
    assert.equal(formatAmount(rupeesToPaise(110_200)), '1,10,200');
  });
});

describe('rupeesToPaise', () => {
  test('rounds rather than truncating float noise', () => {
    assert.equal(rupeesToPaise(0.1 + 0.2), 30);
    assert.equal(rupeesToPaise(48_640), 4_864_000);
  });
  test('round-trips', () => {
    assert.equal(paiseToRupees(rupeesToPaise(1234.56)), 1234.56);
  });
});

describe('discountPercent', () => {
  test('computes the badge percentage', () => {
    assert.equal(discountPercent(rupeesToPaise(48_640), rupeesToPaise(64_000)), 24);
  });
  test('returns null when there is no real discount', () => {
    assert.equal(discountPercent(1000, 1000), null);
    assert.equal(discountPercent(1000, 900), null);
    assert.equal(discountPercent(1000, null), null);
    assert.equal(discountPercent(1000, undefined), null);
  });
});

describe('applyBps', () => {
  test('applies a basis-point rate', () => {
    assert.equal(applyBps(100_000, 1800), 18_000);
    assert.equal(applyBps(100_000, 2000), 20_000);
  });
});

describe('assertPaise', () => {
  test('rejects floats, negatives and non-numbers', () => {
    assert.throws(() => assertPaise(1.5));
    assert.throws(() => assertPaise(-1));
    assert.throws(() => assertPaise('100'));
    assert.throws(() => assertPaise(NaN));
    assert.doesNotThrow(() => assertPaise(0));
  });
});

describe('sumPaise', () => {
  test('sums an empty list to zero', () => {
    assert.equal(sumPaise([]), 0);
  });
});
