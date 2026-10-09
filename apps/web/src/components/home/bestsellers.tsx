import type { ProductSummary } from '@aps/shared';
import { ProductCard } from '@/components/product/product-card';
import { SectionHead } from '@/components/ui/section-head';

/**
 * The first shelf, directly under the carousel and offers: the products must be on the first
 * screen, not a scroll below it. On a phone it is ONE swipeable row (cards ~58vw wide, the next
 * one peeking in so it reads as scrollable) rather than a tall two-column grid; from `md` it is
 * the four-across grid.
 *
 * Deliberately not wrapped in a scroll-reveal: a store's products should be
 * painted the instant the page is, not fade in once a script has loaded.
 */
export function Bestsellers({ products }: { products: ProductSummary[] }) {
  if (products.length === 0) return null;

  return (
    <section className="shell pb-6 pt-3 md:pb-8 md:pt-8">
      <SectionHead eyebrow="Most bought" title="What people actually buy." href="/shop" linkLabel="Shop all" />

      <ul className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-3 [scrollbar-width:none] md:mx-0 md:mt-6 md:grid md:snap-none md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
        {products.slice(0, 4).map((product, i) => (
          <li key={product.id} className="w-[58vw] max-w-[16.5rem] shrink-0 snap-start sm:w-[15.5rem] md:w-auto md:max-w-none">
            <ProductCard product={product} priority={i < 4} />
          </li>
        ))}
      </ul>
    </section>
  );
}
