import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Small uppercase label used throughout as a section marker. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('eyebrow', className)}>{children}</p>;
}

/**
 * Oversized section number, from the Nhale reference.
 * Purely decorative, so it is hidden from assistive tech.
 */
export function SectionNumber({ value, className }: { value: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'font-display text-line select-none leading-none',
        'text-[clamp(4rem,12vw,11rem)] font-semibold tracking-[-0.06em]',
        className,
      )}
    >
      {value}
    </span>
  );
}

export function Badge({
  children, tone = 'neutral', className,
}: { children: ReactNode; tone?: 'neutral' | 'accent' | 'success' | 'warning'; className?: string }) {
  const tones = {
    neutral: 'border-line text-muted',
    accent: 'border-crimson text-crimson',
    success: 'border-success/40 text-success',
    warning: 'border-warning/40 text-warning',
  };
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-1',
      'text-[0.625rem] font-medium uppercase tracking-[0.14em]',
      tones[tone], className,
    )}>
      {children}
    </span>
  );
}

/** Rotated label running up the left edge of a section. */
export function VerticalLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('vertical-label hidden lg:block', className)}>
      {children}
    </span>
  );
}

/** Link with an underline that wipes in from the left on hover. */
export function UnderlineLink({
  href, children, className, external,
}: { href: string; children: ReactNode; className?: string; external?: boolean }) {
  const classes = cn(
    'group relative inline-flex items-center gap-1.5 text-sm text-content',
    'transition-colors hover:text-crimson', className,
  );
  const content = (
    <>
      <span className="relative">
        {children}
        <span className={cn(
          'absolute -bottom-0.5 left-0 h-px w-full origin-right scale-x-0 bg-current',
          'transition-transform duration-500 ease-out-expo',
          'group-hover:origin-left group-hover:scale-x-100',
        )} />
      </span>
      <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
    </>
  );

  return external
    ? <a href={href} target="_blank" rel="noreferrer noopener" className={classes}>{content}</a>
    : <Link href={href} className={classes}>{content}</Link>;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent', className)}
    />
  );
}

/** Empty-state block used by the cart, wishlist, search results and admin tables. */
export function EmptyState({
  title, description, action,
}: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-line px-6 py-16 text-center">
      <h3 className="display-sm text-content">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}
