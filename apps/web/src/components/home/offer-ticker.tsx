'use client';

import Link from 'next/link';
import { useState, type CSSProperties } from 'react';
import { usePublicCoupons, type PublicCouponRow } from '@/hooks/use-public-coupons';
import { couponLine } from '@/lib/coupon-display';

export interface TickerMessage { id: string; text: string; href?: string | null }

/**
 * The slim scrolling offers line above the homepage carousel.
 *
 * What scrolls, in order: the messages the owner writes in Admin → Banners ("Scrolling offer
 * line"), the real "up to N% off" worked out on the server from the catalogue's own prices,
 * and then every coupon he has published (these arrive in the browser, so they join the end of
 * the line). Nothing here is typed into code, and nothing is invented.
 *
 * It is moving content, so it can be stopped without a button: it pauses under the pointer, while
 * anything in it has focus, and while a finger or the mouse is held down on it (a phone has no hover).
 * Under reduced motion it does not move at all — it becomes a row you scroll by hand.
 *
 * The line is two identical groups, each at least as wide as the screen, slid left by exactly one
 * group (see `.aps-marquee` in globals.css). The second group is aria-hidden so a screen reader
 * hears each message once.
 */
export function OfferTicker({ messages }: { messages: TickerMessage[] }) {
  const coupons = usePublicCoupons();
  const [copied, setCopied] = useState<string | null>(null);

  const live = coupons ?? [];
  const count = messages.length + live.length;
  if (count === 0) return null;

  async function copy(coupon: PublicCouponRow) {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(coupon.code);
      setTimeout(() => setCopied((c) => (c === coupon.code ? null : c)), 1800);
    } catch { /* Clipboard can be denied; the code is printed in the sentence. */ }
  }

  const item = 'inline-flex items-center gap-2 whitespace-nowrap';
  const group = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className="flex min-w-[100vw] shrink-0 items-center justify-around gap-x-12 pr-12"
    >
      {messages.map((m) => (
        <li key={m.id} className={item}>
          <Dot />
          {m.href
            ? <Link href={m.href} tabIndex={hidden ? -1 : undefined} className="underline-offset-4 hover:underline">{m.text}</Link>
            : <span>{m.text}</span>}
        </li>
      ))}
      {live.map((coupon) => (
        <li key={coupon.code} className={item}>
          <Dot />
          <button
            type="button"
            tabIndex={hidden ? -1 : undefined}
            onClick={() => void copy(coupon)}
            title="Tap to copy the code"
            className="cursor-pointer text-left underline-offset-4 hover:underline"
          >
            {copied === coupon.code ? `${coupon.code} copied ✓` : couponLine(coupon)}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div
      role="region"
      aria-label="Offers"
      /* The page's fixed header covers the top 64px (108px on a desktop); the line starts below it. */
      className="bg-canvas pt-16 lg:pt-[6.75rem]"
    >
      <div className="aps-marquee-wrap relative bg-crimson text-white">
        <div
          className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_2.5rem,#000_calc(100%-3.5rem),transparent)]"
        >
          <div
            className="aps-marquee flex w-max py-2 text-[0.8125rem] font-medium leading-5 tracking-[0.01em] sm:py-2.5 sm:text-sm"
            style={{ '--aps-marquee-duration': `${Math.max(24, count * 11)}s` } as CSSProperties}
          >
            {group(false)}
            {group(true)}
          </div>
        </div>

      </div>
    </div>
  );
}

function Dot() {
  return <span aria-hidden="true" className="size-1.5 shrink-0 rotate-45 bg-amber" />;
}
