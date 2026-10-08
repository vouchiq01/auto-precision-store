'use client';

import { useState } from 'react';
import { formatINR } from '@aps/shared';
import { useCart } from '@/providers/cart-provider';
import { AvailableCoupons } from './available-coupons';

/**
 * Everything about a coupon in one place: the applied state, the code field,
 * the codes the admin has chosen to publish, and the reason one was refused.
 * Shared by the cart page and the drawer.
 *
 * `collapsible` is the drawer: space is tight there, so an unapplied coupon is a
 * single "Have a code?" line that opens into the full control on demand.
 */
export function CouponBox({ collapsible = false, tabIndex }: { collapsible?: boolean; tabIndex?: number }) {
  const { cart, mutating, error, applyCoupon, removeCoupon } = useCart();
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(!collapsible);

  return (
    <div>
      {cart?.couponCode ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-success/30 bg-success/5 px-3.5 py-2.5">
          <span className="flex min-w-0 items-center gap-2.5 text-success">
            <svg viewBox="0 0 20 20" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M3 8V5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5V8a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5V12a2 2 0 0 0 0-4z" strokeLinejoin="round" />
            </svg>
            <span className="min-w-0 leading-tight">
              <strong className="block truncate text-sm font-semibold">{cart.couponCode} applied</strong>
              {cart.discountTotal > 0 && (
                <span className="numeric block text-xs">You save {formatINR(cart.discountTotal)}</span>
              )}
            </span>
          </span>
          <button
            type="button"
            onClick={() => void removeCoupon()}
            tabIndex={tabIndex}
            className="shrink-0 cursor-pointer text-xs text-muted underline-offset-2 transition-colors hover:text-content hover:underline"
          >
            Remove
          </button>
        </div>
      ) : !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          tabIndex={tabIndex}
          aria-expanded={false}
          className="flex h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-line-strong bg-canvas px-3.5 text-left text-sm text-content transition-colors hover:border-crimson"
        >
          <span className="flex items-center gap-2.5">
            <svg viewBox="0 0 20 20" className="size-4 text-crimson" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M3 8V5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5V8a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5V12a2 2 0 0 0 0-4z" strokeLinejoin="round" />
            </svg>
            Add a coupon code
          </span>
          <svg viewBox="0 0 12 12" className="size-3 text-faint" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2.5 4.5L6 8l3.5-3.5" />
          </svg>
        </button>
      ) : (
        <div>
          {collapsible && (
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-content">Coupon code</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                tabIndex={tabIndex}
                className="cursor-pointer text-xs text-muted underline-offset-4 transition-colors hover:text-content hover:underline"
              >
                Hide
              </button>
            </div>
          )}

          {/* One joined field: the Apply button lives inside the input's border,
              red when there is something to apply and soft when there is not. */}
          <form
            className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1 transition-colors focus-within:border-ink"
            onSubmit={(event) => {
              event.preventDefault();
              if (input.trim()) void applyCoupon(input).then(() => setInput(''));
            }}
          >
            <svg viewBox="0 0 20 20" className="ml-2.5 size-4 shrink-0 text-faint" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M3 8V5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5V8a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5V12a2 2 0 0 0 0-4z" strokeLinejoin="round" />
            </svg>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="Enter code"
              aria-label="Coupon code"
              autoComplete="off"
              tabIndex={tabIndex}
              className="h-9 min-w-0 flex-1 bg-transparent px-2 text-sm font-medium uppercase tracking-[0.06em] text-content outline-none placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-faint"
            />
            <button
              type="submit"
              tabIndex={tabIndex}
              disabled={!input.trim() || mutating}
              className="h-9 shrink-0 cursor-pointer rounded-lg bg-crimson px-4 text-sm font-medium text-white transition-colors hover:bg-crimson-deep disabled:cursor-not-allowed disabled:bg-sand disabled:text-faint"
            >
              {mutating ? 'Applying…' : 'Apply'}
            </button>
          </form>

          <AvailableCoupons onPick={setInput} />
        </div>
      )}

      {cart?.couponMessage && <p className="mt-2 text-xs text-warning">{cart.couponMessage}</p>}
      {error && <p role="alert" className="mt-2 text-xs text-crimson">{error}</p>}
    </div>
  );
}
