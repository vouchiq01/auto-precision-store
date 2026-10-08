'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { formatINR, type Paginated, type ProductSummary } from '@aps/shared';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';

/**
 * Product search with live suggestions.
 *
 * A shop with eighteen tables in six collections still needs this: someone who
 * knows what they want ("round", "hydraulic", "portable") should reach it in
 * two keystrokes, not by working out which collection it lives in. Suggestions
 * come from the same `search` filter the listing page uses, so what the
 * dropdown promises is what pressing Enter shows.
 *
 * `bar` is the compact desktop field in the header (suggestions in a dropdown);
 * `overlay` is the full-width field on the phone search sheet (suggestions
 * inline underneath).
 */
export function SearchBox({
  variant, autoFocus = false, onDone,
}: { variant: 'bar' | 'overlay'; autoFocus?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const trimmed = query.trim();
  const searchable = trimmed.length >= 2;

  useEffect(() => {
    if (!searchable) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      apiFetch<Paginated<ProductSummary>>(
        `/api/catalog/products?search=${encodeURIComponent(trimmed)}&perPage=5`,
        { signal: controller.signal },
      )
        .then((page) => { setResults(page.items); setActive(-1); })
        .catch(() => { /* aborted by the next keystroke, or offline — keep what we had */ })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 220);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [trimmed, searchable]);

  /* Close the dropdown on an outside click. */
  useEffect(() => {
    if (variant !== 'bar' || !open) return;
    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [variant, open]);

  function go(href: string) {
    setOpen(false);
    onDone?.();
    router.push(href);
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const picked = active >= 0 ? results[active] : undefined;
    if (picked) go(`/products/${picked.slug}`);
    else if (trimmed) go(`/shop?search=${encodeURIComponent(trimmed)}`);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') { setOpen(false); return; }
    if (!results.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => (i + 1) % results.length); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => (i <= 0 ? results.length - 1 : i - 1)); }
  }

  const showPanel = searchable && (variant === 'overlay' || open);
  const isBar = variant === 'bar';

  return (
    <div ref={wrapRef} className={cn('relative', isBar ? 'group w-full' : 'w-full')}>
      <form role="search" onSubmit={onSubmit} className="relative">
        <label className="sr-only" htmlFor={`${listId}-input`}>Search the store</label>
        <svg
          viewBox="0 0 20 20"
          className={cn(
            'pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2',
            'text-faint',
          )}
          fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"
        >
          <circle cx="9" cy="9" r="5.5" />
          <path d="M13.5 13.5L17 17" strokeLinecap="round" />
        </svg>
        <input
          id={`${listId}-input`}
          type="search"
          value={query}
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Search tables, tubs, accessories…"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            'w-full rounded-full pl-11 pr-4 text-sm outline-none transition-colors',
            '[&::-webkit-search-cancel-button]:hidden',
            isBar
              ? 'h-10 border border-line bg-sand text-content placeholder:text-faint focus:border-line-strong focus:bg-surface'
              : 'h-12 border border-line bg-surface text-base text-content placeholder:text-faint focus:border-line-strong',
          )}
        />
      </form>

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          className={cn(
            'overflow-hidden bg-surface text-content',
            isBar
              ? 'absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-line shadow-lift'
              : 'mt-3 rounded-2xl border border-line',
          )}
        >
          {results.map((product, index) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              role="option"
              aria-selected={index === active}
              onClick={() => { setOpen(false); onDone?.(); }}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 transition-colors',
                index === active ? 'bg-sand' : 'hover:bg-sand',
              )}
            >
              <span className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-line bg-white">
                {product.primaryImage && (
                  <Image src={product.primaryImage.url} alt="" fill sizes="48px" className="object-contain p-1" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-content">{product.name}</span>
                <span className="block truncate text-xs text-muted">{product.category.name}</span>
              </span>
              <span className="numeric shrink-0 text-sm font-semibold text-content">{formatINR(product.price)}</span>
            </Link>
          ))}

          {!loading && results.length === 0 && (
            <p className="px-4 py-4 text-sm text-muted">
              No tables match “{trimmed}”. Try “electric”, “round” or “portable”.
            </p>
          )}

          {results.length > 0 && (
            <Link
              href={`/shop?search=${encodeURIComponent(trimmed)}`}
              onClick={() => { setOpen(false); onDone?.(); }}
              className="block border-t border-line px-4 py-3 text-sm font-medium text-crimson transition-colors hover:bg-sand"
            >
              See all results for “{trimmed}” →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
