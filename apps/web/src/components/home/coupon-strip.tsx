'use client';

import { useState } from 'react';
import { usePublicCoupons, type PublicCouponRow } from '@/hooks/use-public-coupons';
import { couponShortTerms, couponStub, couponTerms } from '@/lib/coupon-display';

/**
 * Whatever codes the admin has opted to publish, as one slim row straight under the banner
 * carousel, where a shopper will see them: a small red stub with the saving, the code, one
 * line of terms, and Copy. Each ticket is the button. On a phone the row scrolls sideways.
 * Renders nothing when there is nothing to show, so a day with no live offer leaves no gap.
 *
 * Tapping a ticket copies the code to the clipboard; it does not add anything to a cart,
 * because there may not be one yet on this page.
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
    <section className="shell pt-1 md:pt-2" aria-label="Offers live right now">
      <ul className="-mx-4 flex snap-x scroll-px-4 items-center gap-2 overflow-x-auto px-4 pb-1 sm:gap-2.5 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
        <li className="hidden shrink-0 snap-start items-center gap-2 pr-1 text-sm font-semibold text-content sm:flex">
          <span className="grid size-7 place-items-center rounded-full bg-crimson text-white">
            <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 10.5V4a1 1 0 0 1 1-1h6.5l6.8 6.8a1 1 0 0 1 0 1.4l-5.1 5.1a1 1 0 0 1-1.4 0L3 10.5z" />
              <circle cx="7" cy="7" r="1.2" fill="currentColor" stroke="none" />
            </svg>
          </span>
          Offers
        </li>

        {coupons.map((coupon) => {
          const { big, small } = couponStub(coupon);
          const done = copied === coupon.code;
          return (
            <li
              key={coupon.code}
              /* Phone: two equal tickets fill the row (one ticket fills it alone); more than two
                 scroll sideways. From sm up they are natural width. */
              className={`shrink-0 snap-start sm:w-auto ${coupons.length === 1 ? 'w-full' : 'w-[calc((100%-0.5rem)/2)]'}`}
            >
              <button
                type="button"
                onClick={() => void copy(coupon)}
                aria-label={`Copy code ${coupon.code}: ${big} ${small}. ${couponTerms(coupon)}`}
                className="group flex h-11 w-full cursor-pointer sm:h-12 sm:w-auto items-stretch overflow-hidden rounded-xl bg-surface text-left ring-1 ring-line transition-[box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-card"
              >
                <span className="flex w-[3.25rem] shrink-0 flex-col sm:w-[3.75rem] items-center justify-center bg-gradient-to-br from-crimson to-crimson-deep text-white">
                  <span className="numeric text-[0.8125rem] font-bold leading-none sm:text-[0.9375rem]">{big}</span>
                  <span className="mt-0.5 text-[0.5rem] font-semibold tracking-[0.12em] sm:text-[0.5625rem] sm:tracking-[0.18em]">{small}</span>
                </span>
                <span aria-hidden="true" className="w-0 border-l-2 border-dashed border-line-strong" />
                <span className="flex min-w-0 flex-1 flex-col justify-center px-2.5 sm:flex-none sm:px-3">
                  {/* Phone: no Copy label (no room for two tickets side by side), so the code itself
                      says "Copied ✓", and the terms are cut to "Min ₹10,000". */}
                  <span className="numeric truncate whitespace-nowrap text-xs font-semibold tracking-[0.04em] text-content sm:text-[0.8125rem] sm:tracking-[0.05em]">
                    <span className="sm:hidden">{done ? 'Copied ✓' : coupon.code}</span>
                    <span className="hidden sm:inline">{coupon.code}</span>
                  </span>
                  <span className="whitespace-nowrap text-[0.625rem] leading-tight text-muted sm:hidden">{couponShortTerms(coupon)}</span>
                  <span className="hidden max-w-[12.5rem] truncate text-[0.6875rem] leading-tight text-muted sm:block">{couponTerms(coupon)}</span>
                </span>
                <span className={`hidden items-center pr-3 text-xs font-semibold transition-colors sm:flex ${done ? 'text-success' : 'text-crimson group-hover:text-crimson-deep'}`}>
                  {done ? 'Copied ✓' : 'Copy'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
