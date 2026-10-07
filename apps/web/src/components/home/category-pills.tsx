import Link from 'next/link';
import type { Category } from '@aps/shared';
import { cn } from '@/lib/cn';

/**
 * The collections as a row of pills, directly under the hero, on every screen.
 *
 * On a phone the header's links hide behind the menu button, so the first
 * screen offered no way to jump straight to "Round" or "Portable"; on a
 * desktop this is the quickest route into a collection from the top of the
 * page. One tap, no menu, and a pill cut off at the edge says the row scrolls.
 */
export function CategoryPills({ categories, activeSlug }: { categories: Category[]; activeSlug?: string }) {
  if (categories.length === 0) return null;

  const total = categories.reduce((sum, c) => sum + (c.productCount ?? 0), 0);
  const pill = 'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[0.8125rem] font-medium shadow-card transition-colors';

  return (
    <nav aria-label="Browse by type" className="shell mt-5">
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:-mx-10 md:px-10 xl:mx-0 xl:px-0 [&::-webkit-scrollbar]:hidden">
        <li className="shrink-0">
          <Link
            href="/shop"
            className={cn(pill, !activeSlug ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-content hover:border-crimson hover:text-crimson')}
          >
            All tables
            <span className="numeric rounded-full bg-white/15 px-1.5 py-0.5 text-[0.6875rem] font-normal">{total}</span>
          </Link>
        </li>
        {categories.map((category) => {
          const active = category.slug === activeSlug;
          return (
            <li key={category.id} className="shrink-0">
              <Link
                href={`/collections/${category.slug}`}
                className={cn(pill, active ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-content hover:border-crimson hover:text-crimson')}
              >
                {category.name}
                <span className={cn('numeric rounded-full px-1.5 py-0.5 text-[0.6875rem] font-normal', active ? 'bg-white/15' : 'bg-sand text-muted')}>
                  {category.productCount ?? 0}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
