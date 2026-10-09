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
const ITEMS: { title: string; body: string; head: string; sub: string; icon: ReactNode; tone: string; chip: string }[] = [
  {
    title: 'Free freight in Karnataka',
    tone: 'from-[#FFF1E6] to-[#FFE2CC]',
    chip: 'bg-[#F2570C] text-white shadow-[0_6px_14px_-6px_rgba(242,87,12,0.7)]',
    head: 'Free freight',
    sub: 'Karnataka',
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
    tone: 'from-[#EAF6F0] to-[#D5EEE1]',
    chip: 'bg-[#0B7A4B] text-white shadow-[0_6px_14px_-6px_rgba(11,122,75,0.7)]',
    head: 'GST invoice',
    sub: 'Every order',
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
    tone: 'from-[#ECEBFD] to-[#DAD7FA]',
    chip: 'bg-[#4F46E5] text-white shadow-[0_6px_14px_-6px_rgba(79,70,229,0.7)]',
    head: '12–36 months',
    sub: 'Warranty',
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
    tone: 'from-[#FDE8EA] to-[#FAD3D6]',
    chip: 'bg-crimson text-white shadow-[0_6px_14px_-6px_rgba(200,32,43,0.7)]',
    head: 'EMI',
    sub: 'From ₹2,199/mo',
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
    <section aria-label="Why buy from us" className="shell py-4 md:py-8">
      {/* Four separate soft-tinted tiles, each with its own colour (orange freight, green invoice, violet
          warranty, red EMI) and a solid icon badge. Phone: one row of four, short head + one-word
          qualifier (the Karnataka qualifier stays: the freight claim is only true there). From md: four
          across with the full sentences. */}
      <ul className="grid grid-cols-4 gap-2 md:gap-4">
        {ITEMS.map((item) => (
          <li
            key={item.title}
            className={`flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br px-1 pb-3 pt-3.5 text-center ring-1 ring-black/5 md:flex-row md:gap-3.5 md:rounded-3xl md:p-4 md:text-left ${item.tone}`}
          >
            <span className={`grid size-10 shrink-0 place-items-center rounded-2xl md:size-12 ${item.chip}`}>
              <svg
                viewBox="0 0 24 24"
                className="size-5 md:size-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {item.icon}
              </svg>
            </span>

            {/* Phone text */}
            <span className="min-w-0 leading-tight md:hidden">
              <span className="block text-[0.6875rem] font-bold text-content">{item.head}</span>
              <span className="mt-0.5 block text-[0.625rem] font-medium text-content/60">{item.sub}</span>
            </span>

            {/* md and up */}
            <span className="hidden min-w-0 md:block">
              <span className="block text-[0.9375rem] font-bold leading-snug text-content">{item.title}</span>
              <span className="mt-0.5 block text-[0.8125rem] leading-snug text-content/65">{item.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
