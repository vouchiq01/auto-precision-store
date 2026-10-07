import Link from 'next/link';
import type { ReactNode } from 'react';
import { Eyebrow } from '@/components/ui/primitives';

/**
 * The heading every shelf on the site shares: small label, a title sized for
 * scanning rather than for display, the brand rule, and — when the shelf is a
 * slice of something bigger — a "See all" link on the right so the way to the
 * full list is always one tap away.
 */
export function SectionHead({
  eyebrow, title, href, linkLabel = 'See all', actions,
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  linkLabel?: string;
  /** Extra controls on the right, e.g. the shelf's scroll arrows. */
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="mt-1.5 font-display text-[1.625rem] font-semibold leading-[1.05] tracking-[-0.025em] text-content md:text-[2.125rem]">
          {title}
        </h2>
        <span className="accent-bar mt-3" aria-hidden="true" />
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {actions}
        {href && (
          <Link
            href={href}
            className="group flex items-center gap-1 text-sm font-medium text-crimson transition-colors hover:text-crimson-deep"
          >
            {linkLabel}
            <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
          </Link>
        )}
      </div>
    </div>
  );
}
