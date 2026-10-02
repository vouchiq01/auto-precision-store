'use client';

import { useState } from 'react';
import { formatINR } from '@aps/shared';
import { usePublicCoupons, type PublicCouponRow } from '@/hooks/use-public-coupons';

function describe(coupon: PublicCouponRow): string {
  if (coupon.type === 'percent') return `${coupon.value / 100}% off`;
  if (coupon.type === 'flat') return `${formatINR(coupon.value)} off`;
  return 'Free shipping';
}

/**
 * A thin strip of whatever codes the admin has opted to publish — same
 * practical-information register as the Marquee just above it (freight,
 * warranty, EMI), not a sales pitch. Renders nothing when there is nothing to
 * show, so an ordinary day with no live offer leaves no empty bar on the page.
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
      setTimeout(() => setCopied((current) => (current === coupon.code ? null : current)), 1500);
    } catch {
      /* Clipboard can be denied — the code is still printed on the chip. */
    }
  }

  return (
    <div className="rule border-b border-line bg-sand/60 py-4">
      <div className="shell flex flex-wrap items-center gap-x-3 gap-y-2.5">
        <span className="shrink-0 text-[0.8125rem] text-muted">Use at checkout —</span>
        <div className="flex flex-wrap gap-2">
          {coupons.map((coupon) => (
            <button
              key={coupon.code}
              type="button"
              onClick={() => void copy(coupon)}
              className="group inline-flex items-center gap-1.5 rounded-full border border-dashed border-line-strong bg-surface px-3 py-1 text-left text-[0.8125rem] transition-colors hover:border-crimson"
            >
              <span className="numeric font-medium text-content group-hover:text-crimson">
                {copied === coupon.code ? 'Copied ✓' : coupon.code}
              </span>
              <span className="text-faint">
                {describe(coupon)}
                {coupon.minOrderValue ? ` · min ${formatINR(coupon.minOrderValue)}` : ''}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
