'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatINR, type CartLine } from '@aps/shared';
import { cn } from '@/lib/cn';
import { useCart } from '@/providers/cart-provider';
import { QtyStepper } from './qty-stepper';

/**
 * One line in the basket, as a card. `compact` is the drawer (a smaller photo);
 * the default is the cart page.
 *
 * Laid out the way a buyer reads it: the photograph, which table and which
 * finish, then — along the bottom — how many and what it costs, so the stepper
 * and the line total sit side by side. Remove is a quiet icon in the corner: it
 * should be findable, not something a thumb hits by accident.
 */
export function CartLineItem({
  line, compact = false, onNavigate, tabIndex,
}: { line: CartLine; compact?: boolean; onNavigate?: () => void; tabIndex?: number }) {
  const { updateItem, removeItem, mutating } = useCart();
  const href = `/products/${line.product.slug}`;

  return (
    <li
      className={cn(
        'flex gap-3 rounded-2xl border border-line bg-surface shadow-card',
        compact ? 'p-3' : 'p-3.5 sm:gap-5 sm:p-5',
      )}
    >
      <Link
        href={href}
        onClick={onNavigate}
        tabIndex={tabIndex}
        className={cn(
          'relative shrink-0 self-start overflow-hidden rounded-xl border border-line bg-white',
          compact ? 'size-[4.75rem]' : 'size-24 sm:size-32',
        )}
      >
        {line.product.image && (
          <Image
            src={line.product.image.url}
            alt={line.product.image.alt || line.product.name}
            fill
            sizes={compact ? '76px' : '128px'}
            className="object-contain p-1.5"
          />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={href}
              onClick={onNavigate}
              tabIndex={tabIndex}
              className={cn(
                'line-clamp-2 font-display font-medium leading-snug tracking-[-0.015em] text-content transition-colors hover:text-crimson',
                compact ? 'text-sm' : 'text-base sm:text-lg',
              )}
            >
              {line.product.name}
            </Link>
            <p className="mt-0.5 text-xs text-muted">
              {line.variant.optionName}: <span className="font-medium text-content">{line.variant.optionValue}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => void removeItem(line.id)}
            disabled={mutating}
            tabIndex={tabIndex}
            aria-label={`Remove ${line.product.name} from your cart`}
            className="-mr-1 -mt-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-faint transition-colors hover:bg-sand hover:text-crimson disabled:opacity-40"
          >
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6M5.5 6l.7 9.2A1.5 1.5 0 0 0 7.7 16.5h4.6a1.5 1.5 0 0 0 1.5-1.3L14.5 6" />
            </svg>
          </button>
        </div>

        {line.stockWarning && (
          <p className="mt-2 rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs text-warning">{line.stockWarning}</p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <QtyStepper
            quantity={line.quantity}
            max={line.variant.stockQty}
            busy={mutating}
            size={compact ? 'sm' : 'md'}
            tabIndex={tabIndex}
            onChange={(next) => void updateItem(line.id, next)}
          />
          <div className="text-right">
            <p className={cn('numeric font-semibold leading-tight text-content', compact ? 'text-[0.9375rem]' : 'text-base sm:text-lg')}>
              {formatINR(line.lineTotal)}
            </p>
            {line.quantity > 1 && (
              <p className="numeric text-[0.6875rem] text-faint">{formatINR(line.unitPrice)} each</p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
