'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { formatINR, type ProductDetail } from '@aps/shared';
import { cn } from '@/lib/cn';
import { addErrorMessage, flyToCart, showCartMessage } from '@/lib/fly-to-cart';
import { useCart } from '@/providers/cart-provider';
import { Button } from '@/components/ui/button';

/**
 * Appears once the main add-to-cart button has scrolled out of view, so the
 * action is always one tap away through a very long page — without duplicating
 * a second button on screen while the first is still visible.
 */
export function StickyBar({ product }: { product: ProductDetail }) {
  const [visible, setVisible] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    const target = document.querySelector('[data-add-to-cart]');
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry?.isIntersecting),
      { rootMargin: '-80px 0px 0px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const variant = product.variants.find((v) => v.inStock) ?? product.variants[0];
  if (!variant) return null;

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/92 backdrop-blur-xl',
        'transition-transform duration-500 ease-out-expo',
        visible ? 'translate-y-0' : 'translate-y-full',
      )}
      aria-hidden={!visible}
    >
      <div className="shell flex items-center justify-between gap-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex min-w-0 items-center gap-3">
          {product.images[0] && (
            <span className="relative hidden size-11 shrink-0 overflow-hidden rounded-lg border border-line bg-white sm:block">
              <Image src={product.images[0].url} alt="" fill sizes="44px" className="object-contain p-1" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-content">{product.name}</p>
            <p className="numeric text-sm font-semibold text-content">
              {formatINR(variant.price)}
              {variant.compareAtPrice && variant.compareAtPrice > variant.price && (
                <span className="ml-1.5 text-xs font-normal text-faint line-through">{formatINR(variant.compareAtPrice)}</span>
              )}
            </p>
          </div>
        </div>

        <Button
          size="md"
          onClick={(event) => {
            /* Optimistic: fly now, explain if the server refuses. */
            flyToCart(document.querySelector('[data-fly-source]'), event.currentTarget);
            void addItem(variant.id, 1).catch((error) => showCartMessage(addErrorMessage(error)));
          }}
          disabled={!variant.inStock}
          tabIndex={visible ? 0 : -1}
          className="shrink-0"
        >
          {variant.inStock ? 'Add to cart' : 'Out of stock'}
        </Button>
      </div>
    </div>
  );
}
