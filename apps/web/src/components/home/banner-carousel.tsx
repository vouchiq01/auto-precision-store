'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Banner } from '@aps/shared';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { BANNER_ASPECT, bannerButton } from '@/lib/banner-art';
import { cn } from '@/lib/cn';

/**
 * The top of the homepage: finished banner artwork, one slide per active "hero"
 * banner in Admin → Banners, in the order set there. The artwork carries its own
 * headline and button, so a slide is just the picture; the whole picture is the link
 * (`ctaUrl`) and the banner's title is its description for screen readers.
 *
 * Every slide is the SAME size — the carousel never changes height as it plays. The supplied
 * artwork was cropped by hand to one shape (1.9:1, `BANNER_ASPECT`); a picture uploaded later in
 * another shape is cropped to it by `object-cover`, so upload 1.9:1 artwork (e.g. 1900×1000)
 * if every word needs to stay in view.
 *
 * The artwork has a "Shop now" button drawn in it. For the supplied banners a real link sits
 * exactly over it, so it behaves as a button — pointer, hover lift, keyboard focus. Everywhere
 * else on the picture is a link too.
 *
  * Native scroll-snap is the carousel: a phone swipes it with no script, and the
 * arrows, dots and autoplay only move the same scroller. The slide index is read back
 * from scrollLeft, so a swipe, an arrow and the timer can never disagree.
 *
 * Autoplay rules (WCAG 2.2.2): it advances only while the banner is on screen, waits
 * while the pointer or keyboard focus is on it, and stops for good the moment the
 * shopper uses an arrow, a dot or swipes. It does not run under reduced motion.
 */
const DWELL_MS = 6000;

export function BannerCarousel({ slides, offsetForHeader = true }: { slides: Banner[]; offsetForHeader?: boolean }) {
  const reduced = useReducedMotion();
  const track = useRef<HTMLUListElement>(null);
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const [held, setHeld] = useState(false);
  const [stopped, setStopped] = useState(false);

  const count = slides.length;

  const goTo = useCallback((index: number, smooth = true) => {
    const el = track.current;
    if (!el || count === 0) return;
    const next = (index + count) % count;
    el.scrollTo({ left: next * el.clientWidth, behavior: smooth && !reduced ? 'smooth' : 'auto' });
  }, [reduced, count]);

  /* Whichever way the scroller moved, the dots follow it. */
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setActive(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), { threshold: 0.4 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (count < 2 || reduced || stopped || held || !visible) return;
    const timer = setInterval(() => goTo(active + 1), DWELL_MS);
    return () => clearInterval(timer);
  }, [count, reduced, stopped, held, visible, active, goTo]);

  /* A resize changes the slide width; keep the current slide in view. */
  useEffect(() => {
    const onResize = () => goTo(active, false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active, goTo]);

  if (count === 0) return null;
  const take = (index: number) => { setStopped(true); goTo(index); };

  return (
    <section
      ref={root}
      aria-roledescription="carousel"
      aria-label="Featured"
      /* The fixed header covers the top of the page; the frame starts below it. */
      className={cn('bg-canvas', offsetForHeader && 'pt-16 lg:pt-[6.75rem]')}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
    >
      {/* Full width on a phone; in the page's content width, with rounded corners, from sm up. */}
      <div className="mx-auto max-w-[96rem] sm:px-6 sm:pt-4 md:px-10 xl:px-16">
      <div className="relative">
      <div className="sm:overflow-hidden sm:rounded-2xl sm:shadow-card">
      <ul
        ref={track}
        onTouchStart={() => setStopped(true)}
        onWheel={(e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) setStopped(true); }}
        style={{ aspectRatio: String(BANNER_ASPECT) }}
        className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => {
          const here = i === active;
          /* The first picture is `priority`; the neighbours load eagerly so the next slide is
             ready when it slides in, the rest wait. (`priority` and `loading` may not be mixed.) */
          const loading = i === 0 ? undefined : Math.abs(i - active) <= 1 ? 'eager' : 'lazy';
          const button = bannerButton(slide.imageDesktop);
          return (
            <li
              key={slide.id}
              role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${count}`} aria-hidden={!here}
              className="relative h-full w-full shrink-0 snap-center overflow-hidden bg-sand"
            >
              <Image
                src={slide.imageDesktop} alt={slide.title} fill priority={i === 0} loading={loading}
                sizes="(min-width: 1536px) 1400px, (min-width: 640px) 100vw, 100vw"
                className={cn('object-cover', slide.imageMobile && 'hidden sm:block')}
              />
              {slide.imageMobile && (
                <Image src={slide.imageMobile} alt={slide.title} fill sizes="100vw" className="object-cover sm:hidden" />
              )}

                {slide.ctaUrl && (
                  <>
                    {/* Anywhere on the picture. Left out of the tab order when the button below exists. */}
                    <Link
                      href={slide.ctaUrl} tabIndex={here && !button ? 0 : -1} aria-hidden={Boolean(button)}
                      aria-label={slide.title} className="absolute inset-0 z-[1] cursor-pointer"
                    />
                    {button && (
                      <Link
                        href={slide.ctaUrl} tabIndex={here ? 0 : -1} aria-label={`Shop now: ${slide.title}`}
                        style={{ left: `${button.x}%`, top: `${button.y}%`, width: `${button.w}%`, height: `${button.h}%` }}
                        className={cn(
                          'absolute z-[2] cursor-pointer rounded-full transition-[transform,box-shadow] duration-200',
                          /* A thumb-sized target: the drawn button is only ~20px tall on a phone. */
                          'before:absolute before:-inset-2.5 before:content-[\'\']',
                          'hover:scale-[1.04] hover:shadow-[0_10px_28px_-6px_rgba(200,32,43,0.55)]',
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                          slide.imageMobile && 'hidden sm:block',
                        )}
                      />
                    )}
                  </>
                )}
            </li>
          );
        })}
      </ul>
      </div>

      {count > 1 && (
        <>
          {/* Beside the picture, in the page gutter, so they never sit on the artwork. */}
          {([['Previous slide', -1, 'sm:-left-5 md:-left-9'], ['Next slide', 1, 'sm:-right-5 md:-right-9']] as const).map(([label, step, side]) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={() => take(active + step)}
              className={cn('absolute top-1/2 z-10 hidden size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white text-ink shadow-card ring-1 ring-line transition-colors hover:bg-sand sm:grid', side)}
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={step < 0 ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'} />
              </svg>
            </button>
          ))}
        </>
      )}
      </div>

      {/* Dots under the picture, not on it. */}
      {count > 1 && (
        <div className="flex justify-center gap-1 py-2">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Show slide ${i + 1} of ${count}`}
              aria-current={i === active}
              onClick={() => take(i)}
              className="grid h-5 cursor-pointer place-items-center px-0.5"
            >
              <span className={cn('block h-1.5 rounded-full transition-all duration-300', i === active ? 'w-6 bg-crimson' : 'w-1.5 bg-content/25 hover:bg-content/40')} />
            </button>
          ))}
        </div>
      )}
      </div>
    </section>
  );
}
