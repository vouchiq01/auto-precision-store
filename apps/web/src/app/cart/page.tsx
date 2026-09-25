'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { formatINR } from '@aps/shared';
import { useCart } from '@/providers/cart-provider';
import { Button, ButtonLink } from '@/components/ui/button';
import { Eyebrow, EmptyState, Spinner } from '@/components/ui/primitives';

export default function CartPage() {
  const { cart, loading, mutating, error, updateItem, removeItem, applyCoupon, removeCoupon } = useCart();
  const [couponInput, setCouponInput] = useState('');

  if (loading) {
    return (
      <div className="shell grid min-h-[50vh] place-items-center pt-28">
        <Spinner className="text-steel" />
      </div>
    );
  }

  const lines = cart?.lines ?? [];
  const blocked = lines.some((line) => line.stockWarning !== null);

  return (
    <div className="shell pt-28 md:pt-36">
      <Eyebrow>Your cart</Eyebrow>
      <h1 className="display-lg mt-4 text-bone">
        {lines.length === 0 ? 'Empty' : `${cart?.itemCount} ${cart?.itemCount === 1 ? 'item' : 'items'}`}
        <span className="text-crimson">.</span>
      </h1>

      {lines.length === 0 ? (
        <div className="py-16">
          <EmptyState
            title="Nothing in here yet"
            description="Every table here is built for a different room. Start with the range."
            action={<ButtonLink href="/collections/electric-lifting">Browse tables</ButtonLink>}
          />
        </div>
      ) : (
        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_22rem] lg:gap-16">
          <ul className="divide-y divide-ink-line border-y border-ink-line">
            {lines.map((line) => (
              <li key={line.id} className="flex gap-5 py-6">
                <Link
                  href={`/products/${line.product.slug}`}
                  className="relative size-28 shrink-0 overflow-hidden rounded-2xl border border-ink-line bg-ink-raised sm:size-36"
                >
                  {line.product.image && (
                    <Image src={line.product.image.url} alt="" fill sizes="144px" className="object-cover" />
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link href={`/products/${line.product.slug}`} className="font-[family-name:--font-display] text-lg font-medium tracking-[-0.015em] text-bone transition-colors hover:text-white">
                        {line.product.name}
                      </Link>
                      <p className="mt-1 text-sm text-steel">
                        {line.variant.optionName}: {line.variant.optionValue}
                      </p>
                      <p className="numeric mt-1 text-sm text-steel-dim">{formatINR(line.unitPrice)} each</p>
                    </div>
                    <p className="numeric shrink-0 text-lg font-medium text-bone">{formatINR(line.lineTotal)}</p>
                  </div>

                  {line.stockWarning && (
                    <p className="mt-2 text-sm text-warning">{line.stockWarning}</p>
                  )}

                  <div className="mt-auto flex items-center gap-4 pt-4">
                    <div className="flex items-center rounded-full border border-ink-line">
                      <button
                        type="button"
                        onClick={() => void updateItem(line.id, line.quantity - 1)}
                        disabled={mutating}
                        aria-label={line.quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                        className="grid size-9 place-items-center rounded-full text-steel transition-colors hover:text-bone disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="numeric w-8 text-center text-sm text-bone">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => void updateItem(line.id, line.quantity + 1)}
                        disabled={mutating || line.quantity >= line.variant.stockQty}
                        aria-label="Increase quantity"
                        className="grid size-9 place-items-center rounded-full text-steel transition-colors hover:text-bone disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => void removeItem(line.id)}
                      disabled={mutating}
                      className="text-sm text-steel-dim underline-offset-4 transition-colors hover:text-crimson-bright hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="lg:sticky lg:top-28 lg:h-fit">
            <div className="rounded-2xl border border-ink-line p-6">
              <h2 className="eyebrow mb-5">Summary</h2>

              {cart?.couponCode ? (
                <div className="mb-5 flex items-center justify-between rounded-xl border border-success/30 bg-success/5 px-4 py-2.5">
                  <span className="text-sm text-success">{cart.couponCode} applied</span>
                  <button type="button" onClick={() => void removeCoupon()} className="text-xs text-steel transition-colors hover:text-bone">
                    Remove
                  </button>
                </div>
              ) : (
                <form
                  className="mb-5 flex gap-2"
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
                    className="h-10 min-w-0 flex-1 rounded-full border border-ink-line bg-ink px-4 text-sm uppercase text-bone outline-none focus:border-bone placeholder:normal-case placeholder:text-steel-dim"
                  />
                  <Button type="submit" variant="secondary" size="sm" loading={mutating} disabled={!couponInput.trim()}>
                    Apply
                  </Button>
                </form>
              )}

              {cart?.couponMessage && <p className="mb-4 text-xs text-warning">{cart.couponMessage}</p>}
              {error && <p role="alert" className="mb-4 text-xs text-crimson-bright">{error}</p>}

              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-steel">Subtotal</dt>
                  <dd className="numeric text-bone">{formatINR(cart?.subtotal ?? 0)}</dd>
                </div>
                {(cart?.discountTotal ?? 0) > 0 && (
                  <div className="flex justify-between text-success">
                    <dt>Discount</dt>
                    <dd className="numeric">− {formatINR(cart?.discountTotal ?? 0)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-steel">Freight</dt>
                  <dd className="text-steel-dim">Calculated at checkout</dd>
                </div>
                <div className="rule flex justify-between pt-3 text-base">
                  <dt className="font-medium text-bone">Total</dt>
                  <dd className="numeric font-medium text-bone">{formatINR(cart?.estimatedTotal ?? 0)}</dd>
                </div>
              </dl>

              <p className="mt-2 text-xs text-steel-dim">All prices include GST.</p>

              <ButtonLink
                href="/checkout"
                size="lg"
                className={`mt-6 w-full ${blocked ? 'pointer-events-none opacity-50' : ''}`}
              >
                {blocked ? 'Fix stock issues first' : 'Checkout'}
              </ButtonLink>

              <ButtonLink href="/collections/electric-lifting" variant="ghost" size="sm" className="mt-2 w-full">
                Continue shopping
              </ButtonLink>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
