'use client';

import { useEffect, useState } from 'react';
import { formatINR, type ProductDetail } from '@aps/shared';
import { cn } from '@/lib/cn';
import { useCart } from '@/providers/cart-provider';
import { Button } from '@/components/ui/button';

/**
 * Appears once the main add-to-cart button has scrolled out of view, so the
 * action is always one tap away through a very long page — without duplicating
 * a second button on screen while the first is still visible.
 */
export function StickyBar({ product }: { product: ProductDetail }) {
  const [visible, setVisible] = useState(false);
  const { addItem, mutating } = useCart();

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
      <div className="shell flex items-center justify-between gap-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-content">{product.name}</p>
          <p className="numeric text-xs text-muted">
            {formatINR(variant.price)}
            {product.emiTeaser && <span className="hidden sm:inline"> · from {product.emiTeaser}</span>}
          </p>
        </div>

        <Button
          size="md"
          onClick={() => void addItem(variant.id, 1)}
          loading={mutating}
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
