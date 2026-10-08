'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
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

const pill = 'inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-4 text-[0.8125rem] font-medium transition-colors duration-200';
const pillIdle = 'border-line bg-surface text-content hover:border-line-strong';
const pillOn = 'border-ink bg-ink text-on-ink';

/**
 * One quiet toolbar: Price, In stock, and Sort.
 *
 * There is deliberately no search box here. The header already has one that
 * searches the whole catalogue; a second field on the page did the same job
 * and read as clutter. When a search is active it appears as a tag that can be
 * dismissed, so there is always a way back to the full list.
 *
 * Filters live in the URL, not component state. That makes a filtered view
 * shareable, bookmarkable and survivable across a back button — and lets the
 * page stay a server component that simply reads searchParams.
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
    const query = next.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }, [router, pathname, searchParams]);

  const urlSearch = searchParams.get('search') ?? '';
  const activeSort = searchParams.get('sort') ?? 'featured';
  const activeMin = searchParams.get('minPrice');
  const activeMax = searchParams.get('maxPrice');
  const inStockOnly = searchParams.get('inStock') === 'true';

  const activeBand = PRICE_BANDS.find(
    (band) => String(band.min ?? '') === (activeMin ?? '') && String(band.max ?? '') === (activeMax ?? ''),
  );
  const priceActive = Boolean(activeMin || activeMax);
  const hasFilters = priceActive || inStockOnly || Boolean(urlSearch);
  const sortLabel = SORTS.find((sort) => sort.value === activeSort)?.label ?? 'Featured';

  return (
    <div
      className={cn(
        /* Sticky under the header (64px on a phone, 108px on a desktop where it
           carries a second row), so the toolbar stays in reach while the grid
           scrolls. Opaque, or the products show through it. */
        'sticky top-16 z-30 -mx-4 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur-md transition-opacity',
        'md:-mx-10 md:px-10 lg:top-[6.75rem] xl:-mx-16 xl:px-16',
        pending && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-2">
        <Menu
          label={activeBand?.label ?? (priceActive ? 'Custom price' : 'Price')}
          active={priceActive}
          title="Filter by price"
        >
          {(close) => (
            <>
              <MenuOption
                selected={!priceActive}
                onClick={() => { setParams({ minPrice: undefined, maxPrice: undefined }); close(); }}
              >
                Any price
              </MenuOption>
              {PRICE_BANDS.map((band) => (
                <MenuOption
                  key={band.label}
                  selected={activeBand === band}
                  onClick={() => { setParams({ minPrice: band.min?.toString(), maxPrice: band.max?.toString() }); close(); }}
                >
                  {band.label}
                </MenuOption>
              ))}
            </>
          )}
        </Menu>

        <button
          type="button"
          aria-pressed={inStockOnly}
          onClick={() => setParams({ inStock: inStockOnly ? undefined : 'true' })}
          className={cn(pill, inStockOnly ? pillOn : pillIdle)}
        >
          {inStockOnly && <CheckIcon />}
          In stock
        </button>

        {urlSearch && (
          <button
            type="button"
            onClick={() => setParams({ search: undefined })}
            aria-label={`Clear search for ${urlSearch}`}
            className={cn(pill, pillOn, 'max-w-[11rem]')}
          >
            <span className="truncate">“{urlSearch}”</span>
            <span aria-hidden="true">✕</span>
          </button>
        )}

        {hasFilters && (
          <button
            type="button"
            onClick={() => setParams({ minPrice: undefined, maxPrice: undefined, inStock: undefined, search: undefined })}
            className="hidden shrink-0 cursor-pointer px-2 text-[0.8125rem] font-medium text-crimson transition-colors hover:text-crimson-deep sm:block"
          >
            Clear all
          </button>
        )}

        <div className="ml-auto flex items-center gap-3">
          {hasFilters && (
            <p className="numeric hidden text-[0.8125rem] text-muted sm:block" aria-live="polite">
              {total} {total === 1 ? 'result' : 'results'}
            </p>
          )}
          <Menu label={`Sort: ${sortLabel}`} align="right" title="Sort products">
            {(close) => SORTS.map((sort) => (
              <MenuOption
                key={sort.value}
                selected={activeSort === sort.value}
                onClick={() => { setParams({ sort: sort.value === 'featured' ? undefined : sort.value }); close(); }}
              >
                {sort.label}
              </MenuOption>
            ))}
          </Menu>
        </div>
      </div>
    </div>
  );
}

/** A pill that opens a small menu of choices. Closes on Escape or an outside click. */
function Menu({
  label, active = false, align = 'left', title, children,
}: {
  label: string;
  active?: boolean;
  align?: 'left' | 'right';
  title: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={title}
        onClick={() => setOpen((value) => !value)}
        className={cn(pill, active ? pillOn : pillIdle)}
      >
        {label}
        <svg viewBox="0 0 12 12" className={cn('size-3 transition-transform duration-200', open && 'rotate-180')} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.5 4.5L6 8l3.5-3.5" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={title}
          className={cn(
            'absolute top-full z-40 mt-2 min-w-[14.5rem] rounded-2xl bg-surface p-1.5 shadow-lift ring-1 ring-line',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function MenuOption({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        'flex w-full cursor-pointer items-center justify-between gap-6 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-sand',
        selected ? 'font-medium text-content' : 'text-muted',
      )}
    >
      {children}
      {selected && <span className="text-crimson"><CheckIcon /></span>}
    </button>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
