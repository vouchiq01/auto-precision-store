'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatINR, type CartLine } from '@aps/shared';
import { cn } from '@/lib/cn';
import { useCart } from '@/providers/cart-provider';
import { QtyStepper } from './qty-stepper';

/**
 * One line in the basket. `compact` is the drawer (a divider and a small photo);
 * the default is the cart page, where each line is a card with room to breathe.
 *
 * What a buyer checks, in the order they check it: which table, which finish,
 * how many, what it costs. The line total is the loudest number; the per-unit
 * price is there for anyone who has bumped the quantity and wants to see why the
 * total jumped.
 */
export function CartLineItem({
  line, compact = false, onNavigate, tabIndex,
}: { line: CartLine; compact?: boolean; onNavigate?: () => void; tabIndex?: number }) {
  const { updateItem, removeItem, mutating } = useCart();
  const href = `/products/${line.product.slug}`;

  return (
    <li
      className={cn(
        'flex gap-3.5',
        compact ? 'py-4' : 'rounded-2xl border border-line bg-surface p-3.5 shadow-card sm:gap-5 sm:p-5',
      )}
    >
      <Link
        href={href}
        onClick={onNavigate}
        tabIndex={tabIndex}
        className={cn(
          'relative shrink-0 overflow-hidden rounded-xl bg-sand',
          compact ? 'size-[4.5rem]' : 'size-24 sm:size-32',
        )}
      >
        {line.product.image && (
          <Image
            src={line.product.image.url}
            alt={line.product.image.alt || line.product.name}
            fill
            sizes={compact ? '72px' : '128px'}
            className="object-cover"
          />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
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
            <p className="mt-1 text-xs text-muted">
              {line.variant.optionName}: <span className="font-medium text-content">{line.variant.optionValue}</span>
            </p>
          </div>
          <p className={cn('numeric shrink-0 font-semibold text-content', compact ? 'text-sm' : 'text-base sm:text-lg')}>
            {formatINR(line.lineTotal)}
          </p>
        </div>

        {line.stockWarning && (
          <p className="mt-2 rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs text-warning">{line.stockWarning}</p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-3">
          <div className="flex items-center gap-3">
            <QtyStepper
              quantity={line.quantity}
              max={line.variant.stockQty}
              busy={mutating}
              size={compact ? 'sm' : 'md'}
              tabIndex={tabIndex}
              onChange={(next) => void updateItem(line.id, next)}
            />
            <button
              type="button"
              onClick={() => void removeItem(line.id)}
              disabled={mutating}
              tabIndex={tabIndex}
              className="cursor-pointer text-xs text-faint underline-offset-4 transition-colors hover:text-crimson hover:underline"
            >
              Remove
            </button>
          </div>
          {!compact && line.quantity > 1 && (
            <p className="numeric text-xs text-faint">{formatINR(line.unitPrice)} each</p>
          )}
        </div>
      </div>
    </li>
  );
}
