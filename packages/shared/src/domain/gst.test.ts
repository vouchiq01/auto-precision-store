import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { splitInclusiveGst, addExclusiveGst, isValidGstin, isIntraState } from './gst.ts';
import { rupeesToPaise } from '../money.ts';

describe('splitInclusiveGst', () => {
  test('backs tax out of a GST-inclusive price', () => {
    // ₹48,640 inclusive at 18% → base ₹41,220.34, tax ₹7,419.66
    const result = splitInclusiveGst(rupeesToPaise(48_640), 1800, 'Karnataka');
    assert.equal(result.grossValue, 4_864_000);
    assert.equal(result.taxableValue + result.totalTax, result.grossValue);
    assert.equal(result.totalTax, 741_966); // round(4864000 × 1800 / 11800)
  });

  test('splits CGST and SGST exactly, with no lost paisa', () => {
    const result = splitInclusiveGst(rupeesToPaise(48_640), 1800, 'Karnataka');
    assert.equal(result.cgst + result.sgst, result.totalTax);
    assert.equal(result.igst, 0);
    assert.ok(result.intraState);
    // Odd totals must not silently drop a paisa on the floor.
    assert.equal(result.sgst - result.cgst, result.totalTax % 2);
  });

  test('charges IGST for an out-of-state buyer', () => {
    const result = splitInclusiveGst(rupeesToPaise(48_640), 1800, 'Maharashtra');
    assert.equal(result.cgst, 0);
    assert.equal(result.sgst, 0);
    assert.equal(result.igst, result.totalTax);
    assert.equal(result.intraState, false);
  });

  test('intra-state and inter-state collect identical total tax', () => {
    const ka = splitInclusiveGst(rupeesToPaise(110_200), 1800, 'Karnataka');
    const mh = splitInclusiveGst(rupeesToPaise(110_200), 1800, 'Maharashtra');
    assert.equal(ka.totalTax, mh.totalTax);
    assert.equal(ka.grossValue, mh.grossValue);
  });

  test('treats an unknown or missing state as inter-state', () => {
    assert.equal(isIntraState(null), false);
    assert.equal(isIntraState(undefined), false);
    assert.equal(isIntraState(''), false);
  });

  test('is case- and whitespace-insensitive about the seller state', () => {
    assert.ok(isIntraState('karnataka'));
    assert.ok(isIntraState('  KARNATAKA  '));
  });

  test('handles zero without dividing by anything awkward', () => {
    const result = splitInclusiveGst(0, 1800, 'Karnataka');
    assert.equal(result.totalTax, 0);
    assert.equal(result.taxableValue, 0);
  });
});

describe('addExclusiveGst', () => {
  test('adds tax on top for shipping quoted ex-tax', () => {
    const result = addExclusiveGst(100_000, 1800, 'Karnataka');
    assert.equal(result.taxableValue, 100_000);
    assert.equal(result.totalTax, 18_000);
    assert.equal(result.grossValue, 118_000);
    assert.equal(result.cgst + result.sgst, 18_000);
  });
});

describe('isValidGstin', () => {
  // Checksum-verified vectors. 29 = Karnataka, 27 = Maharashtra, 24 = Gujarat.
  const VALID_KARNATAKA = '29AAACR5055K1Z3';

  test('accepts checksum-valid GSTINs', () => {
    assert.ok(isValidGstin(VALID_KARNATAKA));
    assert.ok(isValidGstin('27AAPFU0939F1ZV'));
    assert.ok(isValidGstin('24AAACC1206D1ZM'));
  });

  test('rejects a GSTIN whose checksum digit is wrong', () => {
    // Structurally perfect, one character off. A regex alone waves this through,
    // and a wrong GSTIN on an invoice costs the buyer their input credit.
    assert.equal(isValidGstin('29AAACR5055K1ZK'), false);
    assert.equal(isValidGstin('27AAPFU0939F1ZA'), false);
  });

  test('rejects malformed input', () => {
    for (const bad of ['', '29AAACR5055K1Z', 'AAAAAAAAAAAAAAA', '29AAACR5055K1Z33', '2!AAACR5055K1Z3']) {
      assert.equal(isValidGstin(bad), false, `expected ${bad} to be invalid`);
    }
  });

  test('is tolerant of surrounding whitespace and lowercase', () => {
    assert.ok(isValidGstin('  29aaacr5055k1z3  '));
  });
});
