'use client';

import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SearchBox } from '@/components/layout/search-box';
import { COLLECTION_LINKS } from '@/lib/collections';

/**
 * One search sheet for the whole storefront, opened from the header icon or the
 * phone tab bar. Same shape as SignInProvider: everything below can ask for the
 * one instance rather than mounting its own.
 */

interface SearchContextValue {
  openSearch: () => void;
  searchOpen: boolean;
}

const SearchContext = createContext<SearchContextValue | null>(null);


export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSearch = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ openSearch, searchOpen: open }), [openSearch, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, close]);

  return (
    <SearchContext.Provider value={value}>
      {children}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          className="fixed inset-0 z-[70] flex flex-col bg-canvas"
        >
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <div className="min-w-0 flex-1">
              <SearchBox variant="overlay" autoFocus onDone={close} />
            </div>
            <button
              type="button"
              onClick={close}
              className="cursor-pointer px-1 text-sm font-medium text-muted transition-colors hover:text-content"
            >
              Cancel
            </button>
          </div>

          {/* data-lenis-prevent: the smooth-scroll library otherwise swallows
              wheel and touch scrolling inside a fixed overlay. */}
          <div data-lenis-prevent className="flex-1 overflow-y-auto px-4 py-5">
            <p className="eyebrow">Browse</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {COLLECTION_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={close}
                    className="inline-flex rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-content transition-colors hover:border-crimson hover:text-crimson"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/shop"
              onClick={close}
              className="mt-5 inline-flex text-sm font-medium text-crimson hover:text-crimson-deep"
            >
              Shop all tables →
            </Link>
          </div>
        </div>
      )}
    </SearchContext.Provider>
  );
}

export function useSearch(): SearchContextValue {
  const context = useContext(SearchContext);
  if (!context) throw new Error('useSearch must be used inside <SearchProvider>');
  return context;
}
