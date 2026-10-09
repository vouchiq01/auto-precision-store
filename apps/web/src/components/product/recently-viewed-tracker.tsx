'use client';

import { useEffect } from 'react';
import { rememberViewed } from '@/lib/recent';

/** Renders nothing; notes this product in the browser's "recently viewed" list. */
export function RecentlyViewedTracker({ slug, name, price, image }: { slug: string; name: string; price: number; image: string | null }) {
  useEffect(() => {
    rememberViewed({ slug, name, price, image });
  }, [slug, name, price, image]);
  return null;
}
