'use client';

import { useRef } from 'react';
import type { ProductSummary } from '@aps/shared';
import { ProductCard } from '@/components/product/product-card';
import { SectionHead } from '@/components/ui/section-head';

/**
 * One collection as a swipeable shelf.
 *
 * Several shelves stacked down the homepage let a visitor see the breadth of
 * the range by scrolling a little, instead of one long grid that shows only
 * the first category. Native scroll-snap does the swiping on a phone; the
 * arrows are a pointer affordance for desktop, where a row that scrolls
 * sideways with no control reads as cut off.
 */
export function ProductRail({
  eyebrow, title, href, products,
}: { eyebrow?: string; title: string; href: string; products: ProductSummary[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  if (products.length === 0) return null;

  const scrollBy = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: 'smooth' });
  };

  const arrows = (
    <div className="hidden items-center gap-1.5 md:flex">
      {([-1, 1] as const).map((direction) => (
        <button
          key={direction}
          type="button"
          onClick={() => scrollBy(direction)}
          aria-label={direction === 1 ? 'Scroll right' : 'Scroll left'}
          className="grid size-9 cursor-pointer place-items-center rounded-full border border-line bg-surface text-content shadow-card transition-colors hover:border-crimson hover:text-crimson"
        >
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d={direction === 1 ? 'M7.5 4.5L13 10l-5.5 5.5' : 'M12.5 4.5L7 10l5.5 5.5'} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ))}
    </div>
  );

  return (
    <section className="shell py-8 md:py-10">
      <SectionHead eyebrow={eyebrow} title={title} href={href} actions={arrows} />

      {/* The negative margin lets the row run to the screen edge so the card
          cut off at the right says "there is more"; padding puts the first
          card back on the page gutter. */}
      <ul
        ref={trackRef}
        className="-mx-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-3 [scrollbar-width:none] md:-mx-10 md:mt-6 md:gap-4 md:scroll-px-10 md:px-10 xl:-mx-16 xl:scroll-px-16 xl:px-16 [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <li key={product.id} className="w-[58vw] max-w-[16.5rem] shrink-0 snap-start sm:w-[15.5rem] lg:w-[16.5rem]">
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}
