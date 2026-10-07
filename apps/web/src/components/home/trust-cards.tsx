import type { ReactNode } from 'react';

/**
 * Four promises in one slim bar, under the first shelf.
 *
 * They were large floating cards straddling the hero, which spent the first
 * screen on reassurance before a single product. Here they are a quiet strip
 * the shopper meets just after the products, when the question has become
 * "and what if something goes wrong?".
 *
 * Every claim is one the platform really keeps: freight is the Karnataka rule,
 * the warranty range is the true 12–36 months across the catalogue (not a flat
 * number true of two SKUs), the invoice is generated with the buyer's GSTIN,
 * and EMI is offered through the gateway on orders over ₹10,000.
 */
const ITEMS: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: 'Free freight in Karnataka',
    body: 'On orders over ₹25,000',
    icon: (
      <>
        <path d="M2.5 6.5h10v8h-10z" />
        <path d="M12.5 9.5h4l3 3v2h-7z" />
        <circle cx="6.5" cy="16.5" r="1.75" />
        <circle cx="16" cy="16.5" r="1.75" />
      </>
    ),
  },
  {
    title: 'GST invoice, every order',
    body: 'Made out to your GSTIN',
    icon: (
      <>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
        <path d="M9.5 8h5M9.5 12h5" />
      </>
    ),
  },
  {
    title: '12–36 month warranty',
    body: 'Frame cover, per model',
    icon: (
      <>
        <path d="M12 3l7.5 3v5.5c0 4.5-3 8-7.5 9.5-4.5-1.5-7.5-5-7.5-9.5V6z" />
        <path d="M8.75 12l2.25 2.25 4.25-4.5" />
      </>
    ),
  },
  {
    title: 'EMI from ₹2,199 a month',
    body: 'On orders over ₹10,000',
    icon: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2.5" />
        <path d="M3 10.5h18M7 15h3" />
      </>
    ),
  },
];

export function TrustCards() {
  return (
    <section aria-label="Why buy from us" className="shell py-6 md:py-8">
      {/* gap-px over a line-coloured background draws the dividers for both the
          2×2 phone grid and the 4-across desktop row without per-breakpoint
          border rules. */}
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-card lg:grid-cols-4">
        {ITEMS.map((item) => (
          <li key={item.title} className="flex items-center gap-3 bg-surface p-3.5 md:p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink text-amber md:size-10">
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {item.icon}
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-[0.8125rem] font-medium leading-snug text-content">{item.title}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted">{item.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
