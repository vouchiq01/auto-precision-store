'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
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
  const [picking, setPicking] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  /* Dismiss the finish picker on an outside click or Escape, like any popover. */
  useEffect(() => {
    if (!picking) return;
    const onDown = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setPicking(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setPicking(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [picking]);

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

  /* Tolerate a payload without options rather than taking the whole
     collection page down with it. Pages are cached and revalidated in the
     background, so during a deploy a card can legitimately be handed a
     response shaped by the previous release. */
  const sellable = (product.options ?? []).filter((option) => option.inStock);

  async function add(variantId: string) {
    if (adding) return;
    setAdding(true);
    try {
      /* The cart drawer opens itself on a successful add, which is the
         confirmation — no toast needed, and it shows the running total. */
      await addItem(variantId);
      setPicking(false);
    } catch {
      /* The cart provider surfaces the reason in the drawer. */
    } finally {
      setAdding(false);
    }
  }

  /* One variant goes straight in. More than one asks first — on the card,
     because eight of the eighteen tables come in two finishes and adding
     whichever sorts first to a ₹38,400 order is a wrong order, not a small
     annoyance. Asking costs one tap; guessing costs a return shipment. */
  function onAddClick() {
    if (sellable.length === 1) { void add(sellable[0]!.id); return; }
    setPicking((open) => !open);
  }

  return (
    <div
      className="group relative rounded-2xl border border-line bg-surface p-2 shadow-card transition-shadow duration-500 hover:shadow-lift sm:p-2.5"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {/* Wrapper carries no transform, so the control above it is not dragged
          around by the tilt and keeps a stable hit area. */}
      <div className="relative">
        <div
          ref={mediaRef}
          className={cn(
            'relative aspect-[4/5] overflow-hidden rounded-xl bg-sand',
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
          {/* On a phone the card is ~175px wide: one badge across the top, and
              the discount pill drops to the bottom-left (below) so the two never
              collide. The second badge and the top-right pill join from `sm`. */}
          <div className="absolute left-2.5 right-2.5 top-2.5 flex flex-wrap gap-1.5 sm:left-4 sm:right-auto sm:top-4">
            {outOfStock
              ? <Badge tone="warning" className="border-transparent bg-surface/95 text-warning backdrop-blur-sm">Sold out</Badge>
              : product.badges.slice(0, 2).map((badge, badgeIndex) => (
                  <Badge
                    key={badge}
                    tone="accent"
                    className={cn(
                      'border-transparent bg-surface/95 text-crimson backdrop-blur-sm',
                      badgeIndex > 0 && 'hidden sm:inline-flex',
                    )}
                  >
                    {badge}
                  </Badge>
                ))}
          </div>

          {product.discountPercent !== null && !outOfStock && (
            <span className="numeric absolute bottom-2.5 left-2.5 rounded-full bg-crimson px-2 py-0.5 text-[0.625rem] font-medium text-white sm:bottom-auto sm:left-auto sm:right-4 sm:top-4 sm:px-2.5 sm:py-1 sm:text-[0.6875rem]">
              −{product.discountPercent}%
            </span>
          )}

          {/* Moved to the left: the quick-add control owns the bottom-right.
              Decorative, and clutter on a small card, so desktop only. */}
          {index !== undefined && (
            <span
              aria-hidden="true"
              className="numeric absolute bottom-4 left-4 hidden font-display text-3xl font-semibold text-white/10 sm:block"
            >
              {String(index + 1).padStart(2, '0')}
            </span>
          )}
        </div>

        {/* ---- Add to cart -------------------------------------------------
            Always rendered rather than hover-only: a control that appears on
            hover is invisible on a touch screen and unfindable by keyboard.
            z-20 keeps it above the title's stretched link. */}
        {!outOfStock && sellable.length > 0 && (
          <div ref={pickerRef} className="absolute bottom-2 right-2 z-20 sm:bottom-3 sm:right-3">
            {picking && (
              <div
                role="group"
                aria-label={`Choose a finish for ${product.name}`}
                className="absolute bottom-full right-0 mb-2 w-44 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-lift"
              >
                <p className="px-2 pb-1.5 pt-1 text-[0.6875rem] uppercase tracking-[0.14em] text-faint">
                  Choose a finish
                </p>
                {sellable.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={adding}
                    onClick={() => void add(option.id)}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-content transition-colors hover:bg-sand disabled:opacity-60"
                  >
                    <span
                      aria-hidden="true"
                      className="size-3.5 shrink-0 rounded-full border border-line-strong"
                      style={option.hexColour ? { backgroundColor: option.hexColour } : undefined}
                    />
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={onAddClick}
              disabled={adding}
              aria-expanded={sellable.length > 1 ? picking : undefined}
              aria-label={
                sellable.length > 1
                  ? `Add ${product.name} to cart — choose a finish`
                  : `Add ${product.name} to cart`
              }
              className={cn(
                'grid size-10 cursor-pointer place-items-center rounded-full sm:size-11',
                'bg-surface/95 text-content shadow-card backdrop-blur-sm',
                'transition-colors duration-300 hover:bg-crimson hover:text-white',
                'focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60',
                picking && 'bg-crimson text-white',
              )}
            >
              {adding ? <Spinner className="size-4" /> : <BagIcon />}
            </button>
          </div>
        )}
      </div>

      {/* Stacked on a phone — name over price — because two columns side by
          side leave no room for a title and a price on one row. From `sm` up it
          goes back to name left, price right. */}
      <div className="mt-3 flex flex-col gap-1.5 px-1 sm:mt-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="eyebrow mb-1 sm:mb-1.5">{product.category.name}</p>
          <h3 className="font-display text-[0.9375rem] font-medium leading-tight tracking-[-0.015em] text-content transition-colors group-hover:text-crimson sm:text-[1.0625rem]">
            {/* The stretched link: the whole card is clickable, but only this
                is announced, so a screen reader hears one link per product. */}
            <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 after:content-['']">
              {product.name}
            </Link>
          </h3>
          {product.tagline && (
            <p className="mt-1 hidden line-clamp-1 text-[0.8125rem] text-muted sm:block">{product.tagline}</p>
          )}
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2 sm:block sm:shrink-0 sm:text-right">
          <p className="numeric text-base font-semibold text-content sm:text-[1.0625rem]">{formatINR(product.price)}</p>
          {product.compareAtPrice && (
            <p className="numeric text-xs text-faint line-through">{formatINR(product.compareAtPrice)}</p>
          )}
          {product.emiTeaser && (
            <p className="numeric mt-0.5 hidden text-[0.6875rem] text-muted sm:block">from {product.emiTeaser}</p>
          )}
        </div>
      </div>

      {product.rating && (
        <p className="numeric mt-1.5 px-1 pb-1 text-xs text-muted sm:mt-2">
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
