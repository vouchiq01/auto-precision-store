'use client';

import { useEffect, useState } from 'react';
import type { Paginated, ProductSummary } from '@aps/shared';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { useSignIn } from '@/providers/sign-in-provider';
import { useWishlist } from '@/providers/wishlist-provider';
import { ListingHero } from '@/components/collection/listing-hero';
import { ProductCard } from './product-card';
import { Button, ButtonLink } from '@/components/ui/button';
import { Spinner } from '@/components/ui/primitives';

/** The saved products, as the same cards used everywhere else. */
export function WishlistView() {
  const { user, loading: authLoading } = useAuth();
  const { openSignIn } = useSignIn();
  const { ids } = useWishlist();
  const [products, setProducts] = useState<ProductSummary[] | null>(null);

  const key = [...ids].sort().join(',');
  useEffect(() => {
    if (!user) { setProducts(null); return; }
    if (key === '') { setProducts([]); return; }
    let cancelled = false;
    apiFetch<Paginated<ProductSummary>>(`/api/catalog/products?ids=${key}&perPage=48`)
      .then((page) => { if (!cancelled) setProducts(page.items); })
      .catch(() => { if (!cancelled) setProducts([]); });
    return () => { cancelled = true; };
  }, [user, key]);

  /* Hearting a card off removes it from this page straight away. */
  const shown = (products ?? []).filter((product) => ids.has(product.id));

  if (authLoading) {
    return <div className="shell grid min-h-[60vh] place-items-center pt-28"><Spinner className="text-muted" /></div>;
  }

  if (!user) {
    return (
      <>
        <ListingHero crumb="Wishlist" title="Your wishlist" />
        <div className="shell py-12 md:py-16">
          <div className="mx-auto max-w-md rounded-3xl border border-line bg-surface px-6 py-10 text-center shadow-card">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-crimson-tint text-crimson">
              <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.9a4.4 4.4 0 0 1 7.5 2.5c0 5.5-7.5 10.1-7.5 10.1z" />
              </svg>
            </span>
            <h2 className="mt-5 font-display text-2xl font-semibold tracking-[-0.02em] text-content">Sign in to see your wishlist</h2>
            <p className="mt-2 text-sm text-muted">Save the tables you like and find them on any phone or laptop.</p>
            <Button size="lg" onClick={openSignIn} className="mt-6 w-full">Sign in</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ListingHero crumb="Wishlist" title="Your wishlist" count={products === null ? undefined : shown.length} unit="item" />
      <div className="shell pb-14 pt-6 md:pt-8">
        {products === null ? (
          <div className="grid min-h-[30vh] place-items-center"><Spinner className="text-muted" /></div>
        ) : shown.length === 0 ? (
          <div className="mx-auto max-w-md rounded-3xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
            <p className="font-display text-xl font-semibold text-content">Nothing saved yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted">Tap the heart on any product and it will be waiting for you here.</p>
            <ButtonLink href="/shop" className="mt-5">Shop all products</ButtonLink>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((product) => <li key={product.id}><ProductCard product={product} /></li>)}
          </ul>
        )}
      </div>
    </>
  );
}
