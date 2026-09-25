import { type Paise, applyBps } from '../money.ts';

export type CouponType = 'percent' | 'flat' | 'free_shipping';
export type CouponScope = 'all' | 'category' | 'product';

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  /** Basis points for 'percent', paise for 'flat', ignored for 'free_shipping'. */
  value: number;
  minOrderValue: Paise | null;
  /** Ceiling on a percentage discount, so "20% off" can't give away ₹22,000. */
  maxDiscount: Paise | null;
  usageLimitTotal: number | null;
  usageLimitPerUser: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  scope: CouponScope;
  /** Category or product ids when scope is not 'all'. */
  targetIds: string[];
  isActive: boolean;
}

export interface CouponLine {
  productId: string;
  categoryId: string;
  lineTotal: Paise;
}

export interface CouponContext {
  lines: readonly CouponLine[];
  subtotal: Paise;
  shippingTotal: Paise;
  now: Date;
  timesUsedTotal: number;
  timesUsedByUser: number;
}

export type CouponRejection =
  | 'inactive'
  | 'not_started'
  | 'expired'
  | 'below_minimum'
  | 'usage_limit_reached'
  | 'user_limit_reached'
  | 'not_applicable';

export interface CouponSuccess {
  ok: true;
  discount: Paise;
  freeShipping: boolean;
  /** Portion of the cart the discount actually applied to — useful for the UI. */
  eligibleSubtotal: Paise;
}

export interface CouponFailure {
  ok: false;
  reason: CouponRejection;
  message: string;
}

export type CouponResult = CouponSuccess | CouponFailure;

const REJECTION_MESSAGES: Record<CouponRejection, string> = {
  inactive: 'This coupon is no longer available.',
  not_started: 'This coupon is not active yet.',
  expired: 'This coupon has expired.',
  below_minimum: 'Your cart does not meet the minimum order value for this coupon.',
  usage_limit_reached: 'This coupon has reached its usage limit.',
  user_limit_reached: 'You have already used this coupon the maximum number of times.',
  not_applicable: 'This coupon does not apply to any item in your cart.',
};

function fail(reason: CouponRejection): CouponFailure {
  return { ok: false, reason, message: REJECTION_MESSAGES[reason] };
}

/**
 * Evaluate a coupon against a cart.
 *
 * Deliberately pure and total: it never throws and never reads the clock or the
 * database itself. Every input arrives in the context, which makes the whole
 * discount surface unit-testable and keeps the caller honest about re-checking
 * usage counts inside the checkout transaction.
 */
export function evaluateCoupon(coupon: Coupon, ctx: CouponContext): CouponResult {
  if (!coupon.isActive) return fail('inactive');
  if (coupon.startsAt && ctx.now < coupon.startsAt) return fail('not_started');
  if (coupon.endsAt && ctx.now > coupon.endsAt) return fail('expired');

  if (coupon.usageLimitTotal !== null && ctx.timesUsedTotal >= coupon.usageLimitTotal) {
    return fail('usage_limit_reached');
  }
  if (coupon.usageLimitPerUser !== null && ctx.timesUsedByUser >= coupon.usageLimitPerUser) {
    return fail('user_limit_reached');
  }

  // Minimum is tested against the whole cart, not just eligible lines — that is
  // what shoppers expect from "spend ₹50,000 to save".
  if (coupon.minOrderValue !== null && ctx.subtotal < coupon.minOrderValue) {
    return fail('below_minimum');
  }

  const eligibleLines = ctx.lines.filter((line) => isLineEligible(coupon, line));
  if (eligibleLines.length === 0) return fail('not_applicable');

  const eligibleSubtotal = eligibleLines.reduce((sum, line) => sum + line.lineTotal, 0);

  if (coupon.type === 'free_shipping') {
    return { ok: true, discount: 0, freeShipping: true, eligibleSubtotal };
  }

  let discount =
    coupon.type === 'percent' ? applyBps(eligibleSubtotal, coupon.value) : Math.min(coupon.value, eligibleSubtotal);

  if (coupon.maxDiscount !== null) discount = Math.min(discount, coupon.maxDiscount);

  // A discount must never exceed what it applies to, or we'd owe the customer money.
  discount = Math.max(0, Math.min(discount, eligibleSubtotal));

  return { ok: true, discount, freeShipping: false, eligibleSubtotal };
}

function isLineEligible(coupon: Coupon, line: CouponLine): boolean {
  switch (coupon.scope) {
    case 'all':
      return true;
    case 'category':
      return coupon.targetIds.includes(line.categoryId);
    case 'product':
      return coupon.targetIds.includes(line.productId);
    default:
      return false;
  }
}

/** Normalise user input: coupons are case-insensitive and whitespace-tolerant. */
export function normaliseCouponCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}
