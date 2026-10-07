'use client';

import Image from 'next/image';
import { Fragment, useEffect, useRef } from 'react';
import type { Banner } from '@aps/shared';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { ButtonLink } from '@/components/ui/button';
import { Eyebrow, VerticalLabel } from '@/components/ui/primitives';

/**
 * The hero.
 *
 * This was a full-bleed photograph under a black wash, which is the right shape
 * for a glowing gadget and the wrong one for us. Two things were wrong with it:
 * the headline's legibility depended entirely on how dark the photo happened to
 * be behind it, and the wash existed to dim the very product we are asking
 * people to buy. Splitting copy from image fixes both — the type sits on a solid
 * navy band at ~16:1 whatever the photo does, and the photo is shown at full
 * strength. (Navy, not black: the client asked for a bolder, more colourful
 * first screen, and a dark hero over white cards is what delivers it.)
 *
 * Everything visible here is a photograph. A drawn dog stood on a floor line at
 * the foot of this section for a while; it read as a drawing however much
 * anatomy went into it, which is the opposite of what a store selling on trust
 * needs. The sequence below now carries the same idea in real photographs.
 */
export function Hero({ banner, totalProducts }: { banner: Banner | null; totalProducts: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current;
    if (!section) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'), import('gsap/ScrollTrigger'),
      ]);
      if (cancelled || !sectionRef.current) return;
      gsap.registerPlugin(ScrollTrigger);

      const context = gsap.context(() => {
        gsap.timeline({ defaults: { ease: 'expo.out' } })
          .fromTo('[data-hero-word] > span', { yPercent: 115 }, { yPercent: 0, duration: 1.1, stagger: 0.07 })
          .fromTo('[data-hero-sub]', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.85 }, '-=0.7')
          .fromTo('[data-hero-cta]', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.75 }, '-=0.65')
          .fromTo(mediaRef.current, { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 1.4 }, 0.15);

        /* The photo drifts slower than the page. Scrubbed against scroll rather
           than played on a timer, so it tracks the reader back up too. */
        gsap.to(mediaRef.current, {
          yPercent: -7,
          ease: 'none',
          scrollTrigger: { trigger: section, start: 'top top', end: 'bottom top', scrub: 0.6 },
        });
      }, section);

      cleanup = () => context.revert();
    })();

    return () => { cancelled = true; cleanup?.(); };
  }, [reduced]);

  /* Names the reader's problem, not our market. Segmenting the headline by
     buyer ("for salons", "for professionals") makes everyone else read past it;
     almost nobody grooming a dog thinks of themselves as a segment. Everyone
     who has ever knelt on a floor to brush a dog recognises this line instead. */
  const eyebrow = banner?.eyebrow ?? 'Grooming tables';
  const headlineWords = ['Stop', 'grooming', 'on', 'the', 'floor.'];
  const subtitle = banner?.subtitle
    ?? 'A table that rises to your height, turns the dog to your hand, and holds it still. From ₹8,900.';
  const ctaHref = banner?.ctaUrl ?? '/collections/electric-lifting';
  const ctaLabel = banner?.ctaLabel ?? 'See the Apex E9';

  return (
    <section ref={sectionRef} className="on-ink bg-blueprint relative overflow-hidden pb-24 pt-28 md:pb-32 md:pt-36">
      <div className="shell">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
          <div className="relative">
            <div className="absolute -left-14 top-1/2 hidden -translate-y-1/2 xl:block">
              <VerticalLabel>Bengaluru · Est. 2026</VerticalLabel>
            </div>

            <Eyebrow className="text-amber">{eyebrow}</Eyebrow>

            <h1 className="mt-5 font-display text-[clamp(2.75rem,5.6vw,5.25rem)] font-semibold leading-[0.92] tracking-[-0.035em] text-on-ink">
              <span className="sr-only">{headlineWords.join(' ')}</span>
              <span aria-hidden="true">
                {headlineWords.map((word, i) => (
                  /* The separating space has to sit OUTSIDE the inline-block,
                     or it collapses and the line renders as "onthe". */
                  <Fragment key={i}>
                    <span data-hero-word className="inline-block overflow-hidden align-bottom">
                      <span className="inline-block will-change-transform">
                        {/* "floor" is the amber spark on this screen; the full
                            stop stays the brand crimson. */}
                        {word === 'floor.' ? (
                          <><span className="text-amber">floor</span><span className="text-crimson">.</span></>
                        ) : word}
                      </span>
                    </span>
                    {i < headlineWords.length - 1 ? ' ' : ''}
                  </Fragment>
                ))}
              </span>
            </h1>

            <p data-hero-sub className="lede mt-7">{subtitle}</p>

            {/* Side by side on a phone — stacked, two 56px buttons ate a
                quarter of the first screen. */}
            <div data-hero-cta className="mt-8 flex items-center gap-2.5 sm:mt-9 sm:gap-3">
              <ButtonLink href={ctaHref} size="lg" className="h-12 flex-1 px-4 text-sm sm:h-14 sm:flex-none sm:px-8 sm:text-[0.9375rem]">
                {ctaLabel}
              </ButtonLink>
              <ButtonLink href="/collections/electric-lifting" variant="onink" size="lg" className="h-12 px-5 text-sm sm:h-14 sm:px-8 sm:text-[0.9375rem]">
                All {totalProducts} tables
              </ButtonLink>
            </div>

          </div>

          <div
            ref={mediaRef}
            /* lg:max-h caps the portrait crop. Without it, aspect-[4/5] scales
               height directly off the column's own width — on a wide desktop
               monitor the image column alone gets wide enough to force a
               ~800px tall row, nearly double the text column beside it, and
               the whole hero balloons well past its content, shoving every
               section below it down the page. The cap lets object-cover crop
               the photo rather than the layout stretching to fit it. */
            className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-ink-raised shadow-[0_40px_90px_-30px_rgba(0,0,0,0.75)] ring-1 ring-white/15 will-change-transform sm:aspect-[5/4] sm:rounded-[2rem] lg:aspect-[4/5] lg:max-h-[34rem]"
          >
            <Image
              src={banner?.imageDesktop ?? '/banners/hero-apex-mobile.jpg'}
              alt="A dog on a grooming table"
              fill
              priority
              sizes="(min-width: 1024px) 46vw, 100vw"
              className="object-cover object-center"
            />
          </div>
        </div>
      </div>

    </section>
  );
}
