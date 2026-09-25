'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { formatINR } from '@aps/shared';
import { cn } from '@/lib/cn';
import { useCart } from '@/providers/cart-provider';
import { Button, ButtonLink } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/primitives';

export function CartDrawer() {
  const { cart, isOpen, close, updateItem, removeItem, applyCoupon, removeCoupon, mutating, error } = useCart();
  const [couponInput, setCouponInput] = useState('');
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

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-500',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={close}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed right-0 top-0 z-[65] flex h-dvh w-full max-w-[26rem] flex-col border-l border-line bg-surface',
          'transition-transform duration-[600ms] ease-out-expo',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        aria-hidden={!isOpen}
      >
        <header className="flex items-center justify-between border-b border-line px-6 py-5">
          <div>
            <Eyebrow>Your cart</Eyebrow>
            <p className="numeric mt-1 text-sm text-content">
              {cart?.itemCount ?? 0} {cart?.itemCount === 1 ? 'item' : 'items'}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close cart"
            tabIndex={isOpen ? 0 : -1}
            className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-sand hover:text-content"
          >
            ✕
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
            <p className="display-sm text-content">Nothing here yet</p>
            <p className="text-sm text-muted">
              Every table here is built for a different room.
            </p>
            <ButtonLink href="/collections/electric-lifting" variant="secondary" onClick={close}>
              Browse tables
            </ButtonLink>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-6">
              {lines.map((line) => (
                <li key={line.id} className="flex gap-4 py-5">
                  <Link
                    href={`/products/${line.product.slug}`}
                    onClick={close}
                    tabIndex={isOpen ? 0 : -1}
                    className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-line bg-canvas"
                  >
                    {line.product.image && (
                      <Image
                        src={line.product.image.url}
                        alt={line.product.image.alt || line.product.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${line.product.slug}`}
                      onClick={close}
                      tabIndex={isOpen ? 0 : -1}
                      className="block truncate text-sm font-medium text-content transition-colors hover:text-crimson"
                    >
                      {line.product.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
                      {line.variant.optionName}: {line.variant.optionValue}
                    </p>

                    {line.stockWarning && (
                      <p className="mt-1.5 text-xs text-warning">{line.stockWarning}</p>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center rounded-full border border-line">
                        <button
                          type="button"
                          onClick={() => void updateItem(line.id, line.quantity - 1)}
                          disabled={mutating}
                          tabIndex={isOpen ? 0 : -1}
                          aria-label={line.quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                          className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:text-content disabled:opacity-40"
                        >
                          −
                        </button>
                        <span className="numeric w-7 text-center text-sm text-content">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => void updateItem(line.id, line.quantity + 1)}
                          disabled={mutating || line.quantity >= line.variant.stockQty}
                          tabIndex={isOpen ? 0 : -1}
                          aria-label="Increase quantity"
                          className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:text-content disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>

                      <p className="numeric text-sm font-medium text-content">{formatINR(line.lineTotal)}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void removeItem(line.id)}
                      disabled={mutating}
                      tabIndex={isOpen ? 0 : -1}
                      className="mt-2 text-xs text-faint underline-offset-2 transition-colors hover:text-crimson hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="border-t border-line px-6 py-5">
              {cart?.couponCode ? (
                <div className="mb-4 flex items-center justify-between rounded-xl border border-success/30 bg-success/5 px-4 py-2.5">
                  <span className="text-sm text-success">
                    {cart.couponCode} applied · −{formatINR(cart.discountTotal)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void removeCoupon()}
                    tabIndex={isOpen ? 0 : -1}
                    className="text-xs text-muted transition-colors hover:text-content"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form
                  className="mb-4 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (couponInput.trim()) void applyCoupon(couponInput).then(() => setCouponInput(''));
                  }}
                >
                  <input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Coupon code"
                    aria-label="Coupon code"
                    tabIndex={isOpen ? 0 : -1}
                    className="h-10 min-w-0 flex-1 rounded-full border border-line bg-canvas px-4 text-sm uppercase tracking-wide text-content outline-none focus:border-line-strong placeholder:normal-case placeholder:tracking-normal placeholder:text-faint"
                  />
                  <Button type="submit" variant="secondary" size="sm" loading={mutating} disabled={!couponInput.trim()}>
                    Apply
                  </Button>
                </form>
              )}

              {cart?.couponMessage && (
                <p className="mb-3 text-xs text-warning">{cart.couponMessage}</p>
              )}
              {error && <p role="alert" className="mb-3 text-xs text-crimson">{error}</p>}

              <div className="mb-4 space-y-1.5">
                <div className="flex justify-between text-sm text-muted">
                  <span>Subtotal</span>
                  <span className="numeric">{formatINR(cart?.subtotal ?? 0)}</span>
                </div>
                {(cart?.discountTotal ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-success">
                    <span>Discount</span>
                    <span className="numeric">− {formatINR(cart?.discountTotal ?? 0)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1.5 text-base text-content">
                  <span className="font-medium">Total</span>
                  <span className="numeric font-medium">{formatINR(cart?.estimatedTotal ?? 0)}</span>
                </div>
                <p className="text-xs text-faint">
                  Inclusive of GST. Freight calculated at checkout.
                </p>
              </div>

              <ButtonLink
                href="/checkout"
                size="lg"
                onClick={close}
                tabIndex={isOpen ? 0 : -1}
                className={cn('w-full', hasBlockingWarning && 'pointer-events-none opacity-50')}
              >
                {hasBlockingWarning ? 'Fix stock issues to continue' : 'Checkout'}
              </ButtonLink>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
