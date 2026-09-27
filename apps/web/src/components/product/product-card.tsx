'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { formatINR, type ProductSummary } from '@aps/shared';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useCart } from '@/providers/cart-provider';
import { Badge, Spinner } from '@/components/ui/primitives';

/**
 * A product card that behaves like an object rather than a link with a picture.
 *
 * On hover the artwork lifts and tilts very slightly toward the cursor. The
 * rotation is capped at 4 degrees: past that it stops reading as "this is a
 * physical thing" and starts reading as a gimmick.
 *
 * The card is a container with a stretched link on the title, not one big <a>.
 * A <button> inside an <a> is invalid HTML and browsers disagree about what to
 * do with it, so the quick-add control could not exist until this was split.
 */
export function ProductCard({
  product, priority = false, index,
}: { product: ProductSummary; priority?: boolean; index?: number }) {
  const mediaRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { addItem } = useCart();
  const [adding, setAdding] = useState(false);

  const onMove = (event: React.MouseEvent<HTMLDivElement>) => {
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

  async function quickAdd() {
    if (!product.addableVariantId || adding) return;
    setAdding(true);
    try {
      /* The cart drawer opens itself on a successful add, which is the
         confirmation — no toast needed, and it shows the running total. */
      await addItem(product.addableVariantId);
    } catch {
      /* The cart provider surfaces the reason in the drawer. */
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="group relative" onMouseMove={onMove} onMouseLeave={onLeave}>
      {/* Wrapper carries no transform, so the control above it is not dragged
          around by the tilt and keeps a stable hit area. */}
      <div className="relative">
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

          {/* Moved to the left: the quick-add control owns the bottom-right. */}
          {index !== undefined && (
            <span
              aria-hidden="true"
              className="numeric absolute bottom-4 left-4 font-display text-3xl font-semibold text-white/10"
            >
              {String(index + 1).padStart(2, '0')}
            </span>
          )}
        </div>

        {/* ---- Quick add ---------------------------------------------------
            Always rendered rather than hover-only: a control that appears on
            hover is invisible on a touch screen and unfindable by keyboard.
            z-20 keeps it above the title's stretched link.

            Two outcomes, and the difference is deliberate. Eight of the
            eighteen tables come in two finishes, and quietly adding Graphite
            to a ₹38,400 order because it happened to sort first is a wrong
            order, not a small annoyance — those send you to choose. */}
        {!outOfStock && (
          product.addableVariantId ? (
            <button
              type="button"
              onClick={quickAdd}
              disabled={adding}
              aria-label={`Add ${product.name} to cart`}
              className={cn(
                'absolute bottom-3 right-3 z-20 grid size-11 cursor-pointer place-items-center rounded-full',
                'bg-surface/95 text-content shadow-card backdrop-blur-sm',
                'transition-colors duration-300 hover:bg-crimson hover:text-white',
                'focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60',
              )}
            >
              {adding ? <Spinner className="size-4" /> : <BagIcon />}
            </button>
          ) : (
            <Link
              href={`/products/${product.slug}`}
              aria-label={`Choose a finish for ${product.name}`}
              title="Two finishes — choose one"
              className={cn(
                'absolute bottom-3 right-3 z-20 grid size-11 place-items-center rounded-full',
                'bg-surface/95 text-content shadow-card backdrop-blur-sm',
                'transition-colors duration-300 hover:bg-content hover:text-canvas',
                'focus-visible:outline-2 focus-visible:outline-offset-2',
              )}
            >
              <SwatchIcon />
            </Link>
          )
        )}
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow mb-1.5">{product.category.name}</p>
          <h3 className="font-display text-[1.0625rem] font-medium leading-tight tracking-[-0.015em] text-content transition-colors group-hover:text-crimson">
            {/* The stretched link: the whole card is clickable, but only this
                is announced, so a screen reader hears one link per product. */}
            <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 after:content-['']">
              {product.name}
            </Link>
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
    </div>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-[1.125rem]" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M4 6.5h12l-1 9.5H5l-1-9.5z" strokeLinejoin="round" />
      <path d="M7.25 6.5V5a2.75 2.75 0 0 1 5.5 0v1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Two finishes, overlapping — "there is something to pick here". */
function SwatchIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-[1.125rem]" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="7.75" cy="10" r="4.75" />
      <circle cx="12.25" cy="10" r="4.75" />
    </svg>
  );
}
