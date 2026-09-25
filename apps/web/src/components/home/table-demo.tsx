'use client';

import { useEffect, useRef } from 'react';
import { DogFigure } from '@/components/art/dog';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { ButtonLink } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/primitives';

/**
 * The product, demonstrated rather than described.
 *
 * This replaces a three-step text block that answered "is this complicated?"
 * in words. The objection behind a ₹27,000 machine is not really about steps —
 * it is that someone who has never used a grooming table cannot picture one
 * working, and no specification fixes that. So the dog from the hero walks on,
 * the table lifts, the deck turns, the arm comes in. That is the entire product.
 *
 * Everything lives in ONE svg viewBox so the dog and the table share a
 * coordinate space: the deck rises 124 units and the dog rises exactly 124 with
 * it, which no amount of separately-positioned HTML would stay honest about.
 *
 * Pinning is CSS `position: sticky`, not ScrollTrigger's pin. A GSAP pin here
 * previously tore the section out of flow and overlapped the one below it.
 */

/* Deck travel, in stage units. The real figures the copy quotes — 510mm step-on
   to 1,050mm working height — are what this is proportioned against. */
const LIFT = 124;

const BEATS = [
  {
    title: 'Right now, it happens on the floor.',
    body: 'Bent over a dog that will not stay put, one hand holding it still and one hand trying to work. Twenty minutes in, it is your back that gives up first.',
  },
  {
    title: 'Drop the table to 510 mm.',
    body: 'Low enough that most dogs step up by themselves. Nobody has to lift a 30 kg retriever onto anything, and an old or nervous dog is not wrestled into place.',
  },
  {
    title: 'Raise it to your height.',
    body: 'Powered on the Apex and Vertex lines, foot-pumped on the Anchor, pinned by hand on the portables. Eleven seconds end to end, and your back stops being part of the job.',
  },
  {
    title: 'Turn the dog, not yourself.',
    body: 'A 360° locking deck. Unlock, bring the far shoulder round to your scissor hand, lock again — about two seconds, one hand. The dog never has to get up and settle twice.',
  },
  {
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
        const caption = (i: number) => q(`[data-beat="${i}"]`);

        gsap.set('#apd-column', { transformOrigin: '50% 100%', scaleY: 0.42 });
        gsap.set('#apd-sit', { opacity: 0 });
        gsap.set('#apd-arm', { opacity: 0, transformOrigin: '50% 100%', rotate: -52 });
        gsap.set('#apd-spin', { opacity: 0 });
        gsap.set(caption(0), { opacity: 1 });
        BEATS.forEach((_, i) => { if (i > 0) gsap.set(caption(i), { opacity: 0, y: 14 }); });

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.8,
          },
        });

        gsap.set(q('[data-dot="0"]'), { backgroundColor: 'var(--color-crimson)' });
        const swap = (from: number, to: number) => {
          tl.to(caption(from), { opacity: 0, y: -14, duration: 0.25 }, '<')
            .to(caption(to), { opacity: 1, y: 0, duration: 0.3 }, '<0.15')
            .to(q(`[data-dot="${from}"]`), { backgroundColor: 'var(--color-line-strong)', duration: 0.3 }, '<')
            .to(q(`[data-dot="${to}"]`), { backgroundColor: 'var(--color-crimson)', duration: 0.3 }, '<');
        };

        /* 1 → 2: the dog crosses to the table and sits down. The pose swap is a
           crossfade at the moment it lands, so the eye reads a hop rather than
           an interpolated in-between that no real dog ever passes through. */
        tl.to('#apd-dog', { x: 308, y: -102, duration: 1 });
        swap(0, 1);
        tl.to('#apd-stand', { opacity: 0, duration: 0.18 }, '>-0.35')
          .to('#apd-sit', { opacity: 1, duration: 0.18 }, '<');

        /* 2 → 3: the lift. Column and deck and dog move as one mechanism. */
        tl.to('#apd-column', { scaleY: 1, duration: 1 }, '+=0.15');
        tl.to('#apd-deck', { y: -LIFT, duration: 1 }, '<')
          .to('#apd-dog', { y: -102 - LIFT, duration: 1 }, '<');
        swap(1, 2);

        /* 3 → 4: rotation. In a side elevation a spin is unreadable, so the dog
           squeezes through zero width and comes back mirrored — the standard
           2D turn — with an arc on the deck naming what happened. */
        tl.to('#apd-spin', { opacity: 1, duration: 0.2 }, '+=0.15');
        tl.to('#apd-dog', { scaleX: 0.02, duration: 0.5, ease: 'power2.in', svgOrigin: '560 220' })
          .to('#apd-dog', { scaleX: -1, duration: 0.5, ease: 'power2.out', svgOrigin: '560 220' });
        swap(2, 3);
        tl.to('#apd-spin', { opacity: 0, duration: 0.25 });

        /* 4 → 5: the arm swings over and the noose settles. */
        tl.to('#apd-arm', { opacity: 1, rotate: 0, duration: 1, ease: 'power2.out' }, '+=0.15');
        swap(3, 4);
      }, section);

      cleanup = () => context.revert();
    })();

    return () => { cancelled = true; cleanup?.(); };
  }, [reduced]);

  /* Without motion the sequence cannot tell its story, so it stops pretending
     to be one: the stage shows the finished state and every beat is just read. */
  if (reduced) {
    return (
      <section className="rule bg-sand/60 py-20 md:py-28">
        <div className="shell">
          <Eyebrow>What using one looks like</Eyebrow>
          <h2 className="display-md mt-4 max-w-2xl text-content">
            On the floor, then on the table<span className="text-crimson">.</span>
          </h2>
          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
            <ol className="space-y-7">
              {BEATS.map((beat, i) => (
                <li key={beat.title} className="flex gap-4">
                  <span className="numeric mt-1 shrink-0 font-display text-sm text-crimson">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-medium text-content">{beat.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{beat.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Stage finished />
          </div>
          <div className="mt-12 flex flex-wrap gap-3">
            <ButtonLink href="/collections/round-rotating" size="lg">See the round tables</ButtonLink>
            <ButtonLink href="/collections/portable" variant="secondary" size="lg">Lighter tables for home</ButtonLink>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="rule relative h-[420vh] bg-sand/60">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="shell w-full">
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
            <div>
              <Eyebrow>What using one looks like</Eyebrow>

              {/* Beats are stacked and cross-faded in place, so the block never
                  changes height and the stage beside it cannot be nudged. */}
              <div className="relative mt-5 min-h-[15rem] sm:min-h-[13rem]">
                {BEATS.map((beat, i) => (
                  <div key={beat.title} data-beat={i} className="absolute inset-0">
                    <h2 className="font-display text-[clamp(1.6rem,3vw,2.5rem)] font-semibold leading-[1.02] tracking-[-0.025em] text-content">
                      {beat.title}
                    </h2>
                    <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-muted">
                      {beat.body}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex gap-1.5" aria-hidden="true">
                {BEATS.map((beat, i) => (
                  <span key={beat.title} data-dot={i} className="h-0.5 w-8 rounded-full bg-line-strong" />
                ))}
              </div>
            </div>

            <Stage />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The stage. One viewBox, so the deck and the dog cannot drift apart.
 * Floor at y=520; the deck's low position is y=424 and it rises by LIFT.
 */
function Stage({ finished = false }: { finished?: boolean }) {
  /* Static placement lives on INNER groups as svg transform attributes; the
     outer groups carry no transform at all, because GSAP writes SVG transforms
     to the attribute and would overwrite anything already sitting there. */
  return (
    <div className="relative">
      <svg
        viewBox="40 120 820 420"
        className="w-full"
        role="img"
        aria-label="A dog steps onto a grooming table, which then raises, rotates, and holds it steady"
      >
        <line x1="40" y1="520" x2="860" y2="520" stroke="var(--color-line-strong)" strokeWidth="2" />

        <ellipse cx="560" cy="514" rx="88" ry="13" className="fill-content" />

        {/* Drawn at full extension and squashed from the floor upward, so the
            whole lift is one scaleY. The pre-JS attribute is the same transform
            GSAP will set, so there is no pop on hydration. */}
        <rect
          id="apd-column"
          x="547" y="300" width="26" height="214" rx="6"
          className="fill-content"
          transform={finished ? undefined : 'translate(0 298.12) scale(1 0.42)'}
        />

        <g id="apd-deck" transform={finished ? `translate(0 -${LIFT})` : undefined}>
          <path d="M412 424a148 27 0 0 0 296 0v14a148 27 0 0 1-296 0z" className="fill-content" opacity="0.55" />
          <ellipse cx="560" cy="424" rx="148" ry="27" className="fill-content" />
          {/* Named only while the deck is actually turning */}
          <g id="apd-spin" opacity="0">
            <ellipse cx="560" cy="424" rx="112" ry="20" fill="none" stroke="var(--color-crimson)" strokeWidth="3" strokeDasharray="10 12" />
            <path d="M670 417l14 6-14 6z" fill="var(--color-crimson)" />
          </g>
        </g>

        {/* Arm, clamped to the deck edge */}
        <g id="apd-arm" opacity={finished ? 1 : 0} className="text-content">
          {/* Clamped to the LEFT edge, because the dog ends the turn facing
              left — an arm reaching in from the right would put the noose at
              its tail. */}
          <rect x="414" y="152" width="13" height="158" rx="6" className="fill-content" />
          <path d="M420 168h92" fill="none" stroke="currentColor" strokeWidth="11" strokeLinecap="round" />
          <ellipse cx="512" cy="196" rx="27" ry="10" fill="none" stroke="currentColor" strokeWidth="7" />
        </g>

        {/* Outer g is GSAP's; the inner g holds the fixed placement and scale. */}
        <g id="apd-dog" className="text-content" transform={finished ? `translate(308 ${-(102 + LIFT)})` : undefined}>
          <g transform="translate(150 368)">
            <g id="apd-stand" opacity={finished ? 0 : 1}>
              <DogFigure pose="standing" wag />
            </g>
            <g id="apd-sit" opacity={finished ? 1 : 0}>
              <DogFigure pose="sitting" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
