'use client';

import { useRef } from 'react';
import { cn } from '@/lib/cn';
import { useWishlist } from '@/providers/wishlist-provider';

/**
 * The heart. Filled crimson when the product is saved; a guest tapping it is taken
 * to sign in (see WishlistProvider). It stops the click reaching the card's
 * stretched link, so hearting never navigates away.
 */
export function WishlistButton({
  productId, name, className,
}: { productId: string; name: string; className?: string }) {
  const { has, toggle } = useWishlist();
  const saved = has(productId);
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from your wishlist` : `Save ${name} to your wishlist`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!saved) {
          ref.current?.animate(
            [{ transform: 'scale(1)' }, { transform: 'scale(1.3)', offset: 0.4 }, { transform: 'scale(1)' }],
            { duration: 380, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
          );
        }
        void toggle(productId);
      }}
      className={cn(
        'grid size-9 cursor-pointer place-items-center rounded-full bg-white/95 text-muted shadow-card ring-1 ring-line backdrop-blur transition-colors',
        'hover:text-crimson focus-visible:outline-2 focus-visible:outline-offset-2',
        saved && 'text-crimson',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[1.125rem]" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.9a4.4 4.4 0 0 1 7.5 2.5c0 5.5-7.5 10.1-7.5 10.1z" />
      </svg>
    </button>
  );
}
