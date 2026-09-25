import Image from 'next/image';
import Link from 'next/link';
import type { Category } from '@aps/shared';
import { cn } from '@/lib/cn';
import { Reveal } from '@/components/motion/reveal';
import { Eyebrow, SectionNumber } from '@/components/ui/primitives';

/**
 * Five categories as tall editorial panels.
 * On desktop they form an asymmetric row where the hovered panel expands and
 * the others yield — a small interaction that makes browsing feel like handling
 * something rather than clicking a menu.
 */
export function CategoryRail({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="shell py-24 md:py-32">
      <div className="flex items-end justify-between gap-8">
        <div>
          <Eyebrow>The range</Eyebrow>
          <h2 className="display-md mt-4 max-w-xl text-content">
            Five ways to put a dog at working height.
          </h2>
        </div>
        <SectionNumber value="02" className="hidden md:block" />
      </div>

      {/* A flex row on desktop so the hovered panel can actually take space
          from its neighbours — inside a grid, flex-grow does nothing. */}
      <Reveal stagger={0.09} className="mt-14 grid gap-3 sm:grid-cols-2 lg:flex lg:gap-3">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/collections/${category.slug}`}
            className={cn(
              'group relative block overflow-hidden rounded-2xl border border-line bg-surface',
              'transition-[border-color,flex-grow] duration-[700ms] ease-out-expo hover:border-faint',
              'lg:flex-1 lg:hover:grow-[1.8]',
            )}
          >
            <div className="relative aspect-[3/4] lg:aspect-auto lg:h-[26rem] xl:h-[32rem]">
              <Image
                src={category.imageUrl ?? `/categories/${category.slug}.jpg`}
                alt=""
                fill
                sizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-[900ms] ease-out-expo group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-5">
                <h3 className="font-display text-lg font-medium leading-tight tracking-[-0.02em] text-content">
                  {category.name}
                </h3>
                <p className="numeric mt-1 text-xs text-muted">
                  {category.productCount ?? 0} {category.productCount === 1 ? 'table' : 'tables'}
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
