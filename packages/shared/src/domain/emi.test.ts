import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateEmi, lowestEmi, emiOptions, formatEmiTeaser, EMI_MIN_ORDER_VALUE } from './emi.ts';
import { rupeesToPaise } from '../money.ts';

describe('calculateEmi', () => {
  test('a 12-month plan at 14% costs more in total than the principal', () => {
    const principal = rupeesToPaise(48_640);
    const emi = calculateEmi(principal, { months: 12, rateBps: 1400 });
    assert.ok(emi.monthlyAmount > 0);
    assert.ok(emi.totalPayable > principal);
    assert.equal(emi.totalInterest, emi.totalPayable - principal);
    // Sanity: roughly principal/12 plus interest.
    assert.ok(emi.monthlyAmount > principal / 12);
  });

  test('a zero-interest plan divides cleanly instead of dividing by zero', () => {
    const emi = calculateEmi(rupeesToPaise(12_000), { months: 12, rateBps: 0 });
    assert.equal(emi.monthlyAmount, rupeesToPaise(1_000));
    assert.equal(emi.totalInterest, 0);
  });

  test('longer tenures lower the monthly instalment but raise total interest', () => {
    const principal = rupeesToPaise(60_000);
    const short = calculateEmi(principal, { months: 6, rateBps: 1400 });
    const long = calculateEmi(principal, { months: 24, rateBps: 1400 });
    assert.ok(long.monthlyAmount < short.monthlyAmount);
    assert.ok(long.totalInterest > short.totalInterest);
  });
});

describe('lowestEmi', () => {
  test('picks the smallest monthly instalment', () => {
    const lowest = lowestEmi(rupeesToPaise(60_000));
    assert.ok(lowest);
    const all = emiOptions(rupeesToPaise(60_000));
    assert.equal(lowest.monthlyAmount, Math.min(...all.map((o) => o.monthlyAmount)));
  });

  test('suppresses EMI below the threshold, where it reads as desperate', () => {
    assert.equal(lowestEmi(EMI_MIN_ORDER_VALUE - 1), null);
    assert.deepEqual(emiOptions(rupeesToPaise(5_000)), []);
    assert.equal(formatEmiTeaser(rupeesToPaise(5_000)), null);
  });

  test('formats a teaser for an expensive product', () => {
    const teaser = formatEmiTeaser(rupeesToPaise(110_200));
    assert.ok(teaser?.startsWith('₹'));
    assert.ok(teaser?.endsWith('/mo'));
  });
});
