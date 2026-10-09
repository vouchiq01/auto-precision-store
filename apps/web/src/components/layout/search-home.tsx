'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatINR, type Paginated, type ProductSummary } from '@aps/shared';
import { apiFetch } from '@/lib/api';
import { COLLECTION_LINKS } from '@/lib/collections';
import {
  clearSearches, forgetSearch, getRecentSearches, getRecentlyViewed, type ViewedProduct,
} from '@/lib/recent';

/**
 * What the phone search sheet shows before anything is typed: the shopper's own
 * recent searches, the collections as photo tiles, the products people buy most
 * ("Popular picks" — the same featured list as the homepage), and what they
 * looked at last. Each part hides itself when it has nothing honest to show, so
 * a first-time visitor sees collections and popular picks and nothing empty.
 */
export function SearchHome({ onPick, onNavigate }: { onPick: (term: string) => void; onNavigate: () => void }) {
  const [recent, setRecent] = useState<string[]>([]);
  const [viewed, setViewed] = useState<ViewedProduct[]>([]);
  const [popular, setPopular] = useState<ProductSummary[]>([]);

  useEffect(() => {
    setRecent(getRecentSearches());
    setViewed(getRecentlyViewed());
    const controller = new AbortController();
    apiFetch<Paginated<ProductSummary>>('/api/catalog/products?featured=true&perPage=6', { signal: controller.signal })
      .then((page) => setPopular(page.items))
      .catch(() => { /* offline or aborted — the section just stays hidden */ });
    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-7">
      {recent.length > 0 && (
        <section aria-labelledby="recent-searches">
          <div className="flex items-center justify-between">
            <h2 id="recent-searches" className="eyebrow">Recent searches</h2>
            <button type="button" onClick={() => { clearSearches(); setRecent([]); }} className="cursor-pointer text-xs font-medium text-crimson hover:text-crimson-deep">
              Clear
            </button>
          </div>
          <ul className="mt-2 divide-y divide-line">
            {recent.map((term) => (
              <li key={term} className="flex items-center">
                <button type="button" onClick={() => onPick(term)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-3 text-left text-sm text-content">
                  <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-faint" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                    <circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 1.5" />
                  </svg>
                  <span className="truncate">{term}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${term} from recent searches`}
                  onClick={() => { forgetSearch(term); setRecent(getRecentSearches()); }}
                  className="grid size-9 shrink-0 cursor-pointer place-items-center text-faint hover:text-content"
                >
                  <span aria-hidden="true">✕</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="search-collections">
        <h2 id="search-collections" className="eyebrow">Shop by collection</h2>
        <ul className="mt-3 grid grid-cols-4 gap-x-2 gap-y-4">
          {COLLECTION_LINKS.map((link) => {
            const slug = link.href.split('/').pop();
            return (
              <li key={link.href}>
                <Link href={link.href} onClick={onNavigate} className="group flex flex-col items-center gap-1.5 text-center">
                  <span className="relative size-[4.25rem] overflow-hidden rounded-full border border-line bg-white ring-2 ring-transparent transition-shadow group-hover:ring-crimson/40">
                    <Image src={`/categories/${slug}.jpg`} alt="" fill sizes="68px" className="object-cover" />
                  </span>
                  <span className="text-[0.6875rem] font-medium leading-tight text-content">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {popular.length > 0 && (
        <section aria-labelledby="search-popular">
          <h2 id="search-popular" className="eyebrow">Popular picks</h2>
          <ul className="mt-3 flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {popular.map((product) => (
              <li key={product.id} className="w-32 shrink-0 snap-start">
                <Link href={`/products/${product.slug}`} onClick={onNavigate} className="block">
                  <span className="relative block aspect-square overflow-hidden rounded-xl border border-line bg-white">
                    {product.primaryImage && <Image src={product.primaryImage.url} alt="" fill sizes="128px" className="object-contain p-2" />}
                  </span>
                  <span className="mt-1.5 line-clamp-2 block text-xs font-medium leading-snug text-content">{product.name}</span>
                  <span className="numeric mt-0.5 block text-xs font-semibold text-content">{formatINR(product.price)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {viewed.length > 0 && (
        <section aria-labelledby="search-viewed">
          <h2 id="search-viewed" className="eyebrow">Recently viewed</h2>
          <ul className="mt-3 flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {viewed.map((product) => (
              <li key={product.slug} className="w-32 shrink-0 snap-start">
                <Link href={`/products/${product.slug}`} onClick={onNavigate} className="block">
                  <span className="relative block aspect-square overflow-hidden rounded-xl border border-line bg-white">
                    {product.image && <Image src={product.image} alt="" fill sizes="128px" className="object-contain p-2" />}
                  </span>
                  <span className="mt-1.5 line-clamp-2 block text-xs font-medium leading-snug text-content">{product.name}</span>
                  <span className="numeric mt-0.5 block text-xs font-semibold text-content">{formatINR(product.price)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href="/shop" onClick={onNavigate} className="inline-flex text-sm font-medium text-crimson hover:text-crimson-deep">
        Shop all products →
      </Link>
    </div>
  );
}
