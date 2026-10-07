import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { formatINR, type Banner, type ProductSummary } from '@aps/shared';
import { ButtonLink } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/primitives';

/**
 * The hero — now a short one.
 *
 * It used to fill the screen: a headline, a 5/4 portrait photo, a checklist.
 * On a laptop that pushed every product below the fold, and a shop whose
 * products need a scroll to be seen is a poster. This is a band about 300px
 * tall: the line that names the reader's problem, two buttons, and — on
 * desktop — the flagship as a card you can click straight into. Products start
 * immediately beneath it.
 *
 * It is a server component with a CSS entrance rather than a scripted one, so
 * it paints complete and never waits on JavaScript to un-hide.
 *
 * The headline names the reader's problem, not our market. Segmenting it by
 * buyer ("for salons") makes everyone else read past it; almost nobody
 * grooming a dog thinks of themselves as a segment.
 */
export function Hero({
  banner, totalProducts, featured,
}: { banner: Banner | null; totalProducts: number; featured: ProductSummary | null }) {
  const eyebrow = banner?.eyebrow ?? 'Grooming tables';
  const subtitle = banner?.subtitle
    ?? 'A table that rises to your height, turns the dog to your hand, and holds it still. From ₹8,900.';
  const ctaHref = banner?.ctaUrl ?? '/shop';
  const ctaLabel = banner?.ctaLabel ?? `Shop all ${totalProducts} tables`;
  const cardImage = banner?.imageDesktop ?? featured?.primaryImage?.url ?? '/banners/hero-apex-mobile.jpg';

  const delay = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties;

  return (
    <section className="on-ink bg-blueprint relative overflow-hidden pb-8 pt-[5.25rem] md:pb-11 md:pt-28 lg:pt-[8.5rem]">
      <div className="shell">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14">
          <div>
            <Eyebrow className="anim-fade-up text-amber">{eyebrow}</Eyebrow>

            <h1
              className="anim-fade-up mt-3 font-display text-[clamp(2.25rem,4.8vw,4rem)] font-semibold leading-[0.96] tracking-[-0.035em] text-on-ink"
              style={delay(60)}
            >
              Stop grooming on the <span className="text-amber">floor</span><span className="text-crimson">.</span>
            </h1>

            <p className="anim-fade-up lede mt-4 max-w-xl text-base md:text-lg" style={delay(120)}>{subtitle}</p>

            <div className="anim-fade-up mt-6 flex items-center gap-2.5 sm:gap-3" style={delay(180)}>
              <ButtonLink href={ctaHref} size="lg" className="h-12 flex-1 px-4 text-sm sm:h-12 sm:flex-none sm:px-7 sm:text-[0.9375rem]">
                {ctaLabel}
              </ButtonLink>
              <ButtonLink href="/enquiry" variant="onink" size="lg" className="h-12 px-5 text-sm sm:h-12 sm:px-7 sm:text-[0.9375rem]">
                Talk to us
              </ButtonLink>
            </div>
          </div>

          {featured && (
            <Link
              href={`/products/${featured.slug}`}
              className="anim-fade-up group relative hidden overflow-hidden rounded-3xl bg-ink-raised shadow-[0_30px_70px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/15 lg:block"
              style={delay(140)}
            >
              <div className="relative aspect-[16/9]">
                <Image
                  src={cardImage}
                  alt={featured.name}
                  fill
                  priority
                  sizes="(min-width: 1024px) 42vw, 0px"
                  className="object-cover object-center transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <p className="eyebrow text-amber">{featured.badges[0] ?? 'Featured'}</p>
                    <p className="mt-1 line-clamp-2 font-display text-lg font-semibold leading-tight tracking-[-0.02em] text-on-ink xl:text-xl">{featured.name}</p>
                    <p className="numeric mt-0.5 text-sm text-on-ink-muted">
                      {formatINR(featured.price)}
                      {featured.compareAtPrice && <span className="ml-2 line-through opacity-70">{formatINR(featured.compareAtPrice)}</span>}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-crimson px-4 py-2 text-sm font-medium text-white transition-colors group-hover:bg-crimson-deep">
                    View table →
                  </span>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
