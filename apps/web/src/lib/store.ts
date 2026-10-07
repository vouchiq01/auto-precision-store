/**
 * Karnataka free-freight threshold, in paise.
 *
 * Mirrors the Karnataka row of `shipping_rates.free_above` and the promise the
 * site makes everywhere ("free freight in Karnataka over ₹25,000"). Other
 * zones have their own, higher, thresholds in the database, but the site only
 * advertises this one, so the cart nudge only ever talks about this one. The
 * rule compares the total AFTER discounts, which is what `estimatedTotal` is.
 */
export const KARNATAKA_FREE_FREIGHT = 2_500_000;
