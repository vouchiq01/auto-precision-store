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

/**
 * The two-digit prefixes India Post has actually assigned.
 *
 * The first digit is the region and the first two identify the postal circle,
 * and several two-digit combinations were never issued: 29, 35, 54, 55, 65, 66
 * and 86–89 all fall in gaps between circles. 90–99 is the Army Postal Service
 * (APO/FPO), which is a real destination but not one a courier will take a
 * 40 kg crate to — those go through support.
 */
const ASSIGNED_PREFIXES: ReadonlySet<number> = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,          // Delhi, Haryana, Punjab, HP, J&K
  20, 21, 22, 23, 24, 25, 26, 27, 28,          // UP, Uttarakhand
  30, 31, 32, 33, 34,                          // Rajasthan
  36, 37, 38, 39,                              // Gujarat, DD, DNH
  40, 41, 42, 43, 44,                          // Maharashtra, Goa
  45, 46, 47, 48, 49,                          // MP, Chhattisgarh
  50, 51, 52, 53,                              // Telangana, Andhra Pradesh
  56, 57, 58, 59,                              // Karnataka
  60, 61, 62, 63, 64,                          // Tamil Nadu, Puducherry
  67, 68, 69,                                  // Kerala, Lakshadweep
  70, 71, 72, 73, 74,                          // West Bengal, Sikkim, A&N
  75, 76, 77,                                  // Odisha
  78, 79,                                      // Assam and the North East
  80, 81, 82, 83, 84, 85,                      // Bihar, Jharkhand
]);

/**
 * Structural validity only — six digits, in a range India Post actually issues.
 *
 * This deliberately cannot tell you whether a pincode EXISTS. "111111" is six
 * digits with a Delhi prefix and passes here, but no such post office has ever
 * been issued. Proving existence needs the real directory, which is what
 * checkPincode does against India Post before it promises anyone a delivery.
 * Keep this function offline and cheap: it guards every address in the system.
 */
export function isValidPincode(pincode: string): boolean {
  const value = pincode.trim();
  if (!/^[1-8][0-9]{5}$/.test(value)) return false;
  return ASSIGNED_PREFIXES.has(Number(value.slice(0, 2)));
}
