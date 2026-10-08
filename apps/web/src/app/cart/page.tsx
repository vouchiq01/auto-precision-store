'use client';

import Link from 'next/link';
import { formatINR } from '@aps/shared';
import { COLLECTION_LINKS } from '@/lib/collections';
import { useAuth } from '@/providers/auth-provider';
import { useCart } from '@/providers/cart-provider';
import { useSignIn } from '@/providers/sign-in-provider';
import { CartLineItem } from '@/components/cart/cart-line';
import { CartTotals } from '@/components/cart/cart-totals';
import { CouponBox } from '@/components/cart/coupon-box';
import { FreightProgress } from '@/components/cart/freight-progress';
import { ListingHero } from '@/components/collection/listing-hero';
import { ButtonLink } from '@/components/ui/button';
import { Spinner } from '@/components/ui/primitives';

/**
 * The cart, rebuilt as a basket you can act on.
 *
 * Lines are cards; the summary stays beside them on a desktop and collapses
 * into a bar pinned to the bottom of a phone, so the way to checkout is never
 * a scroll away. A progress bar toward free freight and the published coupon
 * codes sit where the decision is being made, not on a page of their own.
 *
 * Returning buyers get their saved address prefilled at checkout, which is worth
 * a lot on a form this long. New buyers are not asked for anything here —
 * identity is confirmed at the pay step, not at the door.
 */
export default function CartPage() {
  const { user, loading: authLoading } = useAuth();
  const { openSignIn } = useSignIn();
  const { cart, loading, error } = useCart();

  if (loading) {
    return (
      <div className="shell grid min-h-[60vh] place-items-center pt-28">
        <Spinner className="text-muted" />
      </div>
    );
  }

  const lines = cart?.lines ?? [];
  const blocked = lines.some((line) => line.stockWarning !== null);

  if (lines.length === 0) {
    return (
      <>
        <ListingHero crumb="Cart" title="Your cart" />
        <div className="shell py-12 md:py-20">
          <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface px-6 py-12 text-center shadow-card md:px-10">
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-ink text-amber">
              <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4.5 8h15l-1.2 11.5H5.7L4.5 8z" />
                <path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" />
              </svg>
            </span>
            <h2 className="mt-5 font-display text-2xl font-semibold tracking-[-0.02em] text-content">Your cart is empty</h2>
            <p className="mt-2 text-sm text-muted">Every table here is built for a different room. Start with the range.</p>
            <ButtonLink href="/shop" size="lg" className="mt-6">Shop all tables</ButtonLink>

            <div className="mt-8 border-t border-line pt-6">
              <p className="eyebrow">Or jump straight to</p>
              <ul className="mt-3 flex flex-wrap justify-center gap-2">
                {COLLECTION_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex rounded-full border border-line bg-canvas px-3.5 py-1.5 text-[0.8125rem] font-medium text-content transition-colors hover:border-crimson hover:text-crimson"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ListingHero crumb="Cart" title="Your cart" count={cart?.itemCount} unit="item" />

      <div className="shell pb-28 pt-6 md:pt-8 lg:pb-16">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-8">
          <section aria-label="Items in your cart" className="space-y-3">
            <FreightProgress total={cart?.estimatedTotal ?? 0} />
            <ul className="space-y-3">
              {lines.map((line) => <CartLineItem key={line.id} line={line} />)}
            </ul>
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 pt-1 text-sm font-medium text-crimson transition-colors hover:text-crimson-deep"
            >
              <span aria-hidden="true">←</span> Continue shopping
            </Link>
          </section>

          <aside className="lg:sticky lg:top-32">
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-card md:p-6">
              <h2 className="font-display text-lg font-semibold tracking-[-0.015em] text-content">Order summary</h2>

              <div className="mt-4"><CouponBox collapsible /></div>
              <div className="my-5 border-t border-line" />

              <CartTotals cart={cart} />

              <ButtonLink
                href="/checkout"
                size="lg"
                className={`mt-5 hidden w-full lg:inline-flex ${blocked ? 'pointer-events-none opacity-50' : ''}`}
              >
                {blocked ? 'Fix stock issues first' : 'Proceed to checkout'}
              </ButtonLink>

              {!user && !authLoading && (
                <p className="mt-3 text-center text-xs text-faint">
                  Ordered before?{' '}
                  <button type="button" onClick={openSignIn} className="cursor-pointer underline underline-offset-2 hover:text-content">
                    Sign in
                  </button>{' '}
                  to reuse your address.
                </p>
              )}

              <ul className="mt-5 space-y-2 border-t border-line pt-4 text-xs text-muted">
                {[
                  'Secure payment — UPI, cards, net banking and EMI',
                  'GST invoice with every order',
                  '12 to 36 month warranty, depending on the model',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <svg viewBox="0 0 16 16" className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true">
                      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {error && <p role="alert" className="mt-3 text-xs text-crimson">{error}</p>}
          </aside>
        </div>
      </div>

      {/* The phone's version of the summary's button: the total and the way
          forward, pinned, so the person never has to hunt for checkout. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.18)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted">Total</p>
            <p className="numeric text-lg font-semibold leading-tight text-content">{formatINR(cart?.estimatedTotal ?? 0)}</p>
          </div>
          <ButtonLink
            href="/checkout"
            size="lg"
            className={`h-12 flex-1 ${blocked ? 'pointer-events-none opacity-50' : ''}`}
          >
            {blocked ? 'Fix stock issues' : 'Checkout'}
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
