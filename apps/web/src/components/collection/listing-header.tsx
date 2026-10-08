import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * The header of the shop and every collection page: breadcrumb, title, how many
 * there are, and one line saying what this is.
 *
 * It is deliberately slim — about 150px under the site header. The cover band it
 * replaced (a tall gradient with a product tile and two chips) spent half a
 * screen before the first product, and the client called it out as wasted space.
 * A premium shop lets the products and the type do the work.
 *
 * Cart, checkout, account and order keep the navy `ListingHero`: those are task
 * pages with their own rhythm.
 */
export function ListingHeader({
  crumb, title, description, count,
}: {
  crumb: string;
  title: string;
  description?: ReactNode;
  count: number;
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

        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-content md:text-[2.5rem]">
            {title}
          </h1>
          <span className="numeric text-sm text-muted">
            {count} {count === 1 ? 'product' : 'products'}
          </span>
        </div>

        {description && (
          <div className="mt-1.5 line-clamp-2 max-w-4xl text-sm text-muted md:line-clamp-none md:text-base">{description}</div>
        )}
      </div>
    </section>
  );
}
