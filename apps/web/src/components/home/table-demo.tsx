'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
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
 *
 * It was also briefly scroll-driven, pinned across 300vh. That is a lovely
 * effect on a folio site and the wrong one on a shop: holding the viewport for
 * three screens of scrolling does not read as an effect, it reads as the page
 * having stopped responding, and the reader's instinct is to leave rather than
 * to keep scrolling. It plays itself now and the section is one screen tall.
 */

const SLIDE_MS = 3000;
const FADE_MS = 700;

const BEATS = [
  {
    src: '/banners/demo-floor.jpg',
    alt: 'A woman perched on a stool, bending down to brush a large dog standing on a kitchen floor',
    title: 'Right now, it happens on the floor.',
    body: 'Bent over a dog that will not stay put, one hand holding it still and one hand trying to work. Twenty minutes in, it is your back that gives up first.',
  },
  {
    src: '/banners/demo-low.jpg',
    alt: 'A Labrador standing on a low black electric lift table while its groomer rests a hand on its back',
    title: 'Drop the table to 510 mm.',
    body: 'Low enough that most dogs step up by themselves. Nobody has to lift a 30 kg retriever onto anything, and an old or nervous dog is not wrestled into place.',
  },
  {
    src: '/banners/demo-raised.jpg',
    alt: 'A groomer standing upright beside a German Shepherd on a table raised to her waist height',
    title: 'Raise it to your height.',
    body: 'Powered on the Apex and Vertex lines, foot-pumped on the Anchor, pinned by hand on the portables. Eleven seconds end to end, and your back stops being part of the job.',
  },
  {
    src: '/banners/demo-turn.jpg',
    alt: 'A groomer combing a Pomeranian on a round table that turns so she can reach its far side',
    title: 'Turn the dog, not yourself.',
    body: 'A 360° locking deck. Unlock, bring the far shoulder round to your scissor hand, lock again — about two seconds, one hand. The dog never has to get up and settle twice.',
  },
  {
    src: '/banners/demo-hold.jpg',
    alt: 'A golden retriever standing steady beside a grooming arm and loop while it is brushed',
    title: 'And it holds still while you work.',
    body: 'The arm and noose steady the dog without holding it down. A dog groomed at the same height in the same place settles for it far faster than one chased around a living room.',
  },
];

export function TableDemo() {
  const [index, setIndex] = useState(0);
  /* The slide we just left stays painted underneath the incoming one. Fading
     both at once puts them at 50% together, and two photographs at half
     opacity read as a double exposure rather than a dissolve. */
  const [previous, setPrevious] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const goTo = useCallback((next: number) => {
    setIndex((current) => {
      if (next === current) return current;
      setPrevious(current);
      return next;
    });
  }, []);

  /* Choosing a step by hand is the reader taking over, so it stops advancing
     and stays where they put it. That is also what satisfies WCAG 2.2.2 — a
     mechanism to stop self-moving content — now that there is no visible
     pause button: the control is the dots themselves. */
  const takeOver = useCallback((next: number) => {
    setPaused(true);
    goTo(next);
  }, [goTo]);

  /* Arrows and swipe are the same "take over" action as clicking a dot — the
     reader driving it by hand, so the auto-advance stops rather than fighting
     them a few seconds later. Wraps in both directions. */
  const step = useCallback((delta: 1 | -1) => {
    takeOver((index + delta + BEATS.length) % BEATS.length);
  }, [index, takeOver]);

  /* Touch swipe on the photo. A tap is a drag of ~0px and must not be treated
     as a swipe, so anything under the threshold is ignored rather than
     resolved to "next". */
  const touchStartX = useRef<number | null>(null);
  const SWIPE_THRESHOLD_PX = 40;

  const onTouchStart = useCallback((event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }, []);

  const onTouchEnd = useCallback((event: React.TouchEvent) => {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX === null) return;
    const endX = event.changedTouches[0]?.clientX ?? startX;
    const delta = endX - startX;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    step(delta < 0 ? 1 : -1);
  }, [step]);

  /* Only run while the section is actually on screen. Otherwise it has cycled
     the whole story several times before anyone scrolls down to it, and they
     arrive in the middle of a sentence.

     `reduced` has to be in the dependency list. useReducedMotion starts true on
     purpose, so the FIRST render is the still branch — which has no ref — and
     an effect keyed on [] would attach the observer to nothing and never look
     again. That leaves onScreen false forever and the carousel silently never
     advances, with no error anywhere. */
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry?.isIntersecting ?? false),
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (reduced || paused || !onScreen) return;
    const timer = window.setTimeout(() => goTo((index + 1) % BEATS.length), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [index, paused, onScreen, reduced, goTo]);

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
    <section
      ref={sectionRef}
      className="rule bg-sand/60 py-16 md:py-20"
      aria-roledescription="carousel"
      aria-label="What using a grooming table looks like"
      /* Focus only — NOT hover. This section fills the viewport on a desktop,
         so pausing on hover meant the pointer was resting on it essentially all
         the time and the sequence never advanced at all. Focus still pauses, or
         a keyboard user gets carried off the control they are on. */
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="shell">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
          <div>
            <Eyebrow>What using one looks like</Eyebrow>

            {/* Stacked and cross-faded in place, so the column never changes
                height and the photograph beside it cannot be nudged. */}
            <div className="relative mt-5 min-h-[15rem] sm:min-h-[13rem]">
              {BEATS.map((beat, i) => (
                <div
                  key={beat.title}
                  className="absolute inset-0"
                  aria-hidden={i !== index}
                  style={{
                    opacity: i === index ? 1 : 0,
                    transform: `translateY(${i === index ? 0 : 12}px)`,
                    /* The outgoing text leaves before the incoming arrives —
                       two paragraphs overlapping at half opacity is unreadable. */
                    transition: `opacity ${FADE_MS}ms var(--ease-out-expo) ${i === index ? '160ms' : '0ms'}, transform ${FADE_MS}ms var(--ease-out-expo) ${i === index ? '160ms' : '0ms'}`,
                    pointerEvents: i === index ? undefined : 'none',
                  }}
                >
                  <h2 className="font-display text-[clamp(1.6rem,2.9vw,2.6rem)] font-semibold leading-[1.02] tracking-[-0.025em] text-content">
                    {beat.title}
                  </h2>
                  <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-muted">{beat.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-2 flex gap-1.5">
                {BEATS.map((beat, i) => (
                  <button
                    key={beat.title}
                    type="button"
                    onClick={() => takeOver(i)}
                    aria-label={`Show step ${i + 1}: ${beat.title}`}
                    aria-current={i === index}
                    className="group h-4 w-10 cursor-pointer rounded-full p-0 focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <span className="block h-0.5 w-full overflow-hidden rounded-full bg-line-strong">
                      {/* Fills across the dwell, so the rhythm is visible and a
                          reader can see how long they have. */}
                      <span
                        key={`${i}-${index}-${paused}-${onScreen}`}
                        className="block h-full rounded-full bg-crimson"
                        style={
                          i === index
                            ? {
                                animation: `slideProgress ${SLIDE_MS}ms linear forwards`,
                                animationPlayState: paused || !onScreen ? 'paused' : 'running',
                              }
                            : { width: i < index ? '100%' : '0%', opacity: i < index ? 0.35 : 1 }
                        }
                      />
                    </span>
                  </button>
                ))}
            </div>
          </div>

          <div
            className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-sand shadow-lift sm:aspect-[3/2] lg:aspect-[4/3]"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {BEATS.map((beat, i) => {
              const isActive = i === index;
              const isOutgoing = i === previous;
              return (
                <Image
                  key={beat.src}
                  src={beat.src}
                  alt={isActive ? beat.alt : ''}
                  fill
                  priority={i === 0}
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className="object-cover"
                  style={{
                    opacity: isActive || isOutgoing ? 1 : 0,
                    zIndex: isActive ? 2 : isOutgoing ? 1 : 0,
                    transition: `opacity ${FADE_MS}ms var(--ease-out-expo)`,
                  }}
                />
              );
            })}

            {/* Prev/next, so the photo itself is a control, not only the
                small dots below it. Always rendered rather than hover-only —
                the same rule as the listing card's add-to-cart icon: hover
                does not exist on a touch screen and is unreachable by
                keyboard-only navigation, so a hover-revealed control is
                invisible to exactly the visitors who need a tappable target
                most. z-10 keeps them above every photo layer. */}
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={`Previous step: ${BEATS[(index - 1 + BEATS.length) % BEATS.length]!.title}`}
              className="absolute left-3 top-1/2 z-10 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-surface/90 text-content shadow-card backdrop-blur-sm transition-colors duration-300 hover:bg-crimson hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <ArrowIcon direction="left" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={`Next step: ${BEATS[(index + 1) % BEATS.length]!.title}`}
              className="absolute right-3 top-1/2 z-10 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-surface/90 text-content shadow-card backdrop-blur-sm transition-colors duration-300 hover:bg-crimson hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <ArrowIcon direction="right" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={direction === 'left' ? undefined : { transform: 'scaleX(-1)' }}
    >
      <path d="M12.5 5 7 10l5.5 5" />
    </svg>
  );
}
