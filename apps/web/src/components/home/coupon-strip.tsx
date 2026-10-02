'use client';

import { useState } from 'react';
import { formatINR } from '@aps/shared';
import { usePublicCoupons, type PublicCouponRow } from '@/hooks/use-public-coupons';
import { Eyebrow } from '@/components/ui/primitives';

function describe(coupon: PublicCouponRow): string {
  if (coupon.type === 'percent') return `${coupon.value / 100}% off`;
  if (coupon.type === 'flat') return `${formatINR(coupon.value)} off`;
  return 'Free shipping';
}

/**
 * Whatever codes the admin has opted to publish, sized to actually be seen —
 * the first pass read as a thin grey hairline and nobody would have noticed
 * it had a coupon in it. Renders nothing when there is nothing to show, so an
 * ordinary day with no live offer leaves no empty card on the page.
 *
 * Tapping a code copies it to the clipboard; it does not add anything to a
 * cart, because there may not be one yet on this page.
 */
export function CouponStrip() {
  const coupons = usePublicCoupons();
  const [copied, setCopied] = useState<string | null>(null);

  if (!coupons || coupons.length === 0) return null;

  async function copy(coupon: PublicCouponRow) {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(coupon.code);
      setTimeout(() => setCopied((current) => (current === coupon.code ? null : current)), 1600);
    } catch {
      /* Clipboard can be denied — the code is still printed on the ticket. */
    }
  }

  return (
    <section className="shell py-10 md:py-14">
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-card md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Offers</Eyebrow>
            <h2 className="mt-2 font-display text-[1.5rem] font-semibold leading-tight tracking-[-0.02em] text-content md:text-[1.75rem]">
              Live right now — copy a code below.
            </h2>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.map((coupon) => (
            <button
              key={coupon.code}
              type="button"
              onClick={() => void copy(coupon)}
              className="group flex items-center justify-between gap-3 rounded-xl border border-dashed border-line-strong bg-sand px-5 py-4 text-left transition-colors hover:border-crimson hover:bg-crimson-tint"
            >
              <span className="min-w-0">
                <span className="numeric block text-lg font-semibold tracking-[-0.01em] text-content group-hover:text-crimson-deep">
                  {coupon.code}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {describe(coupon)}
                  {coupon.minOrderValue ? ` · min ${formatINR(coupon.minOrderValue)}` : ''}
                </span>
              </span>
              <span
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  copied === coupon.code
                    ? 'bg-success/15 text-success'
                    : 'bg-surface text-muted group-hover:bg-crimson group-hover:text-white'
                }`}
              >
                {copied === coupon.code ? 'Copied ✓' : 'Copy'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
