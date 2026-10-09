'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/providers/auth-provider';
import { useCart } from '@/providers/cart-provider';
import { useSearch } from '@/providers/search-provider';
import { useWishlist } from '@/providers/wishlist-provider';
import { Logo } from './logo';
import { SearchBox } from './search-box';

const NAV = [
  { href: '/collections/electric-lifting', label: 'Electric' },
  { href: '/collections/hydraulic', label: 'Hydraulic' },
  { href: '/collections/round-rotating', label: 'Round' },
  { href: '/collections/portable', label: 'Portable' },
  { href: '/collections/foldable', label: 'Foldable' },
  { href: '/collections/fixed-tables', label: 'Fixed' },
  { href: '/collections/bath-tubs', label: 'Tubs' },
  { href: '/collections/combos', label: 'Combos' },
  { href: '/collections/cages', label: 'Cages' },
  { href: '/collections/accessories', label: 'Accessories' },
];

/**
 * Two rows on a desktop: the brand, a search field and the account/cart
 * controls on top; the collections underneath. On a phone it is one slim row —
 * logo, search, cart, menu — and the bottom tab bar carries the rest.
 *
 * The collections used to be the only way into the catalogue and search did not
 * exist; a visitor who knew they wanted "round" had to guess which link it hid
 * behind. Search is now the centrepiece of the bar.
 */
export function Header({ onSignIn }: { onSignIn: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const { cart, pendingAdds, open: openCart } = useCart();
  const { openSearch } = useSearch();
  const { count: wishlistCount } = useWishlist();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // A drawer that scrolls the page behind it is disorienting.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const itemCount = (cart?.itemCount ?? 0) + pendingAdds;

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-crimson focus:px-5 focus:py-2.5 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 text-content transition-[background-color,border-color,box-shadow] duration-300',
          scrolled ? 'border-b border-line bg-surface/90 shadow-card backdrop-blur-xl' : 'border-b border-line bg-surface',
        )}
      >
        {/* ---- Row 1: brand, search, account, cart ------------------- */}
        <div className="shell flex h-16 items-center gap-3 lg:gap-8">
          <Link href="/" aria-label="Auto Precision — home" className="shrink-0 transition-opacity hover:opacity-80">
            <Logo className="h-8 lg:h-10" priority />
          </Link>

          <div className="mx-auto hidden w-full max-w-xl lg:block">
            <SearchBox variant="bar" />
          </div>

          <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
            <button
              type="button"
              onClick={openSearch}
              aria-label="Search"
              className="grid size-10 cursor-pointer place-items-center rounded-full border border-line text-content transition-colors hover:border-line-strong hover:bg-sand lg:hidden"
            >
              <svg viewBox="0 0 20 20" className="size-[1.125rem]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <circle cx="9" cy="9" r="5.5" />
                <path d="M13.5 13.5L17 17" strokeLinecap="round" />
              </svg>
            </button>

            <Link
              href="/wishlist"
              aria-label={`Wishlist${wishlistCount ? `, ${wishlistCount} saved` : ''}`}
              className="relative hidden size-10 shrink-0 place-items-center rounded-full border border-line text-content transition-colors hover:border-line-strong hover:bg-sand lg:grid"
            >
              <svg viewBox="0 0 24 24" className="size-[1.125rem]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.9a4.4 4.4 0 0 1 7.5 2.5c0 5.5-7.5 10.1-7.5 10.1z" />
              </svg>
              {wishlistCount > 0 && (
                <span className="numeric absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-crimson px-1 text-[0.625rem] font-semibold leading-4 text-white">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {user ? (
              <Link
                href="/account"
                className="hidden rounded-full px-4 py-2 text-[0.8125rem] text-muted transition-colors hover:text-content sm:block"
              >
                {user.fullName?.split(' ')[0] ?? 'Account'}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                className="hidden h-10 shrink-0 cursor-pointer whitespace-nowrap rounded-full bg-crimson px-5 text-[0.8125rem] font-medium text-white shadow-card transition-colors hover:bg-crimson-deep sm:block"
              >
                Sign in
              </button>
            )}

            <button
              type="button"
              onClick={openCart}
              data-cart-target
              className="group relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full border border-line text-[0.8125rem] text-content transition-colors hover:border-line-strong hover:bg-sand sm:w-auto sm:px-4"
              aria-label={`Cart, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
            >
              {/* A phone has no room for the word: a bag icon, with the count as a badge on its corner. */}
              <svg viewBox="0 0 24 24" className="size-5 sm:hidden" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5.5 8.5h13l-1 11h-11z" /><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
              </svg>
              <span className="hidden sm:inline">Cart</span>
              <span
                className={cn(
                  'numeric grid place-items-center rounded-full font-medium transition-colors',
                  'absolute -right-1 -top-1 h-[1.125rem] min-w-[1.125rem] px-1 text-[0.625rem] ring-2 ring-white',
                  'sm:static sm:size-5 sm:min-w-0 sm:px-0 sm:text-[0.6875rem] sm:ring-0',
                  itemCount > 0 ? 'bg-crimson text-white' : 'bg-sand text-muted max-sm:hidden',
                )}
              >
                {itemCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="ml-0.5 grid size-10 cursor-pointer place-items-center rounded-full border border-line text-content lg:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              <span className="relative block h-3 w-[1.125rem]" aria-hidden="true">
                <span className={cn('absolute left-0 h-[1.5px] w-full rounded-full bg-current transition-all duration-300',
                  mobileOpen ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-0')} />
                <span className={cn('absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 rounded-full bg-current transition-all duration-300',
                  mobileOpen && 'scale-x-0 opacity-0')} />
                <span className={cn('absolute left-0 h-[1.5px] w-full rounded-full bg-current transition-all duration-300',
                  mobileOpen ? 'top-1/2 -translate-y-1/2 -rotate-45' : 'bottom-0')} />
              </span>
            </button>
          </div>
        </div>

        {/* ---- Row 2: the collections (desktop) ---------------------- */}
        <nav aria-label="Product categories" className="hidden border-t border-line lg:block">
          <div className="shell flex h-11 items-center gap-1">
            <Link
              href="/shop"
              className={cn(
                'relative whitespace-nowrap rounded-full px-3 py-2 text-[0.8125rem] font-medium transition-colors xl:px-4',
                pathname.startsWith('/shop') ? 'text-content' : 'text-muted hover:text-content',
              )}
            >
              All products
              {pathname.startsWith('/shop') && <span className="absolute inset-x-3 -bottom-px xl:inset-x-4 h-0.5 rounded-full bg-crimson" />}
            </Link>
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative whitespace-nowrap rounded-full px-3 py-2 text-[0.8125rem] transition-colors xl:px-4',
                    active ? 'font-medium text-content' : 'text-muted hover:text-content',
                  )}
                >
                  {item.label}
                  {active && <span className="absolute inset-x-3 -bottom-px xl:inset-x-4 h-0.5 rounded-full bg-crimson" />}
                </Link>
              );
            })}
            <Link
              href="/enquiry"
              className="ml-auto whitespace-nowrap rounded-full px-3 py-2 text-[0.8125rem] font-medium text-crimson transition-colors hover:text-crimson-deep xl:px-4"
            >
              <span className="xl:hidden">Dealers</span>
              <span className="hidden xl:inline">Bulk &amp; dealer enquiry</span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Mobile navigation: a full sheet under the header. Sign-in card, the collections as photo
          tiles, quick links, and the dealer enquiry. It scrolls inside itself (data-lenis-prevent). */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-canvas text-content transition-[opacity,visibility] duration-300 lg:hidden',
          mobileOpen ? 'visible opacity-100' : 'invisible opacity-0',
        )}
        aria-hidden={!mobileOpen}
      >
        <nav
          data-lenis-prevent
          aria-label="Mobile navigation"
          className="h-full overflow-y-auto overscroll-contain px-4 pb-10 pt-[4.75rem]"
        >
          {(() => {
            const rise = (i: number) => ({
              transitionDelay: mobileOpen ? `${60 + i * 45}ms` : '0ms',
              transform: mobileOpen ? 'translateY(0)' : 'translateY(14px)',
              opacity: mobileOpen ? 1 : 0,
            });
            const tab = mobileOpen ? 0 : -1;
            const motion = 'transition-[transform,opacity] duration-500';
            return (
              <>
                {/* Who you are / sign in */}
                <div style={rise(0)} className={cn(motion, 'flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-card ring-1 ring-line')}>
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-crimson-tint text-crimson">
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.8-3.600 3.700-5.500 7-5.500s6.200 1.900 7 5.500" />
                    </svg>
                  </span>
                  {user ? (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">Hi, {user.fullName?.split(' ')[0] ?? 'there'}</p>
                        <p className="text-xs text-muted">Orders, addresses and warranty</p>
                      </div>
                      <Link href="/account" tabIndex={tab} className="shrink-0 rounded-full border border-line px-4 py-2 text-[0.8125rem] font-medium">
                        Account
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">Welcome</p>
                        <p className="text-xs leading-snug text-muted">Sign in to track orders and save favourites</p>
                      </div>
                      <button
                        type="button"
                        tabIndex={tab}
                        onClick={() => { setMobileOpen(false); onSignIn(); }}
                        className="shrink-0 cursor-pointer rounded-full bg-crimson px-5 py-2.5 text-[0.8125rem] font-semibold text-white shadow-card transition-colors hover:bg-crimson-deep"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </div>

                {/* Collections as photo tiles */}
                <div style={rise(1)} className={cn(motion, 'mt-6 flex items-end justify-between')}>
                  <h2 className="font-display text-lg font-semibold tracking-[-0.02em]">Shop by collection</h2>
                  <Link href="/shop" tabIndex={tab} className="text-[0.8125rem] font-medium text-crimson">All products →</Link>
                </div>
                <ul className="mt-3 grid grid-cols-2 gap-2.5">
                  {NAV.map((item, i) => {
                    const slug = item.href.split('/').pop();
                    return (
                      <li key={item.href} style={rise(i / 2 + 2)} className={motion}>
                        <Link
                          href={item.href}
                          tabIndex={tab}
                          className="group relative block aspect-[16/10] overflow-hidden rounded-2xl bg-sand ring-1 ring-line"
                        >
                          <Image
                            src={`/categories/${slug}.jpg`} alt="" fill sizes="50vw"
                            className="object-cover transition-transform duration-500 group-active:scale-105"
                          />
                          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
                          <span className="absolute inset-x-2.5 bottom-2 flex items-center justify-between text-[0.875rem] font-semibold text-white">
                            {item.label}
                            <span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-white/20 text-[0.6875rem] backdrop-blur-sm">→</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                {/* Quick links */}
                <ul style={rise(7)} className={cn(motion, 'mt-6 divide-y divide-line overflow-hidden rounded-2xl bg-surface ring-1 ring-line')}>
                  {[
                    { href: '/wishlist', label: 'Wishlist', note: wishlistCount > 0 ? `${wishlistCount} saved` : null, icon: <path d="M12 20s-7-4.300-7-9.500A4.100 4.100 0 0 1 12 8a4.100 4.100 0 0 1 7 2.500C19 15.700 12 20 12 20z" /> },
                    { href: '/account', label: 'My orders', note: null, icon: <><path d="M4 7.500 12 4l8 3.500v9L12 20l-8-3.500z" /><path d="M4 7.500 12 11l8-3.500M12 11v9" /></> },
                    { href: '/pages/shipping', label: 'Shipping & delivery', note: null, icon: <><path d="M3 6.500h10v8H3zM13 9.500h4l3 3v2h-7z" /><circle cx="7" cy="16" r="1.500" /><circle cx="16.500" cy="16" r="1.500" /></> },
                  ].map((row) => (
                    <li key={row.href}>
                      <Link href={row.href} tabIndex={tab} className="flex items-center gap-3 px-4 py-3.5 text-[0.9375rem] font-medium transition-colors active:bg-sand">
                        <svg viewBox="0 0 24 24" className="size-5 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{row.icon}</svg>
                        <span className="flex-1">{row.label}</span>
                        {row.note && <span className="numeric text-xs text-muted">{row.note}</span>}
                        <span aria-hidden="true" className="text-faint">›</span>
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* Dealers */}
                <Link
                  href="/enquiry"
                  tabIndex={tab}
                  style={rise(8)}
                  className={cn(motion, 'mt-3 flex items-center gap-3 rounded-2xl bg-ink px-4 py-4 text-on-ink')}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-amber">
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 6.500h16v10H9.500L6 19.500v-3H4z" /><path d="M8 10.500h8" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9375rem] font-semibold">Bulk &amp; dealer enquiry</span>
                    <span className="block text-xs text-on-ink-muted">Ordering several? Talk to us for a quote.</span>
                  </span>
                  <span aria-hidden="true" className="text-lg">→</span>
                </Link>
              </>
            );
          })()}
        </nav>
      </div>
    </>
  );
}
