import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * The title band on the purchase-flow pages: cart, checkout, account and order.
 *
 * It is light — a white strip under the white header — to match the rest of the
 * site now that the header carries the client's logo (which needs a light
 * ground). It used to be a navy band; the shop and collection pages use
 * `ListingHeader`, which is the same idea with a product count. This one adds an
 * optional `action` (Sign out) and takes a node as `description` so checkout can
 * put its step tracker there.
 */
export function ListingHero({
  crumb, title, description, count, unit = 'product', action,
}: {
  crumb: string;
  title: string;
  description?: ReactNode;
  count?: number;
  /** What `count` counts — "item" in the cart. */
  unit?: string;
  /** A control on the right of the title, e.g. "Sign out" on the account page. */
  action?: ReactNode;
}) {
  return (
    <section className="border-b border-line bg-surface pb-5 pt-[5.25rem] md:pb-6 md:pt-28 lg:pt-[8.5rem]">
      <div className="shell">
        <nav aria-label="Breadcrumb" className="text-xs text-muted">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="transition-colors hover:text-content">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li className="text-content">{crumb}</li>
          </ol>
        </nav>

        <div className="mt-2.5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-content md:text-[2.25rem]">
              {title}
            </h1>
            {count !== undefined && (
              <span className="numeric text-sm text-muted">
                {count} {count === 1 ? unit : `${unit}s`}
              </span>
            )}
          </div>
          {action}
        </div>

        {description && <div className="mt-2 max-w-2xl text-sm text-muted md:text-base">{description}</div>}
      </div>
    </section>
  );
}
