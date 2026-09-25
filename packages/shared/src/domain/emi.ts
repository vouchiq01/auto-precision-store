import { type Paise, formatINR } from '../money.ts';

/**
 * "from ₹2,199/mo" messaging for high-ticket products.
 *
 * Razorpay performs the actual EMI transaction and owns the authoritative rate
 * card per issuer; this module only produces the *display* estimate that drives
 * conversion on a ₹60,000 table. It is explicitly an estimate, and the UI must
 * label it as one.
 */

export interface EmiPlan {
  months: number;
  /** Annual interest rate in basis points. 1400 = 14% p.a. */
  rateBps: number;
}

/** Representative bank rates; tune once you see your real Razorpay offer set. */
export const DEFAULT_EMI_PLANS: readonly EmiPlan[] = [
  { months: 3, rateBps: 1300 },
  { months: 6, rateBps: 1300 },
  { months: 9, rateBps: 1400 },
  { months: 12, rateBps: 1400 },
  { months: 18, rateBps: 1500 },
  { months: 24, rateBps: 1600 },
];

/** Products below this simply don't show EMI — it reads as desperate on a ₹9,880 item. */
export const EMI_MIN_ORDER_VALUE: Paise = 1_000_000; // ₹10,000

export interface EmiOption {
  months: number;
  rateBps: number;
  monthlyAmount: Paise;
  totalPayable: Paise;
  totalInterest: Paise;
}

/**
 * Standard reducing-balance EMI:
 *
 *   EMI = P · r · (1+r)^n / ((1+r)^n − 1)
 *
 * where r is the monthly rate and n the tenure in months.
 * A zero rate degrades to simple division rather than dividing by zero.
 */
export function calculateEmi(principal: Paise, plan: EmiPlan): EmiOption {
  const { months, rateBps } = plan;
  const monthlyRate = rateBps / 10_000 / 12;

  const monthlyAmount =
    monthlyRate === 0
      ? Math.ceil(principal / months)
      : Math.ceil((principal * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1));

  const totalPayable = monthlyAmount * months;
  return { months, rateBps, monthlyAmount, totalPayable, totalInterest: totalPayable - principal };
}

export function emiOptions(principal: Paise, plans: readonly EmiPlan[] = DEFAULT_EMI_PLANS): EmiOption[] {
  if (principal < EMI_MIN_ORDER_VALUE) return [];
  return plans.map((plan) => calculateEmi(principal, plan));
}

/** The headline figure: the smallest monthly instalment across all tenures. */
export function lowestEmi(principal: Paise, plans: readonly EmiPlan[] = DEFAULT_EMI_PLANS): EmiOption | null {
  const options = emiOptions(principal, plans);
  if (options.length === 0) return null;
  return options.reduce((lowest, option) => (option.monthlyAmount < lowest.monthlyAmount ? option : lowest));
}

export function formatEmiTeaser(principal: Paise): string | null {
  const lowest = lowestEmi(principal);
  if (!lowest) return null;
  /* The instalment is exact paise, which renders as "₹5,503.46/mo" — precision
     nobody asked for on a teaser, repeated on every card. Rounded UP to the
     rupee so the headline figure can never come in under the real one. */
  const wholeRupees = Math.ceil(lowest.monthlyAmount / 100) * 100;
  return `${formatINR(wholeRupees)}/mo`;
}
