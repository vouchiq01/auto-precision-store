'use client';

import { useState } from 'react';
import { formatINR } from '@aps/shared';
import { useCart } from '@/providers/cart-provider';
import { Button } from '@/components/ui/button';
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
          <span className="flex min-w-0 items-center gap-2 text-sm text-success">
            <svg viewBox="0 0 20 20" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M3 8V5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5V8a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5V12a2 2 0 0 0 0-4z" strokeLinejoin="round" />
            </svg>
            <span className="truncate">
              <strong className="font-semibold">{cart.couponCode}</strong> applied
              {cart.discountTotal > 0 && <span className="numeric"> · saves {formatINR(cart.discountTotal)}</span>}
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
          className="cursor-pointer text-sm font-medium text-crimson transition-colors hover:text-crimson-deep"
        >
          Have a coupon code?
        </button>
      ) : (
        <>
          <AvailableCoupons onPick={setInput} />
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (input.trim()) void applyCoupon(input).then(() => setInput(''));
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="Coupon code"
              aria-label="Coupon code"
              tabIndex={tabIndex}
              className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 text-sm uppercase tracking-wide text-content outline-none transition-colors placeholder:normal-case placeholder:tracking-normal placeholder:text-faint focus:border-ink"
            />
            <Button type="submit" variant="contrast" size="md" loading={mutating} disabled={!input.trim()} className="h-11 rounded-xl px-5">
              Apply
            </Button>
          </form>
        </>
      )}

      {cart?.couponMessage && <p className="mt-2 text-xs text-warning">{cart.couponMessage}</p>}
      {error && <p role="alert" className="mt-2 text-xs text-crimson">{error}</p>}
    </div>
  );
}
