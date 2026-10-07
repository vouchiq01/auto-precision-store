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
  const tab = isOpen ? 0 : -1;

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-ink/70 backdrop-blur-sm transition-opacity duration-500',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={close}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed right-0 top-0 z-[65] flex h-dvh w-full max-w-[26rem] flex-col bg-canvas shadow-[-24px_0_60px_-30px_rgba(0,0,0,0.5)]',
          'transition-transform duration-[600ms] ease-out-expo',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        aria-hidden={!isOpen}
      >
        {/* Navy header, like the site's: the drawer reads as part of the same
            shop rather than a white sheet laid over it. */}
        <header className="flex items-center justify-between bg-ink px-5 py-4 text-on-ink">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-white/10 text-amber">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4.5 8h15l-1.2 11.5H5.7L4.5 8z" />
                <path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" />
              </svg>
            </span>
            <div>
              <p className="font-display text-base font-semibold leading-tight">Your cart</p>
              <p className="numeric text-xs text-on-ink-muted">
                {cart?.itemCount ?? 0} {cart?.itemCount === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close cart"
            tabIndex={tab}
            className="grid size-9 cursor-pointer place-items-center rounded-full bg-white/10 text-on-ink transition-colors hover:bg-white/20"
          >
            ✕
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="font-display text-xl font-semibold tracking-[-0.02em] text-content">Your cart is empty</p>
            <p className="text-sm text-muted">Every table here is built for a different room.</p>
            <ButtonLink href="/shop" onClick={close} tabIndex={tab} className="mt-2">
              Shop all tables
            </ButtonLink>
          </div>
        ) : (
          <>
            {/* data-lenis-prevent: smooth-scroll otherwise swallows wheel and
                touch scrolling inside a fixed panel. */}
            <div data-lenis-prevent className="flex-1 overflow-y-auto px-4 py-4">
              <FreightProgress total={cart?.estimatedTotal ?? 0} compact />
              <ul className="mt-1 divide-y divide-line">
                {lines.map((line) => (
                  <CartLineItem key={line.id} line={line} compact onNavigate={close} tabIndex={tab} />
                ))}
              </ul>
            </div>

            <footer className="border-t border-line bg-surface px-4 py-4 shadow-[0_-10px_30px_-20px_rgba(0,0,0,0.25)]">
              <CouponBox collapsible tabIndex={tab} />
              <div className="my-4 border-t border-line" />
              <CartTotals cart={cart} compact />

              <ButtonLink
                href="/checkout"
                size="lg"
                onClick={close}
                tabIndex={tab}
                className={cn('mt-4 w-full', hasBlockingWarning && 'pointer-events-none opacity-50')}
              >
                {hasBlockingWarning ? 'Fix stock issues to continue' : `Checkout · ${formatINR(cart?.estimatedTotal ?? 0)}`}
              </ButtonLink>
              <Link
                href="/cart"
                onClick={close}
                tabIndex={tab}
                className="mt-3 block text-center text-sm text-muted underline-offset-4 transition-colors hover:text-content hover:underline"
              >
                View full cart
              </Link>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
