import Image from 'next/image';
import Link from 'next/link';
import type { Category } from '@aps/shared';
import { cn } from '@/lib/cn';
import { Reveal } from '@/components/motion/reveal';
import { Eyebrow } from '@/components/ui/primitives';

/**
 * Five categories as tall editorial panels.
 * On desktop they form an asymmetric row where the hovered panel expands and
 * the others yield — a small interaction that makes browsing feel like handling
 * something rather than clicking a menu.
 */
export function CategoryRail({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="shell py-12 md:py-24">
      <div className="flex items-end justify-between gap-8">
        <div>
          <Eyebrow>The range</Eyebrow>
          <h2 className="display-md mt-4 max-w-xl text-content">
            Five ways to put a dog at working height.
          </h2>
          <span className="accent-bar mt-5" aria-hidden="true" />
        </div>
      </div>

      {/* A grid, not a single flex row: with ten collections a one-row strip
          squeezed each photograph to a sliver and cut the dogs in half. */}
      <Reveal stagger={0.09} className="mt-8 grid grid-cols-2 gap-2.5 sm:mt-10 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 lg:gap-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/collections/${category.slug}`}
            className={cn(
              'group relative block overflow-hidden rounded-2xl border border-line bg-surface',
              'transition-[border-color,box-shadow] duration-300 hover:border-faint hover:shadow-lift',
            )}
          >
            <div className="relative aspect-[4/5]">
              {/* A collection can exist before it has a photograph. It gets a
                  plain ink tile rather than a broken image. */}
              {category.imageUrl ? (
                <Image
                  src={category.imageUrl}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-[900ms] ease-out-expo group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 bg-ink-raised bg-blueprint" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />

              {/* text-on-ink, not text-content: this sits over the dark
                  gradient painted onto the photo, not over the page canvas.
                  The dark-ink body text used here during the light-canvas
                  migration was nearly invisible against the photo. */}
              <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-5">
                <h3 className="font-display text-base font-medium leading-tight tracking-[-0.02em] text-on-ink sm:text-lg">
                  {category.name}
                </h3>
                <p className="numeric mt-1 text-xs text-on-ink-muted">
                  {category.productCount ?? 0} {category.productCount === 1 ? 'product' : 'products'}
                </p>
                {/* Crimson rule that wipes in on hover — the only accent here */}
                <span className="mt-3 block h-px w-8 origin-left scale-x-0 bg-crimson transition-transform duration-500 ease-out-expo group-hover:scale-x-100" />
              </div>
            </div>
          </Link>
        ))}
      </Reveal>
    </section>
  );
}
