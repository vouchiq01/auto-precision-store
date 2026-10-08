'use client';

import { useState } from 'react';
import { formatINR } from '@aps/shared';
import { usePublicCoupons, type PublicCouponRow } from '@/hooks/use-public-coupons';

/** What goes on the red stub: the saving, big, with a small word under it. */
function stub(coupon: PublicCouponRow): { big: string; small: string } {
  if (coupon.type === 'percent') return { big: `${coupon.value / 100}%`, small: 'OFF' };
  if (coupon.type === 'flat') return { big: formatINR(coupon.value), small: 'OFF' };
  return { big: 'FREE', small: 'FREIGHT' };
}

/** One honest line of terms, built only from fields the coupon really has. */
function terms(coupon: PublicCouponRow): string {
  const parts: string[] = [];
  parts.push(coupon.minOrderValue ? `On orders above ${formatINR(coupon.minOrderValue)}` : 'On any order');
  if (coupon.type === 'percent' && coupon.maxDiscount) parts.push(`up to ${formatINR(coupon.maxDiscount)} off`);
  return parts.join(' · ');
}

/**
 * Whatever codes the admin has opted to publish, drawn as tickets: a red stub
 * carrying the saving, a notched perforation, and the code to copy. The deal is
 * readable at a glance and the whole ticket is the button. Renders nothing when
 * there is nothing to show, so an ordinary day with no live offer leaves no
 * empty band on the page.
 *
 * Tapping a ticket copies the code to the clipboard; it does not add anything to
 * a cart, because there may not be one yet on this page.
 */
export function CouponStrip() {
  const coupons = usePublicCoupons();
  const [copied, setCopied] = useState<string | null>(null);

  if (!coupons || coupons.length === 0) return null;

  async function copy(coupon: PublicCouponRow) {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(coupon.code);
      setTimeout(() => setCopied((current) => (current === coupon.code ? null : current)), 1600);
    } catch {
      /* Clipboard can be denied — the code is still printed on the ticket. */
    }
  }

  return (
    <section className="shell py-8 md:py-12" aria-labelledby="offers-heading">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-crimson text-white">
          <svg viewBox="0 0 20 20" className="size-[1.125rem]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 10.5V4a1 1 0 0 1 1-1h6.5l6.8 6.8a1 1 0 0 1 0 1.4l-5.1 5.1a1 1 0 0 1-1.4 0L3 10.5z" />
            <circle cx="7" cy="7" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <div>
          <h2 id="offers-heading" className="font-display text-xl font-semibold leading-tight tracking-[-0.02em] text-content md:text-2xl">
            Offers live right now
          </h2>
          <p className="text-xs text-muted md:text-sm">Tap a ticket to copy the code, then paste it in your cart.</p>
        </div>
      </div>

      <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {coupons.map((coupon) => {
          const { big, small } = stub(coupon);
          const done = copied === coupon.code;
          return (
            <li key={coupon.code}>
              <button
                type="button"
                onClick={() => void copy(coupon)}
                aria-label={`Copy code ${coupon.code}: ${big} ${small}. ${terms(coupon)}`}
                className="group relative flex w-full cursor-pointer overflow-hidden rounded-2xl bg-surface text-left shadow-card ring-1 ring-line transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-lift"
              >
                {/* The saving — the first thing the eye lands on. */}
                <span className="relative flex w-[7.25rem] shrink-0 flex-col items-center justify-center bg-gradient-to-br from-crimson to-crimson-deep px-3 py-5 text-white sm:w-32">
                  <span className="numeric text-[1.75rem] font-bold leading-none tracking-[-0.03em] sm:text-3xl">{big}</span>
                  <span className="mt-1.5 text-[0.6875rem] font-semibold tracking-[0.2em]">{small}</span>
                </span>

                {/* Perforation: a dashed rule with a notch cut into top and bottom. */}
                <span aria-hidden="true" className="relative w-0 border-l-2 border-dashed border-line-strong">
                  <span className="absolute -left-[0.6875rem] -top-[0.6875rem] size-[1.375rem] rounded-full bg-canvas ring-1 ring-line" />
                  <span className="absolute -bottom-[0.6875rem] -left-[0.6875rem] size-[1.375rem] rounded-full bg-canvas ring-1 ring-line" />
                </span>

                <span className="flex min-w-0 flex-1 flex-col justify-center gap-2.5 px-4 py-4 sm:px-5">
                  <span className="text-xs leading-snug text-muted">{terms(coupon)}</span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="numeric truncate rounded-lg bg-sand px-3 py-1.5 text-sm font-semibold tracking-[0.06em] text-content">
                      {coupon.code}
                    </span>
                    <span
                      className={`shrink-0 text-xs font-semibold transition-colors ${
                        done ? 'text-success' : 'text-crimson group-hover:text-crimson-deep'
                      }`}
                    >
                      {done ? 'Copied ✓' : 'Copy'}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
