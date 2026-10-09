'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ProductImage } from '@aps/shared';
import { cn } from '@/lib/cn';
import { PhotoPlaceholder } from './photo-placeholder';
import { SpinViewer } from './spin-viewer';
import { WishlistButton } from './wishlist-button';

/**
 * Product media.
 *
 * The big picture is a swipeable strip (native scroll-snap, so a phone swipes it and a laptop
 * trackpad, the arrows or the arrow keys move it). A counter and, on a phone, dots show where
 * you are; the thumbnails below jump to a picture and follow along. Tapping the picture opens
 * a full-screen viewer with the same controls, for looking closely.
 *
 * Every picture is shown whole on a white stage (`object-contain`, never cropped) — see
 * "Product images" in CLAUDE.md. The frame is sticky on desktop so it stays with the reader
 * while they work down a long specification.
 */
export function ProductGallery({
  images, name, productId, spinSlug, spinFrames,
}: {
  images: ProductImage[];
  name: string;
  /** Enables the save-to-wishlist heart on the photo. */
  productId?: string;
  /** When set, a 360° tab is offered alongside the stills. */
  spinSlug?: string | null;
  /** Frame filenames from the product's spin/frames.json, in viewing order. */
  spinFrames?: string[];
}) {
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<'stills' | 'spin'>('stills');
  const [zoomed, setZoomed] = useState(false);
  const track = useRef<HTMLUListElement>(null);
  const thumbs = useRef<HTMLDivElement>(null);
  const count = images.length;

  const goTo = useCallback((index: number, smooth = true) => {
    const el = track.current;
    if (!el || count === 0) return;
    const next = Math.max(0, Math.min(count - 1, index));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: next * el.clientWidth, behavior: smooth && !reduce ? 'smooth' : 'auto' });
  }, [count]);

  /* Whichever way the strip moved (swipe, arrow, thumbnail), the rest follows it. */
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
  }, [mode]);

  /* Keep the active thumbnail in view. */
  useEffect(() => {
    const row = thumbs.current;
    const thumb = row?.children[active] as HTMLElement | undefined;
    if (!row || !thumb) return;
    row.scrollTo({ left: thumb.offsetLeft - (row.clientWidth - thumb.clientWidth) / 2, behavior: 'smooth' });
  }, [active]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); goTo(active + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(active - 1); }
  };

  const arrow = 'absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/95 text-content shadow-card ring-1 ring-line transition-[opacity,background-color] hover:bg-white disabled:pointer-events-none disabled:opacity-0 sm:grid';
  const chevron = (left: boolean) => (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={left ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'} />
    </svg>
  );

  return (
    <div className="min-w-0 lg:sticky lg:top-36 lg:self-start">
      {spinSlug && spinFrames && spinFrames.length > 1 && (
        <div className="mb-3 inline-flex rounded-full border border-line bg-surface p-1" role="tablist" aria-label="View mode">
          {([['stills', 'Photos'], ['spin', '360° view']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                'cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-300',
                mode === value ? 'bg-ink text-on-ink' : 'text-muted hover:text-content',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {spinSlug && spinFrames && mode === 'spin' ? (
        <SpinViewer slug={spinSlug} frameFiles={spinFrames} alt={name} />
      ) : (
        <>
          <div
            data-fly-source
            role="group"
            aria-roledescription="carousel"
            aria-label={`${name} photos`}
            tabIndex={0}
            onKeyDown={onKeyDown}
            className="group relative overflow-hidden border-y border-line bg-white outline-none sm:rounded-3xl sm:border focus-visible:ring-2 focus-visible:ring-crimson/40"
          >
            {count > 0 ? (
              <ul
                ref={track}
                className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {images.map((image, i) => (
                  <li
                    key={image.id}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${i + 1} of ${count}`}
                    className="relative aspect-[4/3] w-full shrink-0 snap-center sm:aspect-square"
                  >
                    <button
                      type="button"
                      onClick={() => setZoomed(true)}
                      aria-label={`Enlarge photo ${i + 1} of ${count}`}
                      tabIndex={i === active ? 0 : -1}
                      className="absolute inset-0 cursor-zoom-in"
                    >
                      <Image
                        src={image.url}
                        alt={image.alt || name}
                        fill
                        loading={Math.abs(i - active) <= 1 ? 'eager' : 'lazy'}
                        fetchPriority={i === 0 ? 'high' : 'auto'}
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        data-fly-active={i === active ? '' : undefined}
                        className="object-contain p-4 sm:p-10"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="relative aspect-[4/3] sm:aspect-square"><PhotoPlaceholder /></div>
            )}

            {productId && <WishlistButton productId={productId} name={name} className="absolute right-3 top-3 z-10 sm:right-4 sm:top-4" />}

            {count > 1 && (
              <>
                <button type="button" aria-label="Previous photo" disabled={active === 0} onClick={() => goTo(active - 1)} className={cn(arrow, 'left-3')}>{chevron(true)}</button>
                <button type="button" aria-label="Next photo" disabled={active === count - 1} onClick={() => goTo(active + 1)} className={cn(arrow, 'right-3')}>{chevron(false)}</button>

                <span className="numeric absolute bottom-3 left-3 z-10 rounded-full bg-ink/70 px-2.5 py-1 text-[0.6875rem] font-medium text-white backdrop-blur-sm sm:bottom-4 sm:left-4">
                  {active + 1} / {count}
                </span>

                {/* Dots: the phone's version of the thumbnails. */}
                <div className="absolute inset-x-0 bottom-3.5 z-10 flex justify-center gap-1.5 sm:hidden">
                  {images.map((image, i) => (
                    <span
                      key={image.id}
                      aria-hidden="true"
                      className={cn('block h-1.5 rounded-full transition-all duration-300', i === active ? 'w-5 bg-ink' : 'w-1.5 bg-ink/25')}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {count > 1 && (
            <div
              ref={thumbs}
              role="tablist"
              aria-label={`${name} images`}
              className="mt-3 hidden gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex [&::-webkit-scrollbar]:hidden"
            >
              {images.map((image, i) => (
                <button
                  key={image.id}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  aria-label={`View image ${i + 1} of ${count}`}
                  onClick={() => goTo(i)}
                  className={cn(
                    'relative size-[4.5rem] shrink-0 cursor-pointer overflow-hidden rounded-xl border bg-white transition-[border-color,opacity,box-shadow] duration-300',
                    i === active ? 'border-crimson opacity-100 shadow-card ring-1 ring-crimson/30' : 'border-line opacity-70 hover:opacity-100',
                  )}
                >
                  <Image src={image.url} alt="" fill sizes="72px" className="object-contain p-1.5" />
                </button>
              ))}
            </div>
          )}

          {zoomed && count > 0 && (
            <Lightbox
              images={images} name={name} start={active}
              onClose={(last) => { setZoomed(false); goTo(last, false); }}
            />
          )}
        </>
      )}
    </div>
  );
}

/** Full-screen viewer: the same pictures, big. Esc closes, arrows (keys or buttons) and swipes move. */
function Lightbox({
  images, name, start, onClose,
}: { images: ProductImage[]; name: string; start: number; onClose: (last: number) => void }) {
  const [index, setIndex] = useState(start);
  const touch = useRef<number | null>(null);
  const count = images.length;
  const go = useCallback((delta: number) => setIndex((i) => Math.max(0, Math.min(count - 1, i + delta))), [count]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose(index);
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [index, go, onClose]);

  const image = images[index]!;
  /* The gallery is sticky, which makes its own stacking context — inside it, z-index cannot lift the
     viewer above the site header. Rendered into <body> instead. */
  const btn = 'absolute z-10 grid size-11 cursor-pointer place-items-center rounded-full bg-white/95 text-content shadow-lift transition-opacity hover:bg-white disabled:pointer-events-none disabled:opacity-0';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${name} photos, enlarged`}
      className="fixed inset-0 z-[80] flex flex-col bg-ink/95 backdrop-blur-sm"
      onClick={() => onClose(index)}
    >
      <div className="flex items-center justify-between px-4 py-3 text-on-ink" onClick={(e) => e.stopPropagation()}>
        <span className="numeric text-sm">{index + 1} / {count}</span>
        <button type="button" onClick={() => onClose(index)} aria-label="Close" className="grid size-10 cursor-pointer place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20">
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" /></svg>
        </button>
      </div>

      <div
        className="relative mx-auto mb-4 w-full max-w-5xl flex-1 px-3 sm:px-14"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => { touch.current = e.touches[0]?.clientX ?? null; }}
        onTouchEnd={(e) => {
          const from = touch.current; touch.current = null;
          const to = e.changedTouches[0]?.clientX;
          if (from !== null && to !== undefined && Math.abs(to - from) > 50) go(to < from ? 1 : -1);
        }}
      >
        <div className="relative size-full overflow-hidden rounded-2xl bg-white">
          <Image key={image.id} src={image.url} alt={image.alt || name} fill sizes="100vw" className="object-contain p-4 sm:p-8" priority />
        </div>
        {count > 1 && (
          <>
            <button type="button" aria-label="Previous photo" disabled={index === 0} onClick={() => go(-1)} className={cn(btn, 'left-0 top-1/2 hidden -translate-y-1/2 sm:grid')}>
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5" /></svg>
            </button>
            <button type="button" aria-label="Next photo" disabled={index === count - 1} onClick={() => go(1)} className={cn(btn, 'right-0 top-1/2 hidden -translate-y-1/2 sm:grid')}>
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex justify-center gap-1.5 pb-5" onClick={(e) => e.stopPropagation()}>
          {images.map((img, i) => (
            <button
              key={img.id} type="button" aria-label={`Photo ${i + 1}`} onClick={() => setIndex(i)}
              className="grid h-5 cursor-pointer place-items-center px-0.5"
            >
              <span className={cn('block h-1.5 rounded-full transition-all', i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/40')} />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
