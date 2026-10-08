'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { ProductImage } from '@aps/shared';
import { cn } from '@/lib/cn';
import { PhotoPlaceholder } from './photo-placeholder';
import { SpinViewer } from './spin-viewer';

/**
 * Product media.
 *
 * The frame is sticky on desktop so the image stays with the reader while they
 * work down a long specification — the single most useful thing a product page
 * can do when the copy is this dense.
 */
export function ProductGallery({
  images, name, spinSlug, spinFrames,
}: {
  images: ProductImage[];
  name: string;
  /** When set, a 360° tab is offered alongside the stills. */
  spinSlug?: string | null;
  /** Frame filenames from the product's spin/frames.json, in viewing order. */
  spinFrames?: string[];
}) {
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<'stills' | 'spin'>('stills');
  const current = images[active] ?? images[0];

  return (
    <div className="min-w-0 lg:sticky lg:top-36 lg:self-start">
      {spinSlug && spinFrames && spinFrames.length > 1 && (
        <div className="mb-3 inline-flex rounded-full border border-line p-1" role="tablist" aria-label="View mode">
          {([['stills', 'Photos'], ['spin', '360° view']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                'rounded-full px-4 py-1.5 text-xs transition-colors duration-300',
                mode === value ? 'bg-surface text-content' : 'text-muted hover:text-content',
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
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-line bg-white">
        {current ? (
          <Image
            key={current.id}
            src={current.url}
            alt={current.alt || name}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="animate-[fadeIn_0.5s_var(--ease-out-expo)] object-contain p-6 sm:p-10"
          />
        ) : (
          <PhotoPlaceholder />
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label={`${name} images`}>
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`View image ${i + 1} of ${images.length}`}
              onClick={() => setActive(i)}
              className={cn(
                'relative size-20 overflow-hidden rounded-xl border bg-white transition-colors duration-300',
                i === active
                  ? 'border-line-strong'
                  : 'border-line opacity-60 hover:opacity-100',
              )}
            >
              <Image src={image.url} alt="" fill sizes="80px" className="object-contain p-1.5" />
            </button>
          ))}
        </div>
      )}

      </>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </div>
  );
}
