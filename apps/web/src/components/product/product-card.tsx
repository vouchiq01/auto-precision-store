'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { formatINR, type ProductSummary } from '@aps/shared';
import { cn } from '@/lib/cn';
import { addErrorMessage, flyToCart, showCartMessage } from '@/lib/fly-to-cart';
import { useCart } from '@/providers/cart-provider';
import { Badge, Spinner } from '@/components/ui/primitives';
import { PhotoPlaceholder } from './photo-placeholder';
import { ProductTag, pickCardTag } from './product-tag';
import { Stars } from './stars';
import { WishlistButton } from './wishlist-button';

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
  const [justAdded, setJustAdded] = useState(false);
  const photoRef = useRef<HTMLDivElement>(null);
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
    /* Optimistic: the photograph flies and the button confirms at once, while the
       server (a second or more on a phone) catches up. A failure undoes it. */
    flyToCart(photoRef.current);
    setJustAdded(true);
    try {
      await addItem(selected.id);
      setTimeout(() => setJustAdded(false), 1400);
    } catch (error) {
      setJustAdded(false);
      showCartMessage(addErrorMessage(error));
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
      <div ref={photoRef} className="relative aspect-[4/3] overflow-hidden border-b border-line bg-white sm:aspect-square">
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

        {/* One tag (Hot / Best Seller / New / Trending), each its own colour and icon, solid so it
            reads over any photograph. Sold out takes its place when there is no stock. */}
        <div className="absolute left-2.5 top-2.5 flex max-w-[calc(100%-3.75rem)] sm:left-3 sm:top-3">
          {outOfStock ? (
            <Badge tone="warning" className="border-transparent bg-surface/95 text-warning backdrop-blur-sm">Sold out</Badge>
          ) : pickCardTag(product.badges) ? (
            <ProductTag tag={pickCardTag(product.badges)!} />
          ) : null}
        </div>

        {/* Above the stretched link (z-20), so a tap on the heart saves — it
            never opens the product. */}
        <WishlistButton productId={product.id} name={product.name} className="absolute right-2 top-2 z-20 sm:right-3 sm:top-3" />
      </div>

      {/* ---- Details -------------------------------------------------- */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="eyebrow text-crimson!">{product.category.name}</p>

        <h3 className="mt-1.5 line-clamp-2 min-h-[2.5rem] font-display text-[0.9375rem] font-medium leading-tight tracking-[-0.015em] text-content transition-colors group-hover:text-crimson sm:text-base">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {product.name}
          </Link>
        </h3>

        {/* The average and count come from published reviews only. With none yet the
            stars stay empty and say so — the shop never invents a rating. */}
        {product.rating ? (
          <p className="numeric mt-1 flex items-center gap-1.5 whitespace-nowrap text-xs text-muted sm:mt-1.5" aria-label={`Rated ${product.rating.average.toFixed(1)} out of 5 from ${product.rating.count} ${product.rating.count === 1 ? 'review' : 'reviews'}`}>
            <Stars value={product.rating.average} />
            <span className="font-semibold text-content">{product.rating.average.toFixed(1)}</span>
            <span className="text-faint">({product.rating.count})</span>
          </p>
        ) : (
          <p className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-xs text-faint sm:mt-1.5">
            <Stars value={0} />
            <span className="hidden sm:inline">No reviews yet</span>
          </p>
        )}

        {/* Price first, then the saving in green and the old price struck through.
            On a narrow card the old price takes its own line; from `sm` all three
            sit on one. */}
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0 sm:mt-2">
          <span className="numeric text-[1.0625rem] font-semibold tracking-tight text-content sm:text-lg">{formatINR(product.price)}</span>
          {product.discountPercent !== null && !outOfStock && (
            <span className="numeric text-xs font-semibold text-success">{product.discountPercent}% off</span>
          )}
          {product.compareAtPrice && (
            <span className="numeric basis-full text-[0.6875rem] text-faint sm:order-2 sm:basis-auto sm:text-xs">
              <span className="sm:hidden">M.R.P. </span><span className="line-through">{formatINR(product.compareAtPrice)}</span>
            </span>
          )}
        </div>

        {/* One honest line: "Only N left" when the chosen finish really is nearly
            gone; otherwise what you save, and on larger cards the EMI. */}
        {(() => {
          const left = selected?.stockLeft ?? null;
          const save = product.compareAtPrice && product.compareAtPrice > product.price ? product.compareAtPrice - product.price : 0;
          if (left !== null && !outOfStock) {
            return <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-crimson"><span className="size-1.5 rounded-full bg-crimson" aria-hidden="true" />Only {left} left</p>;
          }
          if (save > 0 && !outOfStock) {
            return <p className="numeric mt-1 hidden text-xs font-medium text-success sm:block">You save {formatINR(save)}</p>;
          }
          return product.emiTeaser ? <p className="numeric mt-1 hidden text-[0.6875rem] text-muted sm:block">EMI from {product.emiTeaser}</p> : null;
        })()}

        {/* ---- Finish + add to cart ---------------------------------- */}
        <div className="relative z-20 mt-auto pt-2 sm:pt-3">
          {sellable.length > 1 && (
            <div role="radiogroup" aria-label={`Finish for ${product.name}`} className="mb-2 flex items-center gap-1.5 sm:mb-2.5 sm:gap-2">
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
                      'grid size-6 cursor-pointer place-items-center rounded-full border transition-shadow sm:size-7',
                      active ? 'border-content ring-2 ring-content/15' : 'border-line-strong hover:ring-2 hover:ring-content/10',
                    )}
                  >
                    <span
                      className="size-3.5 rounded-full border border-black/10 sm:size-4"
                      style={option.hexColour ? { backgroundColor: option.hexColour } : undefined}
                    />
                  </button>
                );
              })}
              <span className="hidden min-w-0 truncate text-xs text-muted sm:inline">{selected?.label}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => void add()}
            disabled={!canAdd || adding}
            aria-label={canAdd ? `Add ${product.name}${sellable.length > 1 ? ` in ${selected?.label}` : ''} to cart` : `${product.name} is sold out`}
            className={cn(
              'flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-[0.8125rem] font-medium sm:h-10',
              'transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2',
              canAdd
                ? 'bg-crimson text-white hover:bg-crimson-deep active:scale-[0.98]'
                : 'cursor-not-allowed bg-sand text-faint',
            )}
          >
            {adding && !justAdded ? <Spinner className="size-4" /> : canAdd ? <BagIcon /> : null}
            {!canAdd ? 'Sold out' : justAdded ? 'Added ✓' : 'Add to cart'}
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
