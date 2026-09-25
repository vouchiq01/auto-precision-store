'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { ButtonLink } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/primitives';

/**
 * The product, demonstrated rather than described.
 *
 * This replaced a three-step text block, because the objection behind a
 * ₹27,000 machine is not really "how many steps" — it is that someone who has
 * never used a grooming table cannot picture one working, and no specification
 * fixes that.
 *
 * It was briefly a drawn dog on a drawn table, which was the wrong call: an
 * illustration of a dog reads as an illustration no matter how much anatomy
 * goes into it, and the whole job of this section is to make the thing look
 * real. So every beat is a photograph. Beat one is a home kitchen floor, which
 * is the actual problem; the rest are real dogs on real tables.
 *
 * Every image here is Pexels-licensed for commercial use and recorded in
 * public/products/CREDITS.txt. Deliberately NOT the round-table set — that
 * imagery is taken from competitors' listings and is fine as a placeholder on
 * a product page, but not as the animated centrepiece of the homepage.
 */

const BEATS = [
  {
    src: '/banners/demo-floor.jpg',
    alt: 'A woman perched on a stool, bending down to brush a large dog standing on a kitchen floor',
    title: 'Right now, it happens on the floor.',
    body: 'Bent over a dog that will not stay put, one hand holding it still and one hand trying to work. Twenty minutes in, it is your back that gives up first.',
  },
  {
    src: '/products/non-slip-ramp-for-electric-tables/01.jpg',
    alt: 'A small dog standing on a lowered grooming table',
    title: 'Drop the table to 510 mm.',
    body: 'Low enough that most dogs step up by themselves. Nobody has to lift a 30 kg retriever onto anything, and an old or nervous dog is not wrestled into place.',
  },
  {
    src: '/products/fold-pro-stainless-folding-table/01.jpg',
    alt: 'Two groomers working upright at a table raised to their waist height',
    title: 'Raise it to your height.',
    body: 'Powered on the Apex and Vertex lines, foot-pumped on the Anchor, pinned by hand on the portables. Eleven seconds end to end, and your back stops being part of the job.',
  },
  {
    src: '/products/precision-grooming-arm-double-noose/02.jpg',
    alt: 'A groomer bringing a dog round on the table to reach its far side',
    title: 'Turn the dog, not yourself.',
    body: 'A 360° locking deck. Unlock, bring the far shoulder round to your scissor hand, lock again — about two seconds, one hand. The dog never has to get up and settle twice.',
  },
  {
    src: '/products/precision-grooming-arm-double-noose/04.jpg',
    alt: 'A dog held steady by a grooming arm and noose while being clipped',
    title: 'And it holds still while you work.',
    body: 'The arm and noose steady the dog without holding it down. A dog groomed at the same height in the same place settles for it far faster than one chased around a living room.',
  },
];

export function TableDemo() {
  const sectionRef = useRef<HTMLElement>(null);
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
        const q = gsap.utils.selector(section);

        BEATS.forEach((_, i) => {
          if (i === 0) return;
          gsap.set(q(`[data-shot="${i}"]`), { opacity: 0 });
          gsap.set(q(`[data-beat="${i}"]`), { opacity: 0, y: 14 });
        });
        gsap.set(q('[data-dot="0"]'), { backgroundColor: 'var(--color-crimson)' });

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.7 },
        });

        /* One beat per step, each the same length, so the scroll feels evenly
           paced rather than racing through the middle. The photo leads the
           words slightly — the image is what the reader is looking at.
           
           Only the INCOMING photo animates. Fading the outgoing one out at the
           same time leaves both at half opacity mid-transition, and two
           photographs at 50% read as a double exposure rather than a dissolve.
           Stacked in DOM order, the previous shot simply stays opaque
           underneath and is covered. */
        for (let i = 1; i < BEATS.length; i += 1) {
          tl.to(q(`[data-shot="${i}"]`), { opacity: 1, duration: 0.5 }, `+=${i === 1 ? 0.6 : 0.9}`)
            .to(q(`[data-beat="${i - 1}"]`), { opacity: 0, y: -14, duration: 0.3 }, '<')
            .to(q(`[data-beat="${i}"]`), { opacity: 1, y: 0, duration: 0.35 }, '<0.2')
            .to(q(`[data-dot="${i - 1}"]`), { backgroundColor: 'var(--color-line-strong)', duration: 0.3 }, '<')
            .to(q(`[data-dot="${i}"]`), { backgroundColor: 'var(--color-crimson)', duration: 0.3 }, '<');
        }
      }, section);

      cleanup = () => context.revert();
    })();

    return () => { cancelled = true; cleanup?.(); };
  }, [reduced]);

  /* Without motion the sequence cannot tell its story, so it stops pretending
     to be one and simply lays the five beats out to be read. */
  if (reduced) {
    return (
      <section className="rule bg-sand/60 py-20 md:py-24">
        <div className="shell">
          <Eyebrow>What using one looks like</Eyebrow>
          <h2 className="display-md mt-4 max-w-2xl text-content">
            On the floor, then on the table<span className="text-crimson">.</span>
          </h2>
          <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {BEATS.map((beat, i) => (
              <li key={beat.title}>
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sand shadow-card">
                  <Image src={beat.src} alt={beat.alt} fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover" />
                </div>
                <h3 className="mt-5 font-display text-lg font-medium text-content">
                  <span className="numeric mr-2 text-crimson">{String(i + 1).padStart(2, '0')}</span>
                  {beat.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{beat.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex flex-wrap gap-3">
            <ButtonLink href="/collections/round-rotating" size="lg">See the round tables</ButtonLink>
            <ButtonLink href="/collections/portable" variant="secondary" size="lg">Lighter tables for home</ButtonLink>
          </div>
        </div>
      </section>
    );
  }

  return (
    /* 300vh over five beats. The previous 420vh left the reader scrolling
       through a stalled frame between steps. */
    <section ref={sectionRef} className="rule relative h-[300vh] bg-sand/60">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden py-20 md:py-24">
        <div className="shell w-full">
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-14">
            <div>
              <Eyebrow>What using one looks like</Eyebrow>

              {/* Beats are stacked and cross-faded in place so the block never
                  changes height and the photograph beside it cannot be nudged. */}
              <div className="relative mt-5 min-h-[14rem] sm:min-h-[12rem]">
                {BEATS.map((beat, i) => (
                  <div key={beat.title} data-beat={i} className="absolute inset-0">
                    <h2 className="font-display text-[clamp(1.6rem,2.9vw,2.6rem)] font-semibold leading-[1.02] tracking-[-0.025em] text-content">
                      {beat.title}
                    </h2>
                    <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-muted">{beat.body}</p>
                  </div>
                ))}
              </div>

              <div className="mt-1 flex gap-1.5" aria-hidden="true">
                {BEATS.map((beat, i) => (
                  <span key={beat.title} data-dot={i} className="h-0.5 w-9 rounded-full bg-line-strong" />
                ))}
              </div>
            </div>

            {/* The photograph, as large as the frame allows. */}
            <div className="relative h-[52vh] overflow-hidden rounded-[1.75rem] bg-sand shadow-lift sm:h-[58vh] lg:h-[74vh]">
              {BEATS.map((beat, i) => (
                <Image
                  key={beat.src}
                  data-shot={i}
                  src={beat.src}
                  alt={beat.alt}
                  fill
                  priority={i === 0}
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className="object-cover"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
