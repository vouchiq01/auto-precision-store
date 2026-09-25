'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import { formatINR, type ProductSummary } from '@aps/shared';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { Badge } from '@/components/ui/primitives';

/**
 * A product card that behaves like an object rather than a link with a picture.
 *
 * On hover the artwork lifts and tilts very slightly toward the cursor. The
 * rotation is capped at 4 degrees: past that it stops reading as "this is a
 * physical thing" and starts reading as a gimmick.
 */
export function ProductCard({
  product, priority = false, index,
}: { product: ProductSummary; priority?: boolean; index?: number }) {
  const mediaRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const onMove = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (reduced) return;
    const media = mediaRef.current;
    if (!media) return;
    const rect = media.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    media.style.transform = `perspective(1000px) rotateX(${-py * 4}deg) rotateY(${px * 4}deg) scale(1.02)`;
  };

  const onLeave = () => {
    const media = mediaRef.current;
    if (media) media.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
  };

  const outOfStock = !product.inStock;

  return (
    <Link
      href={`/products/${product.slug}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="group relative block"
    >
      <div
        ref={mediaRef}
        className={cn(
          'relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-surface',
          'transition-transform duration-[600ms] ease-out-expo will-change-transform',
        )}
      >
        {product.primaryImage ? (
          <Image
            src={product.primaryImage.url}
            alt={product.primaryImage.alt || product.name}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
            className={cn(
              'object-cover transition-[transform,opacity] duration-[900ms] ease-out-expo',
              'group-hover:scale-[1.04]',
              outOfStock && 'opacity-45 saturate-0',
            )}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-faint">No image</div>
        )}

        {/* Wash that deepens on hover, so the type below stays readable over any photo */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-80" />

        {/* Solid backing, because these sit over an arbitrary photograph —
            an outlined pill in crimson vanishes the moment the image behind
            it is mid-tone, which is most product shots. */}
        <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
          {outOfStock
            ? <Badge tone="warning" className="border-transparent bg-surface/95 text-warning backdrop-blur-sm">Sold out</Badge>
            : product.badges.slice(0, 2).map((badge) => (
                <Badge key={badge} tone="accent" className="border-transparent bg-surface/95 text-crimson backdrop-blur-sm">
                  {badge}
                </Badge>
              ))}
        </div>

        {product.discountPercent !== null && !outOfStock && (
          <span className="numeric absolute right-4 top-4 rounded-full bg-crimson px-2.5 py-1 text-[0.6875rem] font-medium text-white">
            −{product.discountPercent}%
          </span>
        )}

        {index !== undefined && (
          <span
            aria-hidden="true"
            className="numeric absolute bottom-4 right-4 font-display text-3xl font-semibold text-white/10"
          >
            {String(index + 1).padStart(2, '0')}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow mb-1.5">{product.category.name}</p>
          <h3 className="font-display text-[1.0625rem] font-medium leading-tight tracking-[-0.015em] text-content transition-colors group-hover:text-crimson">
            {product.name}
          </h3>
          {product.tagline && (
            <p className="mt-1 line-clamp-1 text-[0.8125rem] text-muted">{product.tagline}</p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="numeric text-[0.9375rem] font-medium text-content">{formatINR(product.price)}</p>
          {product.compareAtPrice && (
            <p className="numeric text-xs text-faint line-through">{formatINR(product.compareAtPrice)}</p>
          )}
          {product.emiTeaser && (
            <p className="numeric mt-0.5 text-[0.6875rem] text-muted">from {product.emiTeaser}</p>
          )}
        </div>
      </div>

      {product.rating && (
        <p className="numeric mt-2 text-xs text-muted">
          ★ {product.rating.average.toFixed(1)}
          <span className="text-faint"> · {product.rating.count} reviews</span>
        </p>
      )}
    </Link>
  );
}
