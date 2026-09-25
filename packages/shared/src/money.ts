/**
 * Money is represented everywhere as an integer number of paise.
 * Never use floats for money: 0.1 + 0.2 !== 0.3, and a 1-paisa drift on a
 * ₹1,10,200 order is a reconciliation bug nobody enjoys finding.
 *
 * Safe range: Number.MAX_SAFE_INTEGER paise ≈ ₹90 trillion. Ample.
 */

export type Paise = number;

export const RUPEE = 100;

export function rupeesToPaise(rupees: number): Paise {
  return Math.round(rupees * RUPEE);
}

export function paiseToRupees(paise: Paise): number {
  return paise / RUPEE;
}

/** Guard used at every boundary where money enters the system. */
export function assertPaise(value: unknown, label = 'amount'): asserts value is Paise {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw new TypeError(`${label} must be an integer number of paise, received: ${String(value)}`);
  }
  if (value < 0) throw new RangeError(`${label} must not be negative, received: ${value}`);
}

/**
 * Indian digit grouping: ₹1,10,200 — not ₹110,200.
 * Intl handles this correctly with the en-IN locale.
 */
const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const inrFormatterWithPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹48,640 — the default for display. Paise are hidden unless non-zero. */
export function formatINR(paise: Paise, opts: { showPaise?: boolean } = {}): string {
  const rupees = paiseToRupees(paise);
  const hasPaise = paise % RUPEE !== 0;
  const fmt = opts.showPaise ?? hasPaise ? inrFormatterWithPaise : inrFormatter;
  return fmt.format(rupees);
}

/** "48,640" without the symbol, for places that render ₹ separately. */
export function formatAmount(paise: Paise): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(paiseToRupees(paise));
}

/**
 * Percentage off, rounded to the nearest whole percent for badge display.
 * Returns null when there is no genuine discount, so callers can skip the badge
 * rather than render "0% off".
 */
export function discountPercent(price: Paise, compareAt: Paise | null | undefined): number | null {
  if (!compareAt || compareAt <= price) return null;
  const pct = Math.round(((compareAt - price) / compareAt) * 100);
  return pct > 0 ? pct : null;
}

/** Sum that stays in integer space. */
export function sumPaise(values: readonly Paise[]): Paise {
  return values.reduce<Paise>((total, v) => total + v, 0);
}

/**
 * Apply a basis-point rate to an amount, rounding half away from zero.
 * Used for percentage coupons and tax. Kept in one place so rounding is consistent.
 */
export function applyBps(amount: Paise, bps: number): Paise {
  return Math.round((amount * bps) / 10_000);
}
