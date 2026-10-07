'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { cn } from '@/lib/cn';

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price, low to high' },
  { value: 'price_desc', label: 'Price, high to low' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name' },
] as const;

const PRICE_BANDS = [
  { label: 'Under ₹15,000', min: undefined, max: 1_500_000 },
  { label: '₹15,000 – ₹50,000', min: 1_500_000, max: 5_000_000 },
  { label: '₹50,000 – ₹1,00,000', min: 5_000_000, max: 10_000_000 },
  { label: 'Over ₹1,00,000', min: 10_000_000, max: undefined },
] as const;

/**
 * Filters live in the URL, not component state.
 *
 * That makes a filtered view shareable, bookmarkable and survivable across a
 * back button — and lets the page stay a server component that simply reads
 * searchParams.
 */
export function FilterBar({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setParams = useCallback((updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, value);
    }
    // Any filter change resets pagination; page 3 of the old result set is
    // meaningless against the new one.
    next.delete('page');
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }, [router, pathname, searchParams]);

  const urlSearch = searchParams.get('search') ?? '';
  const [searchText, setSearchText] = useState(urlSearch);

  /* Keep the field in step with the URL (back button, "Clear"), and push what
     is typed into the URL after a pause so each keystroke is not a navigation. */
  useEffect(() => { setSearchText(urlSearch); }, [urlSearch]);
  useEffect(() => {
    if (searchText.trim() === urlSearch) return;
    const timer = setTimeout(() => setParams({ search: searchText.trim() || undefined }), 350);
    return () => clearTimeout(timer);
  }, [searchText, urlSearch, setParams]);

  const activeSort = searchParams.get('sort') ?? 'featured';
  const activeMin = searchParams.get('minPrice');
  const activeMax = searchParams.get('maxPrice');
  const inStockOnly = searchParams.get('inStock') === 'true';
  const hasFilters = Boolean(activeMin || activeMax || inStockOnly || urlSearch);

  return (
    <div
      className={cn(
        /* Sticky under the header (64px on a phone, 108px on a desktop where it
           carries a second row), so search and filters stay in reach while the
           grid scrolls. Opaque, or the products show through it. */
        'sticky top-16 z-30 -mx-4 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur-md transition-opacity',
        'md:-mx-10 md:px-10 lg:top-[6.75rem] xl:-mx-16 xl:px-16',
        pending && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-2.5 md:gap-3">
        <form role="search" onSubmit={(event) => event.preventDefault()} className="relative min-w-0 flex-1 md:max-w-md">
          <label className="sr-only" htmlFor="listing-search">Search products</label>
          <svg viewBox="0 0 20 20" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="9" cy="9" r="5.5" />
            <path d="M13.5 13.5L17 17" strokeLinecap="round" />
          </svg>
          <input
            id="listing-search"
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search products…"
            autoComplete="off"
            className="h-10 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-sm text-content outline-none transition-colors placeholder:text-faint focus:border-line-strong [&::-webkit-search-cancel-button]:hidden"
          />
        </form>

        <label className="flex items-center gap-2">
          <span className="sr-only">Sort by</span>
          <select
            value={activeSort}
            onChange={(event) => setParams({ sort: event.target.value })}
            className="h-10 cursor-pointer rounded-full border border-line bg-surface px-3.5 text-sm text-content outline-none focus:border-line-strong"
          >
            {SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>{sort.label}</option>
            ))}
          </select>
        </label>

        <p className="numeric ml-auto hidden text-sm text-muted md:block">
          {total} {total === 1 ? 'product' : 'products'}
        </p>
      </div>

      {/* On a phone the chips are one swipeable row under the count and sort
          (they wrapped onto three lines before); the negative margin lets the
          row run edge to edge so the cut-off chip says "there is more". */}
      <div className="-mx-4 mt-2.5 flex items-center gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
        <span className="numeric shrink-0 pr-1 text-xs text-muted md:hidden">
          {total} {total === 1 ? 'product' : 'products'}
        </span>
        {PRICE_BANDS.map((band) => {
          const active = String(band.min ?? '') === (activeMin ?? '') && String(band.max ?? '') === (activeMax ?? '');
          return (
            <button
              key={band.label}
              type="button"
              aria-pressed={active}
              onClick={() => setParams({
                minPrice: active ? undefined : band.min?.toString(),
                maxPrice: active ? undefined : band.max?.toString(),
              })}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs transition-colors duration-300',
                active ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-muted hover:border-line-strong hover:text-content',
              )}
            >
              {band.label}
            </button>
          );
        })}

        <button
          type="button"
          aria-pressed={inStockOnly}
          onClick={() => setParams({ inStock: inStockOnly ? undefined : 'true' })}
          className={cn(
            'shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs transition-colors duration-300',
            inStockOnly ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-muted hover:border-line-strong hover:text-content',
          )}
        >
          In stock
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={() => setParams({ minPrice: undefined, maxPrice: undefined, inStock: undefined, search: undefined })}
            className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs text-crimson transition-colors hover:text-crimson"
          >
            Clear
          </button>
        )}
      </div>

    </div>
  );
}
