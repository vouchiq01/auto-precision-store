'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { formatINR } from '@aps/shared';
import { cn } from '@/lib/cn';
import { useCart } from '@/providers/cart-provider';
import { CartLineItem } from '@/components/cart/cart-line';
import { CartTotals } from '@/components/cart/cart-totals';
import { CouponBox } from '@/components/cart/coupon-box';
import { FreightProgress } from '@/components/cart/freight-progress';
import { COLLECTION_LINKS } from '@/lib/collections';
import { ButtonLink } from '@/components/ui/button';

export function CartDrawer() {
  const { cart, isOpen, close } = useCart();
  const pathname = usePathname();
  const openedAt = useRef(pathname);

  /* Close on navigation.
     Relying on each link to call close() itself meant one link — Checkout —
     was missed, and the drawer stayed open over the checkout page. Worse, the
     body overflow lock below never lifted, so that page could not be scrolled.
     Closing on route change covers every link, now and any added later, plus
     browser back/forward. */
  useEffect(() => {
    if (pathname !== openedAt.current) {
      openedAt.current = pathname;
      close();
    }
  }, [pathname, close]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      /* Always restore scrolling on cleanup, including when this unmounts while
         still open — a page the customer cannot scroll is a dead end, and on a
         phone it looks like the site has frozen. */
      document.body.style.overflow = '';
    };
  }, [isOpen, close]);

  const lines = cart?.lines ?? [];
  const hasBlockingWarning = lines.some((line) => line.stockWarning !== null);
  const count = cart?.itemCount ?? 0;
  const tab = isOpen ? 0 : -1;

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-ink/55 backdrop-blur-[3px] transition-opacity duration-500',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={close}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed right-0 top-0 z-[65] flex h-dvh w-full max-w-[26rem] flex-col bg-surface shadow-[-24px_0_60px_-30px_rgba(0,0,0,0.5)]',
          'transition-transform duration-[600ms] ease-out-expo',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        aria-hidden={!isOpen}
      >
        {/* A white title bar: the drawer belongs to the same light site as the
            header above it, not a dark sheet laid over it. */}
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-content">Your cart</h2>
            {count > 0 && (
              <span className="numeric grid h-6 min-w-6 place-items-center rounded-full bg-crimson px-1.5 text-xs font-semibold text-white">
                {count}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close cart"
            tabIndex={tab}
            className="grid size-9 cursor-pointer place-items-center rounded-full border border-line text-muted transition-colors hover:border-line-strong hover:text-content"
          >
            <svg viewBox="0 0 14 14" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-canvas px-8 text-center">
            <span className="mb-2 grid size-20 place-items-center rounded-full bg-crimson-tint text-crimson">
              <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4.5 8h15l-1.2 11.5H5.7L4.5 8z" />
                <path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" />
              </svg>
            </span>
            <p className="font-display text-xl font-semibold tracking-[-0.02em] text-content">Your cart is empty</p>
            <p className="max-w-[16rem] text-sm text-muted">Pick a table, a tub or a cage and it will wait for you here.</p>
            <ButtonLink href="/shop" onClick={close} tabIndex={tab} size="lg" className="mt-4 w-full max-w-[16rem]">
              Shop all products
            </ButtonLink>
            <ul className="mt-5 flex flex-wrap justify-center gap-2">
              {COLLECTION_LINKS.slice(0, 4).map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={close}
                    tabIndex={tab}
                    className="inline-flex rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-content transition-colors hover:border-crimson hover:text-crimson"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            {/* data-lenis-prevent: smooth-scroll otherwise swallows wheel and
                touch scrolling inside a fixed panel. */}
            <div data-lenis-prevent className="flex-1 space-y-3 overflow-y-auto bg-canvas px-4 py-4">
              <FreightProgress total={cart?.estimatedTotal ?? 0} compact />
              <ul className="space-y-3">
                {lines.map((line) => (
                  <CartLineItem key={line.id} line={line} compact onNavigate={close} tabIndex={tab} />
                ))}
              </ul>
            </div>

            <footer className="border-t border-line bg-surface px-5 pb-5 pt-4 shadow-[0_-14px_30px_-24px_rgba(0,0,0,0.4)]">
              <CouponBox collapsible tabIndex={tab} />
              <div className="my-4">
                <CartTotals cart={cart} compact />
              </div>

              <ButtonLink
                href="/checkout"
                size="lg"
                onClick={close}
                tabIndex={tab}
                className={cn('h-12 w-full gap-2', hasBlockingWarning && 'pointer-events-none opacity-50')}
              >
                {hasBlockingWarning ? (
                  'Fix stock issues to continue'
                ) : (
                  <>
                    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="7" width="10" height="7" rx="1.5" />
                      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
                    </svg>
                    Checkout · {formatINR(cart?.estimatedTotal ?? 0)}
                  </>
                )}
              </ButtonLink>

              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
                <Link
                  href="/cart"
                  onClick={close}
                  tabIndex={tab}
                  className="font-medium text-content underline-offset-4 transition-colors hover:text-crimson hover:underline"
                >
                  View full cart
                </Link>
                <span>Secure payment · UPI, cards, EMI</span>
              </div>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
