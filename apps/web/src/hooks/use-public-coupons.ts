'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export interface PublicCouponRow {
  code: string;
  description: string | null;
  type: 'percent' | 'flat' | 'free_shipping';
  value: number;
  minOrderValue: number | null;
  maxDiscount: number | null;
  endsAt: string | null;
}

/**
 * The codes an admin has opted to publish (`isPublic` on the coupon), shared
 * by every place on the storefront that shows them — the homepage strip and
 * the cart's apply field — so there is one fetch to get right, not two.
 * `null` means "still loading", `[]` means "loaded, nothing to show".
 */
export function usePublicCoupons(): PublicCouponRow[] | null {
  const [coupons, setCoupons] = useState<PublicCouponRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<{ items: PublicCouponRow[] }>('/api/coupons/public')
      .then((result) => { if (!cancelled) setCoupons(result.items); })
      .catch(() => { if (!cancelled) setCoupons([]); });
    return () => { cancelled = true; };
  }, []);

  return coupons;
}
