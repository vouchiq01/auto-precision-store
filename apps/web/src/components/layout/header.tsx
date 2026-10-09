'use client';

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
              className="group relative flex h-10 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border border-line px-4 text-[0.8125rem] text-content transition-colors hover:border-line-strong hover:bg-sand"
              aria-label={`Cart, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
            >
              <span>Cart</span>
              <span
                className={cn(
                  'numeric grid size-5 place-items-center rounded-full text-[0.6875rem] font-medium transition-colors',
                  itemCount > 0 ? 'bg-crimson text-white' : 'bg-sand text-muted',
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
              <span className="relative block h-2.5 w-4">
                <span className={cn('absolute left-0 h-px w-full bg-current transition-all duration-300',
                  mobileOpen ? 'top-1/2 rotate-45' : 'top-0')} />
                <span className={cn('absolute left-0 h-px w-full bg-current transition-all duration-300',
                  mobileOpen ? 'top-1/2 -rotate-45' : 'bottom-0')} />
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

      {/* Mobile navigation */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-surface text-content transition-[opacity,visibility] duration-500 lg:hidden',
          mobileOpen ? 'visible opacity-100' : 'invisible opacity-0',
        )}
        aria-hidden={!mobileOpen}
      >
        <nav className="shell flex h-full flex-col justify-center gap-1 pt-16" aria-label="Mobile navigation">
          {[{ href: '/shop', label: 'All products' }, ...NAV, { href: '/wishlist', label: 'Wishlist' }].map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              tabIndex={mobileOpen ? 0 : -1}
              className="display-sm border-b border-line py-4 text-content transition-[transform,opacity] duration-500"
              style={{
                transitionDelay: mobileOpen ? `${i * 50 + 80}ms` : '0ms',
                transform: mobileOpen ? 'translateY(0)' : 'translateY(18px)',
                opacity: mobileOpen ? 1 : 0,
              }}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-8 flex items-center gap-5">
            {user ? (
              <Link href="/account" tabIndex={mobileOpen ? 0 : -1} className="text-sm text-muted">
                Your account
              </Link>
            ) : (
              <button type="button" onClick={onSignIn} tabIndex={mobileOpen ? 0 : -1} className="cursor-pointer rounded-full bg-crimson px-6 py-2.5 text-sm font-medium text-white">
                Sign in
              </button>
            )}
            <Link href="/enquiry" tabIndex={mobileOpen ? 0 : -1} className="text-sm font-medium text-crimson">
              Bulk &amp; dealer enquiry
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
