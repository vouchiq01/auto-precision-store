'use client';

import Image from 'next/image';
import { Fragment, useEffect, useRef } from 'react';
import type { Banner } from '@aps/shared';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { ButtonLink } from '@/components/ui/button';
import { Eyebrow, VerticalLabel } from '@/components/ui/primitives';
import { Dog } from '@/components/art/dog';

/**
 * The hero.
 *
 * This was a full-bleed photograph under a black wash, which is the right shape
 * for a glowing gadget and the wrong one for us. Two things were wrong with it:
 * the headline's legibility depended entirely on how dark the photo happened to
 * be behind it, and the wash existed to dim the very product we are asking
 * people to buy. Splitting copy from image fixes both — the type sits on paper
 * at ~16:1 whatever the photo does, and the photo is shown at full strength.
 *
 * The dog stands on a floor line at the foot of the section, because the
 * headline is "Stop grooming on the floor." It is the same animal that gets up
 * onto the table in the section below, so the two read as one sentence.
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
          .fromTo('[data-hero-trust] > li', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 }, '-=0.5')
          .fromTo(mediaRef.current, { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 1.4 }, 0.15)
          /* The dog trots in last and from the left, so it reads as arriving
             rather than as one more panel fading up. */
          .fromTo('[data-hero-dog]', { opacity: 0, x: -70 }, { opacity: 1, x: 0, duration: 1.1 }, '-=0.9');

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
    <section ref={sectionRef} className="relative overflow-hidden pt-28 md:pt-32">
      <div className="shell">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
          <div className="relative">
            <div className="absolute -left-14 top-1/2 hidden -translate-y-1/2 xl:block">
              <VerticalLabel>Bengaluru · Est. 2026</VerticalLabel>
            </div>

            <Eyebrow>{eyebrow}</Eyebrow>

            <h1 className="mt-5 font-display text-[clamp(2.75rem,5.6vw,5.25rem)] font-semibold leading-[0.92] tracking-[-0.035em] text-content">
              <span className="sr-only">{headlineWords.join(' ')}</span>
              <span aria-hidden="true">
                {headlineWords.map((word, i) => (
                  /* The separating space has to sit OUTSIDE the inline-block,
                     or it collapses and the line renders as "onthe". */
                  <Fragment key={i}>
                    <span data-hero-word className="inline-block overflow-hidden align-bottom">
                      <span className="inline-block will-change-transform">
                        {/* The full stop is the one crimson mark on this screen. */}
                        {word === 'floor.' ? (
                          <>floor<span className="text-crimson">.</span></>
                        ) : word}
                      </span>
                    </span>
                    {i < headlineWords.length - 1 ? ' ' : ''}
                  </Fragment>
                ))}
              </span>
            </h1>

            <p data-hero-sub className="lede mt-7">{subtitle}</p>

            <div data-hero-cta className="mt-9 flex flex-wrap items-center gap-3">
              <ButtonLink href={ctaHref} size="lg">{ctaLabel}</ButtonLink>
              <ButtonLink href="/collections/electric-lifting" variant="secondary" size="lg">
                All {totalProducts} tables
              </ButtonLink>
            </div>

            {/* Only claims the platform can actually keep: freight is the
                Karnataka rule, warranty is the per-product floor, and every
                order really is invoiced with GST. */}
            <ul data-hero-trust className="mt-10 flex flex-wrap gap-x-7 gap-y-3">
              {[
                'Free freight in Karnataka over ₹25,000',
                '12-month warranty, minimum',
                'GST invoice with every order',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-[0.8125rem] text-muted">
                  <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-crimson" aria-hidden="true">
                    <path
                      d="M3.5 8.5l3 3 6-7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div
            ref={mediaRef}
            className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-sand shadow-lift will-change-transform sm:aspect-[5/4] lg:aspect-[4/5]"
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

      {/* The floor. The dog is on it; the headline is about getting off it. */}
      <div className="shell relative mt-24 md:mt-20">
        <div className="relative h-px bg-line-strong/70">
          <Dog
            data-hero-dog
            wag
            title="A dog waiting on the floor"
            className="absolute bottom-0 left-[4%] h-20 w-auto text-content md:left-[8%] md:h-32"
          />
        </div>
      </div>
    </section>
  );
}
