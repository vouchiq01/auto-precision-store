'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import type { Banner } from '@aps/shared';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { ButtonLink } from '@/components/ui/button';
import { Eyebrow, VerticalLabel } from '@/components/ui/primitives';

/**
 * The hero, built on the Insta360 pattern: the product stays put while the page
 * moves past it, and the headline resolves word by word.
 *
 * The parallax is scrubbed against scroll rather than played on a timer, so it
 * tracks the reader exactly — including when they scroll back up.
 */
export function Hero({ banner, totalProducts }: { banner: Banner | null; totalProducts: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
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
        // Entrance: headline words rise, then the product settles.
        const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
        intro
          .fromTo('[data-hero-word] > span', { yPercent: 115 }, { yPercent: 0, duration: 1.2, stagger: 0.07 })
          .fromTo('[data-hero-sub]', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9 }, '-=0.75')
          .fromTo('[data-hero-cta]', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.8 }, '-=0.7')
          .fromTo(mediaRef.current, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 1.6 }, 0.1);

        // Scrub: media drifts slower than the copy, copy fades as it leaves.
        gsap.to(mediaRef.current, {
          yPercent: 14,
          ease: 'none',
          scrollTrigger: { trigger: section, start: 'top top', end: 'bottom top', scrub: 0.6 },
        });
        gsap.to(copyRef.current, {
          yPercent: -18, opacity: 0.15,
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
    <section ref={sectionRef} className="relative min-h-[100svh] overflow-hidden pt-16 md:pt-20">
      {/* Product artwork */}
      <div ref={mediaRef} className="absolute inset-0 will-change-transform">
        <Image
          src={banner?.imageDesktop ?? '/banners/hero-apex.jpg'}
          alt=""
          fill
          priority
          sizes="100vw"
          className="hidden object-cover object-[30%_center] md:block"
        />
        <Image
          src={banner?.imageMobile ?? banner?.imageDesktop ?? '/banners/hero-apex-mobile.jpg'}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center md:hidden"
        />
        {/* The crop is pushed left (object-position 30%) so the subject lands
            in the right third, clear of the headline. That only works because
            the source is a 2.5:1 crop against a ~1.6:1 container — a
            matching aspect ratio leaves no horizontal room to slide. */}
        {/* Readability wash.

            One directional gradient, not a flat veil over the whole frame.
            The previous version stacked a 45% black veil under the gradient,
            which guaranteed contrast but left the photograph almost invisible —
            and a hero photograph nobody can see is doing no selling at all.

            So: opaque where the headline sits, fully transparent by 78% across,
            leaving the right of the frame completely clear. Plus a short fade up
            from the bottom so the sub-copy and buttons stay legible over
            whatever the photo happens to be doing down there. */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 via-45% to-ink/20 md:bg-gradient-to-r md:from-ink md:from-8% md:via-ink/72 md:via-46% md:to-transparent md:to-78%" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/85 to-transparent" />
      </div>

      <div className="shell relative flex min-h-[calc(100svh-5rem)] items-end pb-16 md:items-center md:pb-0">
        <div className="absolute left-0 top-1/2 hidden -translate-y-1/2 lg:block">
          <VerticalLabel>Bengaluru · Est. 2026</VerticalLabel>
        </div>

        <div ref={copyRef} className="max-w-3xl">
          <Eyebrow>{eyebrow}</Eyebrow>

          <h1 className="display-xl mt-5 text-bone">
            <span className="sr-only">{headlineWords.join(' ')}</span>
            <span aria-hidden="true">
              {headlineWords.map((word, i) => (
                <span key={i} data-hero-word className="inline-block overflow-hidden align-bottom">
                  <span className="inline-block will-change-transform">
                    {/* The full stop is the one crimson mark on this screen. */}
                    {word === 'groomer.' ? (
                      <>groomer<span className="text-crimson">.</span></>
                    ) : word}
                    {i < headlineWords.length - 1 ? ' ' : ''}
                  </span>
                </span>
              ))}
            </span>
          </h1>

          <p data-hero-sub className="lede mt-7">{subtitle}</p>

          <div data-hero-cta className="mt-10 flex flex-wrap items-center gap-3">
            <ButtonLink href={ctaHref} size="lg">{ctaLabel}</ButtonLink>
            <ButtonLink href="/collections/electric-lifting" variant="secondary" size="lg">
              All {totalProducts} tables
            </ButtonLink>
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex"
      >
        <span className="eyebrow">Scroll</span>
        <span className="relative block h-10 w-px overflow-hidden bg-ink-line">
          <span className="absolute inset-x-0 top-0 h-4 animate-[scrollHint_2.2s_ease-in-out_infinite] bg-crimson" />
        </span>
      </div>

      <style>{`
        @keyframes scrollHint {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(1000%); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
