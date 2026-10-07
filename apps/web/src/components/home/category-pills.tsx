import Link from 'next/link';
import type { Category } from '@aps/shared';

/**
 * A swipeable row of the six collections, for phones only.
 *
 * On a desktop the header already carries these links; on a phone they hide
 * behind the menu button, so the first screen offered no way to jump straight
 * to "Round" or "Portable". Pills are the quickest shape for that — one tap, no
 * menu, and the cut-off pill at the edge says the row scrolls.
 */
export function CategoryPills({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <nav aria-label="Browse by type" className="mt-6 lg:hidden">
      <ul className="shell flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((category) => (
          <li key={category.id} className="shrink-0">
            <Link
              href={`/collections/${category.slug}`}
              className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-[0.8125rem] font-medium text-content shadow-card transition-colors hover:border-crimson hover:text-crimson"
            >
              {category.name}
              <span className="numeric rounded-full bg-sand px-1.5 py-0.5 text-[0.6875rem] font-normal text-muted">
                {category.productCount ?? 0}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
