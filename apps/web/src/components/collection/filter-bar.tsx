'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
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

  const activeSort = searchParams.get('sort') ?? 'featured';
  const activeMin = searchParams.get('minPrice');
  const activeMax = searchParams.get('maxPrice');
  const inStockOnly = searchParams.get('inStock') === 'true';
  const hasFilters = Boolean(activeMin || activeMax || inStockOnly);

  return (
    <div className={cn('rule flex flex-wrap items-center gap-3 py-5 transition-opacity', pending && 'opacity-50')}>
      <p className="numeric mr-auto text-sm text-muted">
        {total} {total === 1 ? 'table' : 'tables'}
      </p>

      <div className="flex flex-wrap gap-2">
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
                'rounded-full border px-3.5 py-1.5 text-xs transition-colors duration-300',
                active ? 'border-line-strong bg-surface text-content' : 'border-line text-muted hover:border-muted',
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
            'rounded-full border px-3.5 py-1.5 text-xs transition-colors duration-300',
            inStockOnly ? 'border-line-strong bg-surface text-content' : 'border-line text-muted hover:border-muted',
          )}
        >
          In stock
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={() => setParams({ minPrice: undefined, maxPrice: undefined, inStock: undefined })}
            className="rounded-full px-3.5 py-1.5 text-xs text-crimson transition-colors hover:text-crimson"
          >
            Clear
          </button>
        )}
      </div>

      <label className="flex items-center gap-2">
        <span className="sr-only">Sort by</span>
        <select
          value={activeSort}
          onChange={(event) => setParams({ sort: event.target.value })}
          className="h-9 rounded-full border border-line bg-canvas px-3.5 text-xs text-content outline-none focus:border-line-strong"
        >
          {SORTS.map((sort) => (
            <option key={sort.value} value={sort.value}>{sort.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
