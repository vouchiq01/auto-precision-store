'use client';

import { useState } from 'react';
import { usePublicCoupons, type PublicCouponRow } from '@/hooks/use-public-coupons';
import { couponStub, couponTerms } from '@/lib/coupon-display';

/**
 * The codes the admin has opted to publish (`isPublic` on the coupon), listed as
 * small tickets so a shopper does not need to already know a code to benefit from
 * one. Tapping a ticket copies the code and drops it into the field above — it
 * does NOT apply itself, so nothing changes the order total until the shopper
 * presses Apply.
 */
export function AvailableCoupons({ onPick }: { onPick: (code: string) => void }) {
  const coupons = usePublicCoupons();
  const [copied, setCopied] = useState<string | null>(null);

  if (!coupons || coupons.length === 0) return null;

  async function pick(coupon: PublicCouponRow) {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(coupon.code);
      setTimeout(() => setCopied((current) => (current === coupon.code ? null : current)), 1500);
    } catch {
      /* Clipboard can be denied (permissions, non-secure context) — the code
         still lands in the field, so the shopper can copy it manually. */
    }
    onPick(coupon.code);
  }

  return (
    <div className="mt-4">
      <p className="mb-2 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-faint">Offers for you</p>
      <ul className="space-y-2">
        {coupons.map((coupon) => {
          const { big, small } = couponStub(coupon);
          const done = copied === coupon.code;
          return (
            <li key={coupon.code}>
              <button
                type="button"
                onClick={() => void pick(coupon)}
                aria-label={`Use code ${coupon.code}: ${big} ${small}. ${couponTerms(coupon)}`}
                className="group flex w-full cursor-pointer overflow-hidden rounded-xl bg-surface text-left ring-1 ring-line transition-shadow hover:shadow-card hover:ring-crimson/40"
              >
                <span className="flex w-[4.5rem] shrink-0 flex-col items-center justify-center bg-gradient-to-br from-crimson to-crimson-deep px-2 py-2.5 text-white">
                  <span className="numeric text-base font-bold leading-none tracking-[-0.02em]">{big}</span>
                  <span className="mt-1 text-[0.5625rem] font-semibold tracking-[0.18em]">{small}</span>
                </span>
                <span aria-hidden="true" className="w-0 border-l border-dashed border-line-strong" />
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0">
                    <span className="numeric block truncate text-sm font-semibold tracking-[0.04em] text-content">{coupon.code}</span>
                    <span className="block truncate text-[0.6875rem] text-muted">{couponTerms(coupon)}</span>
                  </span>
                  <span className={`shrink-0 text-xs font-semibold ${done ? 'text-success' : 'text-crimson group-hover:text-crimson-deep'}`}>
                    {done ? 'Copied ✓' : 'Use'}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
