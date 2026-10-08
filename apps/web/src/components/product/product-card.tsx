'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { formatINR, type ProductSummary } from '@aps/shared';
import { cn } from '@/lib/cn';
import { useCart } from '@/providers/cart-provider';
import { Badge, Spinner } from '@/components/ui/primitives';
import { PhotoPlaceholder } from './photo-placeholder';

/**
 * A product card built to be compared, not admired.
 *
 * Everything a shopper weighs sits in the same place on every card: category,
 * name, rating, price with what they save, then one obvious button. The photo
 * carries a single badge. The earlier card put the cart action in a small
 * round icon on the photo and tilted toward the cursor; on a phone the icon
 * was easy to miss and the tilt did nothing, so both went.
 *
 * The card is a container with a stretched link on the title, not one large
 * <a>: a <button> inside an <a> is invalid HTML and browsers disagree about it.
 * Keep the button above the stretched link's ::after (z-20).
 */
export function ProductCard({
  product, priority = false, className,
}: { product: ProductSummary; priority?: boolean; className?: string }) {
  const { addItem } = useCart();
  const [adding, setAdding] = useState(false);
  const [chosenId, setChosenId] = useState<string | null>(null);

  const outOfStock = !product.inStock;

  /* Tolerate a payload without options rather than taking the whole
     collection page down with it. Pages are cached and revalidated in the
     background, so during a deploy a card can legitimately be handed a
     response shaped by the previous release. */
  const sellable = (product.options ?? []).filter((option) => option.inStock);

  /* The finish is always visible on the card: swatches with the chosen one
     ringed and named. The first finish is pre-selected so the button can say
     one plain thing, "Add to cart" — an earlier "Choose finish" button that
     opened a pop-up read as confusing. Because the choice is on screen, and
     repeated on the cart line, a default is no longer a hidden guess. */
  const selected = sellable.find((option) => option.id === chosenId) ?? sellable[0];

  async function add() {
    if (adding || !selected) return;
    setAdding(true);
    try {
      /* The cart drawer opens itself on a successful add, which is the
         confirmation — no toast needed, and it shows the running total. */
      await addItem(selected.id);
    } catch {
      /* The cart provider surfaces the reason in the drawer. */
    } finally {
      setAdding(false);
    }
  }

  const canAdd = !outOfStock && sellable.length > 0;

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface',
        'shadow-card transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-lift',
        className,
      )}
    >
      {/* ---- Photo ---------------------------------------------------- */}
      <div className="relative aspect-square overflow-hidden border-b border-line bg-white">
        {product.primaryImage ? (
          <Image
            src={product.primaryImage.url}
            alt={product.primaryImage.alt || product.name}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
            className={cn(
              'object-contain p-3 transition-transform duration-700 ease-out-expo group-hover:scale-[1.03] sm:p-5',
              outOfStock && 'opacity-45 saturate-0',
            )}
          />
        ) : (
          <PhotoPlaceholder />
        )}

        {/* One badge, solid backing: it sits over an arbitrary photograph, and
            an outlined pill vanishes the moment the image behind it is mid-tone. */}
        <div className="absolute left-2.5 top-2.5 flex max-w-[calc(100%-1.25rem)] sm:left-3 sm:top-3">
          {outOfStock ? (
            <Badge tone="warning" className="border-transparent bg-surface/95 text-warning backdrop-blur-sm">Sold out</Badge>
          ) : product.badges[0] ? (
            <Badge tone="accent" className="border-transparent bg-amber text-ink backdrop-blur-sm">
              {product.badges[0]}
            </Badge>
          ) : null}
        </div>
      </div>

      {/* ---- Details -------------------------------------------------- */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="eyebrow text-crimson!">{product.category.name}</p>

        <h3 className="mt-1.5 line-clamp-2 min-h-[2.5rem] font-display text-[0.9375rem] font-medium leading-tight tracking-[-0.015em] text-content transition-colors group-hover:text-crimson sm:text-base">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {product.name}
          </Link>
        </h3>

        {product.rating ? (
          <p className="numeric mt-1.5 flex items-center gap-1 text-xs text-muted">
            <StarIcon />
            <span className="font-medium text-content">{product.rating.average.toFixed(1)}</span>
            <span className="text-faint">({product.rating.count})</span>
          </p>
        ) : null}

        {/* Price and what you save first; the old price drops to its own line on
            a narrow card rather than pushing the saving off the edge. */}
        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="numeric text-[1.0625rem] font-semibold tracking-tight text-content sm:text-lg">{formatINR(product.price)}</span>
          {product.discountPercent !== null && !outOfStock && (
            <span className="numeric order-2 rounded-md bg-success/10 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-success sm:order-3">
              {product.discountPercent}% off
            </span>
          )}
          {product.compareAtPrice && (
            <span className="numeric order-3 text-xs text-faint line-through sm:order-2">{formatINR(product.compareAtPrice)}</span>
          )}
        </div>

        <p className="numeric mt-1 h-4 text-[0.6875rem] text-muted">
          {product.emiTeaser ? `EMI from ${product.emiTeaser}` : ''}
        </p>

        {/* ---- Finish + add to cart ---------------------------------- */}
        <div className="relative z-20 mt-auto pt-3">
          {sellable.length > 1 && (
            <div role="radiogroup" aria-label={`Finish for ${product.name}`} className="mb-2.5 flex items-center gap-2">
              {sellable.map((option) => {
                const active = option.id === selected?.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={option.label}
                    title={option.label}
                    onClick={() => setChosenId(option.id)}
                    className={cn(
                      'grid size-7 cursor-pointer place-items-center rounded-full border transition-shadow',
                      active ? 'border-content ring-2 ring-content/15' : 'border-line-strong hover:ring-2 hover:ring-content/10',
                    )}
                  >
                    <span
                      className="size-4 rounded-full border border-black/10"
                      style={option.hexColour ? { backgroundColor: option.hexColour } : undefined}
                    />
                  </button>
                );
              })}
              <span className="min-w-0 truncate text-xs text-muted">{selected?.label}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => void add()}
            disabled={!canAdd || adding}
            aria-label={canAdd ? `Add ${product.name}${sellable.length > 1 ? ` in ${selected?.label}` : ''} to cart` : `${product.name} is sold out`}
            className={cn(
              'flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-[0.8125rem] font-medium',
              'transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2',
              canAdd
                ? 'bg-crimson text-white hover:bg-crimson-deep active:scale-[0.98]'
                : 'cursor-not-allowed bg-sand text-faint',
            )}
          >
            {adding ? <Spinner className="size-4" /> : canAdd ? <BagIcon /> : null}
            {canAdd ? 'Add to cart' : 'Sold out'}
          </button>
        </div>
      </div>
    </article>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M4 6.5h12l-1 9.5H5l-1-9.5z" strokeLinejoin="round" />
      <path d="M7.25 6.5V5a2.75 2.75 0 0 1 5.5 0v1.5" strokeLinecap="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-3.5 text-amber-deep" fill="currentColor" aria-hidden="true">
      <path d="M10 1.8l2.4 5 5.4.7-4 3.8 1 5.4L10 14l-4.8 2.7 1-5.4-4-3.8 5.4-.7z" />
    </svg>
  );
}
