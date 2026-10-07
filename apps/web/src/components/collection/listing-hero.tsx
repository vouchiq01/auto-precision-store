import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * The title band at the top of every listing page.
 *
 * The collection pages opened with a breadcrumb, a 40px headline and a
 * paragraph on bare paper — roughly 400px before the first product. This keeps
 * the same information in a navy band under 200px tall, so the toolbar and the
 * first row of products arrive on the first screen. The count sits beside the
 * title because "how many are there" is the first thing a listing should say.
 */
export function ListingHero({
  crumb, title, description, count, unit = 'product', action,
}: {
  crumb: string;
  title: string;
  description?: ReactNode;
  count?: number;
  /** What `count` counts — "table" on a listing, "item" in the cart. */
  unit?: string;
  /** A control on the right of the title, e.g. "Sign out" on the account page. */
  action?: ReactNode;
}) {
  return (
    <section className="on-ink bg-blueprint pb-6 pt-[5.25rem] md:pb-8 md:pt-28 lg:pt-[8.5rem]">
      <div className="shell">
        <nav aria-label="Breadcrumb" className="text-xs text-on-ink-muted">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="transition-colors hover:text-on-ink">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li className="text-on-ink">{crumb}</li>
          </ol>
        </nav>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <h1 className="font-display text-[clamp(1.875rem,4vw,3rem)] font-semibold leading-none tracking-[-0.03em] text-on-ink">
            {title}<span className="text-crimson">.</span>
          </h1>
          {count !== undefined && (
            <span className="numeric mb-1 rounded-full border border-white/20 px-3 py-1 text-xs text-on-ink-muted">
              {count} {count === 1 ? unit : `${unit}s`}
            </span>
          )}
          </div>
          {action}
        </div>

        {description && <div className="lede mt-3 max-w-2xl text-sm md:text-base">{description}</div>}
      </div>
    </section>
  );
}
