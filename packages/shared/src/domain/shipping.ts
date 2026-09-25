import type { Paise } from '../money.ts';

/**
 * Freight for 20–50 kg grooming tables.
 *
 * Flat-rate shipping on this catalogue either loses money on a 50 kg electric
 * table or overcharges on a 9 kg portable one, so rates are (zone × weight slab).
 */

export interface ShippingRate {
  id: string;
  zoneId: string;
  /** Inclusive lower bound, in grams. */
  minWeightG: number;
  /** Inclusive upper bound, in grams. null means "and above". */
  maxWeightG: number | null;
  price: Paise;
  etaDaysMin: number;
  etaDaysMax: number;
  /** Order subtotal above which this rate becomes free. null disables the perk. */
  freeAbove: Paise | null;
}

export interface ShippingQuote {
  price: Paise;
  etaDaysMin: number;
  etaDaysMax: number;
  isFree: boolean;
  freeReason: 'threshold' | 'coupon' | null;
  rateId: string;
}

export type ShippingFailure = { ok: false; reason: 'not_serviceable' | 'no_rate'; message: string };
export type ShippingSuccess = { ok: true; quote: ShippingQuote };
export type ShippingResult = ShippingSuccess | ShippingFailure;

/**
 * Pick the rate whose weight slab contains the parcel.
 *
 * Slabs are expected to be contiguous and non-overlapping; if the data is
 * misconfigured we take the cheapest match rather than the first, so a bad
 * admin entry overcharges nobody.
 */
export function quoteShipping(params: {
  rates: readonly ShippingRate[];
  totalWeightG: number;
  subtotal: Paise;
  isServiceable: boolean;
  couponFreeShipping?: boolean;
}): ShippingResult {
  const { rates, totalWeightG, subtotal, isServiceable, couponFreeShipping = false } = params;

  if (!isServiceable) {
    return { ok: false, reason: 'not_serviceable', message: 'We do not deliver to this pincode yet.' };
  }

  const matching = rates.filter(
    (rate) => totalWeightG >= rate.minWeightG && (rate.maxWeightG === null || totalWeightG <= rate.maxWeightG),
  );

  if (matching.length === 0) {
    return { ok: false, reason: 'no_rate', message: 'We could not calculate shipping for this order. Please contact us.' };
  }

  const rate = matching.reduce((cheapest, candidate) => (candidate.price < cheapest.price ? candidate : cheapest));

  if (couponFreeShipping) {
    return {
      ok: true,
      quote: { price: 0, etaDaysMin: rate.etaDaysMin, etaDaysMax: rate.etaDaysMax, isFree: true, freeReason: 'coupon', rateId: rate.id },
    };
  }

  if (rate.freeAbove !== null && subtotal >= rate.freeAbove) {
    return {
      ok: true,
      quote: { price: 0, etaDaysMin: rate.etaDaysMin, etaDaysMax: rate.etaDaysMax, isFree: true, freeReason: 'threshold', rateId: rate.id },
    };
  }

  return {
    ok: true,
    quote: { price: rate.price, etaDaysMin: rate.etaDaysMin, etaDaysMax: rate.etaDaysMax, isFree: false, freeReason: null, rateId: rate.id },
  };
}

/** "3–5 days" / "3 days" — collapses the range when both bounds agree. */
export function formatEta(min: number, max: number): string {
  return min === max ? `${min} day${min === 1 ? '' : 's'}` : `${min}–${max} days`;
}

/** Indian pincodes are exactly 6 digits and never start with 0. */
export function isValidPincode(pincode: string): boolean {
  return /^[1-9][0-9]{5}$/.test(pincode.trim());
}
