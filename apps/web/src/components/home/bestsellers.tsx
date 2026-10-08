import type { ProductSummary } from '@aps/shared';
import { ProductCard } from '@/components/product/product-card';
import { SectionHead } from '@/components/ui/section-head';

/**
 * The first shelf, directly under the hero: the products must be on the first
 * screen, not a scroll below it. Two columns on a phone so four of them are
 * visible at once; four across on a desktop.
 *
 * Deliberately not wrapped in a scroll-reveal: a store's products should be
 * painted the instant the page is, not fade in once a script has loaded.
 */
export function Bestsellers({ products }: { products: ProductSummary[] }) {
  if (products.length === 0) return null;

  return (
    <section className="shell pb-6 pt-3 md:pb-8 md:pt-8">
      <SectionHead eyebrow="Most bought" title="What people actually buy." href="/shop" linkLabel="Shop all" />

      <ul className="mt-3 grid grid-cols-2 gap-3 md:mt-6 md:gap-4 lg:grid-cols-4">
        {products.slice(0, 4).map((product, i) => (
          <li key={product.id}>
            <ProductCard product={product} priority={i < 4} />
          </li>
        ))}
      </ul>
    </section>
  );
}
