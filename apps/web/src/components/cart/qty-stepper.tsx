'use client';

import { cn } from '@/lib/cn';

/** − 1 + in a pill. Shared by the cart page and the drawer so they cannot drift. */
export function QtyStepper({
  quantity, max, busy, onChange, size = 'md', tabIndex,
}: {
  quantity: number;
  max: number;
  busy: boolean;
  onChange: (next: number) => void;
  size?: 'sm' | 'md';
  tabIndex?: number;
}) {
  const button = cn(
    'grid cursor-pointer place-items-center rounded-full text-lg leading-none text-muted transition-colors',
    'hover:text-crimson disabled:cursor-not-allowed disabled:opacity-40',
    size === 'sm' ? 'size-8' : 'size-9',
  );

  return (
    <div className="inline-flex items-center rounded-full border border-line bg-surface">
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        disabled={busy}
        tabIndex={tabIndex}
        aria-label={quantity === 1 ? 'Remove item' : 'Decrease quantity'}
        className={button}
      >
        −
      </button>
      <span className="numeric w-7 text-center text-sm font-medium text-content" aria-live="polite">{quantity}</span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        disabled={busy || quantity >= max}
        tabIndex={tabIndex}
        aria-label="Increase quantity"
        className={button}
      >
        +
      </button>
    </div>
  );
}
