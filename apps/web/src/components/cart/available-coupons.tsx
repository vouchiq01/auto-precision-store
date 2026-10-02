'use client';

import { useEffect, useState } from 'react';
import { formatINR } from '@aps/shared';
import { apiFetch } from '@/lib/api';

interface PublicCouponRow {
  code: string;
  description: string | null;
  type: 'percent' | 'flat' | 'free_shipping';
  value: number;
  minOrderValue: number | null;
  maxDiscount: number | null;
  endsAt: string | null;
}

function describe(coupon: PublicCouponRow): string {
  if (coupon.type === 'percent') return `${coupon.value / 100}% off`;
  if (coupon.type === 'flat') return `${formatINR(coupon.value)} off`;
  return 'Free shipping';
}

/**
 * The codes the admin has opted to publish (`isPublic` on the coupon), shown
 * above the apply field so a shopper does not need to already know a code to
 * benefit from one. Clicking a chip copies it and drops it into the input —
 * it does not apply itself, so nothing is added to the order total without
 * the shopper choosing to hit "Apply" themselves.
 */
export function AvailableCoupons({ onPick }: { onPick: (code: string) => void }) {
  const [coupons, setCoupons] = useState<PublicCouponRow[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<{ items: PublicCouponRow[] }>('/api/coupons/public')
      .then((result) => { if (!cancelled) setCoupons(result.items); })
      .catch(() => { if (!cancelled) setCoupons([]); });
    return () => { cancelled = true; };
  }, []);

  if (!coupons || coupons.length === 0) return null;

  async function pick(coupon: PublicCouponRow) {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(coupon.code);
      setTimeout(() => setCopied((current) => (current === coupon.code ? null : current)), 1500);
    } catch {
      /* Clipboard can be denied (permissions, non-secure context) — the code
         still lands in the input below, so the shopper can copy it manually. */
    }
    onPick(coupon.code);
  }

  return (
    <div className="mb-4">
      <p className="mb-2 text-xs text-faint">Available codes — tap to copy</p>
      <div className="flex flex-wrap gap-2">
        {coupons.map((coupon) => (
          <button
            key={coupon.code}
            type="button"
            onClick={() => void pick(coupon)}
            className="group rounded-full border border-dashed border-line-strong bg-sand px-3 py-1.5 text-left text-xs transition-colors hover:border-crimson"
          >
            <span className="numeric font-medium text-content group-hover:text-crimson">
              {copied === coupon.code ? 'Copied ✓' : coupon.code}
            </span>
            <span className="ml-1.5 text-faint">
              {describe(coupon)}
              {coupon.minOrderValue ? ` · min ${formatINR(coupon.minOrderValue)}` : ''}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
