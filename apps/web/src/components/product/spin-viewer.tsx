'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

/**
 * 360° product viewer.
 *
 * All frames are rendered into the DOM at once and swapped by opacity rather
 * than by changing a single `src`. Swapping src causes a visible flash on every
 * frame the first time round the loop, because the browser has not decoded the
 * next image yet — and a spin that flickers reads as broken, not premium.
 *
 * Input is pointer-based so mouse, touch and pen all work through one path;
 * `setPointerCapture` keeps the drag alive when the cursor leaves the element.
 * Arrow keys drive it too, so the control is not mouse-only.
 */
export function SpinViewer({
  slug,
  frameFiles,
  alt,
  className,
}: {
  slug: string;
  /** Filenames from the product's spin/frames.json, in viewing order. */
  frameFiles: string[];
  alt: string;
  className?: string;
}) {
  const frames = frameFiles.length;
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [demoDone, setDemoDone] = useState(false);
  const [loaded, setLoaded] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastX = useRef(0);
  const accumulated = useRef(0);
  const reduced = useReducedMotion();

  const frameUrl = (i: number) => `/products/${slug}/spin/${frameFiles[i]}`;

  const advance = useCallback((delta: number) => {
    setIndex((current) => (((current + delta) % frames) + frames) % frames);
  }, [frames]);

  /* One slow demonstration lap, then it rests.
     A continuous spin is the wrong behaviour here: at any speed fast enough to
     look deliberate it is distracting to read beside, and it never lets the
     viewer actually look at the product. So it turns through a single
     revolution at a pace you can follow — roughly seven seconds — and stops.
     Any interaction cancels it immediately and it does not resume. */
  useEffect(() => {
    if (reduced || hasInteracted || loaded < frames || demoDone) return;

    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      advance(1);
      if (step >= frames) {
        clearInterval(timer);
        setDemoDone(true);
      }
    }, frames > 12 ? 190 : 900);

    return () => clearInterval(timer);
  }, [reduced, hasInteracted, loaded, frames, advance, demoDone]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    setHasInteracted(true);
    lastX.current = event.clientX;
    accumulated.current = 0;
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const width = containerRef.current?.clientWidth ?? 1;
    // One full drag across the element is exactly one revolution.
    const pxPerFrame = width / frames;
    accumulated.current += event.clientX - lastX.current;
    lastX.current = event.clientX;

    while (Math.abs(accumulated.current) >= pxPerFrame) {
      const direction = accumulated.current > 0 ? 1 : -1;
      advance(-direction);
      accumulated.current -= direction * pxPerFrame;
    }
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft') { advance(-1); setHasInteracted(true); event.preventDefault(); }
    if (event.key === 'ArrowRight') { advance(1); setHasInteracted(true); event.preventDefault(); }
  }

  const ready = loaded >= frames;

  return (
    <div className={cn('relative', className)}>
      <div
        ref={containerRef}
        role="slider"
        tabIndex={0}
        aria-label={`${alt} — 360 degree view. Drag, or use the left and right arrow keys, to rotate.`}
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round((index / frames) * 360)}
        aria-valuetext={`Rotated ${Math.round((index / frames) * 360)} degrees`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className={cn(
          'relative aspect-square touch-pan-y select-none overflow-hidden rounded-3xl',
          'border border-ink-line bg-ink-raised',
          dragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
      >
        {Array.from({ length: frames }, (_, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={frameUrl(i)}
            alt={i === 0 ? alt : ''}
            aria-hidden={i !== 0}
            draggable={false}
            onLoad={() => setLoaded((n) => n + 1)}
            onError={() => setLoaded((n) => n + 1)}
            className={cn(
              /* contain, not cover: these are product shots on their own
                 backgrounds and cropping them cuts the legs off the table. */
              'absolute inset-0 h-full w-full bg-white object-contain',
              i === index ? 'opacity-100' : 'opacity-0',
            )}
          />
        ))}

        {!ready && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="numeric text-xs text-steel-dim">
              Loading 360° view… {Math.round((loaded / frames) * 100)}%
            </span>
          </div>
        )}

        {/* Drag affordance, retired once they have worked it out */}
        {ready && !hasInteracted && (
          <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
            <span className="flex items-center gap-2 rounded-full border border-ink-line bg-ink/80 px-4 py-2 text-xs text-bone backdrop-blur">
              <span aria-hidden="true">↔</span> Drag to rotate
            </span>
          </div>
        )}

        <span className="pointer-events-none absolute left-5 top-5 rounded-full border border-ink-line bg-ink/80 px-3 py-1.5 text-[0.625rem] uppercase tracking-[0.14em] text-steel backdrop-blur">
          {frames} views
        </span>
      </div>

      {/* Scrubber — the honest fallback for anyone who cannot drag */}
      <label className="mt-3 flex items-center gap-3">
        <span className="sr-only">Rotate {alt}</span>
        <input
          type="range"
          min={0}
          max={frames - 1}
          value={index}
          onChange={(event) => { setIndex(Number(event.target.value)); setHasInteracted(true); }}
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-ink-line accent-[#CE2B2B]"
        />
        <span className="numeric w-12 shrink-0 text-right text-xs text-steel-dim">
          {index + 1}/{frames}
        </span>
      </label>
    </div>
  );
}
