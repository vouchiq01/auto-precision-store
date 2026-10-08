import { formatINR } from '@aps/shared';
import type { PublicCouponRow } from '@/hooks/use-public-coupons';

/** What goes on a coupon's red stub: the saving, big, with a small word under it. */
export function couponStub(coupon: PublicCouponRow): { big: string; small: string } {
  if (coupon.type === 'percent') return { big: `${coupon.value / 100}%`, small: 'OFF' };
  if (coupon.type === 'flat') return { big: formatINR(coupon.value), small: 'OFF' };
  return { big: 'FREE', small: 'FREIGHT' };
}

/** One honest line of terms, built only from fields the coupon really has. */
export function couponTerms(coupon: PublicCouponRow): string {
  const parts: string[] = [];
  parts.push(coupon.minOrderValue ? `On orders above ${formatINR(coupon.minOrderValue)}` : 'On any order');
  if (coupon.type === 'percent' && coupon.maxDiscount) parts.push(`up to ${formatINR(coupon.maxDiscount)} off`);
  return parts.join(' · ');
}
