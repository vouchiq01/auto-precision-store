'use client';

import Link from 'next/link';
import { forwardRef, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

type Variant = 'primary' | 'secondary' | 'ghost' | 'bone' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  /* The crimson button is the page's single call to action. Everything else is
     deliberately quieter so this one reads as the obvious next step. */
  primary: 'bg-crimson text-white hover:bg-crimson-bright disabled:bg-crimson-deep',
  secondary: 'bg-transparent text-bone border border-ink-line hover:border-bone hover:bg-white/[0.04]',
  ghost: 'bg-transparent text-steel hover:text-bone',
  bone: 'bg-bone text-ink hover:bg-white',
  danger: 'bg-transparent text-crimson-bright border border-crimson-deep hover:bg-crimson/10',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-4 text-[0.8125rem]',
  md: 'h-11 px-6 text-sm',
  lg: 'h-14 px-8 text-[0.9375rem]',
};

const BASE = cn(
  'relative inline-flex items-center justify-center gap-2 rounded-full',
  'font-medium tracking-[-0.01em] whitespace-nowrap select-none',
  'transition-colors duration-300 ease-out-expo',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  'focus-visible:outline-2 focus-visible:outline-offset-3',
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Pulls the button gently toward the cursor. Off on touch and reduced motion. */
  magnetic?: boolean;
  loading?: boolean;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', magnetic = false, loading = false, className, children, disabled, ...props },
  forwardedRef,
) {
  const localRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  const enableMagnet = magnetic && !reduced;

  /* Magnetism is a pointer affordance, not decoration: it must never run on a
     touch device, where there is no hover state to reward. */
  const onMove = (event: React.MouseEvent<HTMLButtonElement>) => {
    /* A coarse pointer means touch, where there is no hover state for the
       magnet to reward — and where the transform just fights the tap. */
    if (!enableMagnet || window.matchMedia('(pointer: coarse)').matches) return;
    const el = localRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) * 0.22;
    const y = (event.clientY - rect.top - rect.height / 2) * 0.22;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const onLeave = () => {
    const el = localRef.current;
    if (el) el.style.transform = 'translate3d(0, 0, 0)';
  };

  return (
    <button
      ref={(node) => {
        localRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      className={cn(BASE, VARIANTS[variant], SIZES[size], enableMagnet && 'will-change-transform', className)}
      style={enableMagnet ? { transition: 'transform 0.4s var(--ease-out-expo), background-color 0.3s' } : undefined}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span
          className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
});

interface ButtonLinkProps {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  prefetch?: boolean;
  /** Lets an overlay (cart drawer, mobile nav) close itself as it navigates. */
  onClick?: () => void;
  tabIndex?: number;
}

export function ButtonLink({
  href, variant = 'primary', size = 'md', className, children, prefetch, onClick, tabIndex,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      onClick={onClick}
      tabIndex={tabIndex}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
    >
      {children}
    </Link>
  );
}
