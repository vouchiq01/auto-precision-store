import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { quoteShipping, isValidPincode, formatEta, type ShippingRate } from './shipping.ts';
import { rupeesToPaise } from '../money.ts';

const rates: ShippingRate[] = [
  { id: 'r1', zoneId: 'z1', minWeightG: 0, maxWeightG: 20_000, price: rupeesToPaise(600), etaDaysMin: 3, etaDaysMax: 5, freeAbove: rupeesToPaise(25_000) },
  { id: 'r2', zoneId: 'z1', minWeightG: 20_001, maxWeightG: 40_000, price: rupeesToPaise(1_200), etaDaysMin: 4, etaDaysMax: 7, freeAbove: null },
  { id: 'r3', zoneId: 'z1', minWeightG: 40_001, maxWeightG: null, price: rupeesToPaise(2_200), etaDaysMin: 5, etaDaysMax: 9, freeAbove: null },
];

describe('quoteShipping', () => {
  test('selects the slab containing the parcel weight', () => {
    const result = quoteShipping({ rates, totalWeightG: 32_000, subtotal: rupeesToPaise(48_640), isServiceable: true });
    assert.ok(result.ok);
    assert.equal(result.quote.rateId, 'r2');
    assert.equal(result.quote.price, rupeesToPaise(1_200));
  });

  test('uses the open-ended top slab for very heavy orders', () => {
    const result = quoteShipping({ rates, totalWeightG: 95_000, subtotal: rupeesToPaise(200_000), isServiceable: true });
    assert.ok(result.ok);
    assert.equal(result.quote.rateId, 'r3');
  });

  test('waives the fee above the free-shipping threshold', () => {
    const result = quoteShipping({ rates, totalWeightG: 15_000, subtotal: rupeesToPaise(30_000), isServiceable: true });
    assert.ok(result.ok);
    assert.equal(result.quote.price, 0);
    assert.equal(result.quote.freeReason, 'threshold');
  });

  test('a free-shipping coupon overrides the fee', () => {
    const result = quoteShipping({ rates, totalWeightG: 32_000, subtotal: rupeesToPaise(48_640), isServiceable: true, couponFreeShipping: true });
    assert.ok(result.ok);
    assert.equal(result.quote.price, 0);
    assert.equal(result.quote.freeReason, 'coupon');
  });

  test('refuses an unserviceable pincode', () => {
    const result = quoteShipping({ rates, totalWeightG: 32_000, subtotal: 1, isServiceable: false });
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.reason, 'not_serviceable');
  });

  test('reports no_rate rather than guessing when slabs have a gap', () => {
    const gapped: ShippingRate[] = [{ ...(rates[0] as ShippingRate), maxWeightG: 1_000 }];
    const result = quoteShipping({ rates: gapped, totalWeightG: 32_000, subtotal: 1, isServiceable: true });
    assert.equal(result.ok === false && result.reason, 'no_rate');
  });

  test('picks the cheapest match when slabs overlap through misconfiguration', () => {
    const overlapping: ShippingRate[] = [
      { ...(rates[1] as ShippingRate), id: 'expensive', price: rupeesToPaise(5_000) },
      { ...(rates[1] as ShippingRate), id: 'cheap', price: rupeesToPaise(900) },
    ];
    const result = quoteShipping({ rates: overlapping, totalWeightG: 30_000, subtotal: 1, isServiceable: true });
    assert.ok(result.ok);
    assert.equal(result.quote.rateId, 'cheap');
  });
});

describe('isValidPincode', () => {
  test('accepts real pincodes from circles across the country', () => {
    for (const good of ['560001', ' 110001 ', '400050', '682001', '781001', '744101']) {
      assert.ok(isValidPincode(good), `expected ${good} to be valid`);
    }
  });

  test('rejects malformed input', () => {
    for (const bad of ['', '12345', '1234567', '012345', 'abcdef']) {
      assert.equal(isValidPincode(bad), false, `expected ${bad} to be invalid`);
    }
  });

  test('rejects two-digit prefixes India Post never issued', () => {
    /* These sit in the gaps between postal circles. A plain six-digit regex
       waves all of them through, which is how "290000" became a delivery
       promise. */
    for (const bad of ['290000', '350000', '540000', '550000', '650000', '660000', '860000', '890000']) {
      assert.equal(isValidPincode(bad), false, `expected ${bad} to be invalid`);
    }
  });

  test('rejects Army Post Office ranges, which couriers will not crate to', () => {
    for (const bad of ['900001', '999999']) {
      assert.equal(isValidPincode(bad), false, `expected ${bad} to be invalid`);
    }
  });

  test('is structural only — it cannot prove a pincode exists', () => {
    /* 111111 is six digits on a real Delhi prefix and no such post office was
       ever issued. Only the directory lookup in checkPincode catches it, and
       this assertion exists so nobody later mistakes this for that. */
    assert.ok(isValidPincode('111111'));
  });
});

describe('formatEta', () => {
  test('collapses an equal range', () => {
    assert.equal(formatEta(3, 3), '3 days');
    assert.equal(formatEta(1, 1), '1 day');
  });
  test('renders a true range', () => {
    assert.equal(formatEta(3, 5), '3–5 days');
  });
});
