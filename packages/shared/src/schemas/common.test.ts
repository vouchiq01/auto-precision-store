import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mediaUrlSchema, phoneSchema, pincodeSchema } from './common.ts';

describe('phoneSchema', () => {
  test('normalises the shapes people actually type', () => {
    for (const input of ['9876543210', '+919876543210', '919876543210', '09876543210', '+91 98765 43210', '98765-43210']) {
      assert.equal(phoneSchema.parse(input), '+919876543210', `failed for ${input}`);
    }
  });

  test('keeps a valid mobile that happens to start with 91', () => {
    // Regression: a blanket country-code strip turned this into 23456780.
    assert.equal(phoneSchema.parse('9123456780'), '+919123456780');
    assert.equal(phoneSchema.parse('919123456780'), '+919123456780');
  });

  test('keeps a valid mobile that happens to start with 0 after the 9', () => {
    assert.equal(phoneSchema.parse('9012345678'), '+919012345678');
  });

  test('rejects numbers that cannot be Indian mobiles', () => {
    for (const bad of ['1234567890', '5876543210', '987654321', '98765432101', 'abcdefghij', '']) {
      assert.throws(() => phoneSchema.parse(bad), undefined, `expected ${bad} to be rejected`);
    }
  });
});

describe('pincodeSchema', () => {
  test('accepts a valid pincode and rejects a leading zero', () => {
    assert.equal(pincodeSchema.parse('560001'), '560001');
    assert.throws(() => pincodeSchema.parse('012345'));
  });
});

describe('mediaUrlSchema', () => {
  test('accepts a Supabase Storage URL', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/media/x.jpg';
    assert.equal(mediaUrlSchema.parse(url), url);
  });

  test('accepts a root-relative path from the public folder', () => {
    // Regression: requiring a fully-qualified URL made every seeded product
    // unsaveable from the admin panel.
    assert.equal(mediaUrlSchema.parse('/products/apex-e9/01.svg'), '/products/apex-e9/01.svg');
  });

  test('rejects anything that is neither', () => {
    for (const bad of ['products/01.svg', 'javascript:alert(1)', 'ftp://x/y.png', '']) {
      assert.throws(() => mediaUrlSchema.parse(bad), undefined, `expected ${bad} to be rejected`);
    }
  });
});
