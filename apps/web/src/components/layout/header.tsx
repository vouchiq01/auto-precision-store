'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/providers/auth-provider';
import { useCart } from '@/providers/cart-provider';
import { Logo } from './logo';

const NAV = [
  { href: '/collections/electric-lifting', label: 'Electric' },
  { href: '/collections/hydraulic', label: 'Hydraulic' },
  { href: '/collections/round-rotating', label: 'Round' },
  { href: '/collections/portable', label: 'Portable' },
  { href: '/collections/foldable', label: 'Foldable' },
  { href: '/collections/accessories', label: 'Accessories' },
];

export function Header({ onSignIn }: { onSignIn: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const { cart, open: openCart } = useCart();

  /* The header only gains its backdrop after the hero has begun to pass under
     it — over the hero itself it stays fully transparent so the artwork is not
     cropped by a bar of frosted glass. */
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

  const itemCount = cart?.itemCount ?? 0;

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
          'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500',
          scrolled
            ? 'border-b border-ink-line bg-ink/80 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <div className="shell flex h-16 items-center justify-between gap-6 md:h-20">
          <Link href="/" aria-label="Auto Precision — home" className="text-bone transition-opacity hover:opacity-70">
            <Logo />
          </Link>

          <nav aria-label="Product categories" className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative rounded-full px-4 py-2 text-[0.8125rem] transition-colors duration-300',
                    active ? 'text-bone' : 'text-steel hover:text-bone',
                  )}
                >
                  {item.label}
                  {active && <span className="absolute inset-x-4 -bottom-0.5 h-px bg-crimson" />}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1">
            {user ? (
              <Link
                href="/account"
                className="hidden rounded-full px-4 py-2 text-[0.8125rem] text-steel transition-colors hover:text-bone sm:block"
              >
                {user.fullName?.split(' ')[0] ?? 'Account'}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                className="hidden rounded-full px-4 py-2 text-[0.8125rem] text-steel transition-colors hover:text-bone sm:block"
              >
                Sign in
              </button>
            )}

            <button
              type="button"
              onClick={openCart}
              className="group relative flex h-10 items-center gap-2 rounded-full border border-ink-line px-4 text-[0.8125rem] text-bone transition-colors hover:border-bone"
              aria-label={`Cart, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
            >
              <span>Cart</span>
              <span
                className={cn(
                  'numeric grid size-5 place-items-center rounded-full text-[0.6875rem] font-medium transition-colors',
                  itemCount > 0 ? 'bg-crimson text-white' : 'bg-ink-line text-steel',
                )}
              >
                {itemCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="ml-1 grid size-10 place-items-center rounded-full border border-ink-line lg:hidden"
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
      </header>

      {/* Mobile navigation */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-ink transition-[opacity,visibility] duration-500 lg:hidden',
          mobileOpen ? 'visible opacity-100' : 'invisible opacity-0',
        )}
        aria-hidden={!mobileOpen}
      >
        <nav className="shell flex h-full flex-col justify-center gap-1 pt-16" aria-label="Mobile navigation">
          {NAV.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              tabIndex={mobileOpen ? 0 : -1}
              className="display-md border-b border-ink-line py-5 text-bone transition-[transform,opacity] duration-500"
              style={{
                transitionDelay: mobileOpen ? `${i * 60 + 80}ms` : '0ms',
                transform: mobileOpen ? 'translateY(0)' : 'translateY(18px)',
                opacity: mobileOpen ? 1 : 0,
              }}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-8 flex gap-3">
            {user ? (
              <Link href="/account" tabIndex={mobileOpen ? 0 : -1} className="text-sm text-steel">
                Your account
              </Link>
            ) : (
              <button type="button" onClick={onSignIn} tabIndex={mobileOpen ? 0 : -1} className="text-sm text-steel">
                Sign in
              </button>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}
