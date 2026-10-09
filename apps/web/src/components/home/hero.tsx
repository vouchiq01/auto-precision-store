import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { formatINR, type Banner, type ProductSummary } from '@aps/shared';
import { KARNATAKA_FREE_FREIGHT } from '@/lib/store';
import { ButtonLink } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/primitives';

/**
 * The hero: the reader's problem, the reasons to buy today, and one photograph
 * of the thing actually working — a groomer, a dog, a table.
 *
 * It sits on a light, warm gradient rather than the navy of the header. The
 * photograph is shot on white; its edges are feathered into the cream ground
 * with a mask so the table appears to stand in the hero instead of sitting in
 * a pasted rectangle. (A dark ground would have made that white box the loudest
 * thing on the page.) Do not use mix-blend-mode here: a mask isolates its layer,
 * so the blend has nothing behind it to blend with.
 *
 * The chips under the buttons are facts, each checkable against the data: the
 * warranty range (12 to 36 months across the range), the Karnataka
 * free-freight threshold, GST invoices. Do not add a claim here without
 * checking it — see "Claims must match the data" in CLAUDE.md.
 *
 * Server component with a CSS entrance, so it paints complete and never waits
 * on JavaScript to un-hide. On a phone the photograph is dropped so the
 * products stay inside the first screen.
 */
/* Soft edges on all four sides: the subject sits well inside, so only the white
   margin of the photograph fades away. */
const FADE_X = 'linear-gradient(to right, transparent 0%, #000 22%, #000 78%, transparent 100%)';
const FADE_Y = 'linear-gradient(to bottom, transparent 0%, #000 12%, #000 90%, transparent 100%)';

export function Hero({
  banner, totalProducts, spotlight,
}: { banner: Banner | null; totalProducts: number; spotlight: ProductSummary | null }) {
  const eyebrow = banner?.eyebrow ?? 'Grooming tables, tubs & more';
  const subtitle = banner?.subtitle
    ?? 'A table that rises to your height, turns the dog to your hand, and holds it still. From ₹8,900.';
  const ctaHref = banner?.ctaUrl ?? '/shop';
  const ctaLabel = banner?.ctaLabel ?? `Shop all ${totalProducts} products`;

  /* The headline is the banner's title, so the owner can change it in Admin →
     Banners. Its last word is the crimson one ("…on the floor."). */
  const headline = splitHeadline(banner?.title ?? 'Stop grooming on the floor.');

  const delay = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties;

  /* On a phone the facts are three small two-line tiles in ONE row (head + sub);
     from `sm` up they are the longer one-line chips. The GST chip is dropped on a
     phone to keep the row to three, and the Karnataka qualifier stays on the
     freight tile — the claim is only true there. */
  const chips = [
    { head: 'Easy EMI', sub: 'at checkout', text: 'Easy EMI at checkout', phone: true },
    { head: '12–36 months', sub: 'warranty', text: '12 to 36 month warranty', phone: true },
    { head: 'Free freight', sub: `${formatINR(KARNATAKA_FREE_FREIGHT)}+ · Karnataka`, text: `Free freight over ${formatINR(KARNATAKA_FREE_FREIGHT)} in Karnataka`, phone: true },
    { head: 'GST invoice', sub: 'every order', text: 'GST invoice on every order', phone: false },
  ];

  return (
    <section className="relative h-full overflow-hidden bg-gradient-to-br from-[#FFF3E6] via-[#FBF4EC] to-[#FDE6E2] pb-3 pt-[5.25rem] md:pb-10 md:pt-28 lg:pt-[8.5rem]">
      {/* A soft crimson glow behind the photograph gives the white a place to sit. */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-10 size-[22rem] rounded-full bg-crimson/10 blur-3xl lg:size-[34rem]" />

      <div className="shell relative">
        {/* Phone: headline and button beside the photograph, then the facts in a
            2×2 grid. Desktop: text and facts stacked on the left, photograph on
            the right spanning both rows. */}
        <div className="grid grid-cols-[minmax(0,1fr)_9.75rem] items-center gap-x-3 gap-y-4 sm:grid-cols-[minmax(0,1fr)_15rem] md:grid-cols-[minmax(0,1fr)_19rem] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-x-10 lg:gap-y-5">
          <div className="min-w-0 lg:col-start-1 lg:row-start-1 lg:self-end">
            <Eyebrow className="anim-fade-up text-crimson!">{eyebrow}</Eyebrow>

            <h1
              className="anim-fade-up mt-2 font-display text-[1.875rem] font-semibold leading-[0.98] tracking-[-0.035em] text-content sm:text-[2.5rem] lg:mt-3 lg:text-[clamp(2.75rem,4.8vw,4rem)] lg:leading-[0.96]"
              style={delay(60)}
            >
              {headline.before}<span className="text-crimson">{headline.accent}</span>{headline.after}
            </h1>

            <p className="anim-fade-up lede mt-4 hidden max-w-xl text-base sm:block md:text-lg" style={delay(120)}>{subtitle}</p>

            <div className="anim-fade-up mt-4 flex items-center gap-2.5 sm:mt-6 sm:gap-3" style={delay(180)}>
              <ButtonLink href={ctaHref} size="lg" className="h-11 w-full px-3 text-[0.8125rem] sm:h-12 sm:w-auto sm:px-7 sm:text-[0.9375rem]">
                {ctaLabel}
              </ButtonLink>
              <ButtonLink href="/enquiry" variant="secondary" size="lg" className="hidden h-12 px-7 text-[0.9375rem] sm:inline-flex">
                Talk to us
              </ButtonLink>
            </div>
          </div>

          <div className="anim-fade-up relative lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pb-14" style={delay(140)}>
            {/* A white glow under the photograph, so its white ground melts into
                the warm gradient instead of reading as a pasted rectangle. */}
            <div
              aria-hidden="true"
              className="absolute inset-x-1 inset-y-0 rounded-[50%] bg-white/90 blur-xl lg:inset-x-2 lg:bottom-10 lg:blur-2xl"
            />
            {/* The mask feathers the photograph's edges into the gradient, so it
                melts into the page even where blend modes are not composited. */}
            <div
              className="relative mx-auto aspect-[720/768] w-full lg:max-h-[25rem]"
              style={{ WebkitMaskImage: FADE_X, maskImage: FADE_X }}
            >
              <div className="absolute inset-0" style={{ WebkitMaskImage: FADE_Y, maskImage: FADE_Y }}>
                <Image
                  src="/banners/hero-round-table.jpg"
                  alt="A groomer combing a small dog standing on a round grooming table"
                  fill
                  priority
                  sizes="(min-width: 1024px) 40vw, (min-width: 768px) 19rem, 160px"
                  className="object-contain"
                />
              </div>
            </div>

            {/* The hook on a phone, where there is no room for the price card. */}
            <span className="numeric absolute bottom-0.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-crimson px-3 py-1 text-[0.6875rem] font-semibold text-white shadow-lift lg:hidden">
              From ₹8,900
            </span>

            {spotlight && (
              <Link
                href={`/products/${spotlight.slug}`}
                className="group absolute bottom-0 left-1/2 hidden w-max max-w-full -translate-x-1/2 items-center gap-4 rounded-2xl bg-white px-4 py-3 shadow-lift ring-1 ring-line transition-shadow hover:shadow-card lg:flex"
              >
                <div className="min-w-0">
                  <p className="eyebrow text-crimson!">{spotlight.category.name}</p>
                  <p className="mt-0.5 line-clamp-1 font-display text-sm font-semibold leading-tight tracking-[-0.01em] text-content">{spotlight.name}</p>
                  <p className="numeric text-sm font-semibold text-crimson">
                    {formatINR(spotlight.price)}
                    {spotlight.compareAtPrice && <span className="ml-1.5 text-xs font-normal text-faint line-through">{formatINR(spotlight.compareAtPrice)}</span>}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-crimson px-3.5 py-1.5 text-xs font-medium text-white transition-colors group-hover:bg-crimson-deep">
                  View →
                </span>
              </Link>
            )}
          </div>

          {/* Reasons to buy today. */}
          <ul
            className="anim-fade-up col-span-2 grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:gap-2 lg:col-span-1 lg:col-start-1 lg:row-start-2 lg:self-start"
            style={delay(240)}
          >
            {chips.map((chip) => (
              <li
                key={chip.text}
                className={`min-w-0 items-center justify-center rounded-xl border border-line bg-white/80 px-1.5 py-1.5 text-center text-content shadow-sm sm:flex sm:justify-start sm:gap-1.5 sm:rounded-full sm:px-3 sm:text-left sm:text-xs ${
                  chip.phone ? 'flex' : 'hidden'
                }`}
              >
                <svg viewBox="0 0 16 16" className="hidden size-3 shrink-0 text-success sm:block" aria-hidden="true">
                  <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {/* Phone: two short lines. */}
                <span className="flex min-w-0 flex-col leading-tight sm:hidden">
                  <span className="truncate text-[0.6875rem] font-semibold">{chip.head}</span>
                  <span className="truncate text-[0.625rem] text-muted">{chip.sub}</span>
                </span>
                {/* sm and up: one line. */}
                <span className="hidden sm:inline">{chip.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** "Stop grooming on the floor." -> ["Stop grooming on the ", "floor", "."] */
function splitHeadline(title: string): { before: string; accent: string; after: string } {
  const match = /^(.*?)([\p{L}\p{N}’'-]+)([^\p{L}\p{N}]*)$/u.exec(title.trim());
  if (!match) return { before: title, accent: '', after: '' };
  return { before: match[1] ?? '', accent: match[2] ?? '', after: match[3] ?? '' };
}
