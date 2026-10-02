import type { ProductSummary } from '@aps/shared';
import { Reveal } from '@/components/motion/reveal';
import { ProductCard } from '@/components/product/product-card';
import { ButtonLink } from '@/components/ui/button';
import { Eyebrow, SectionNumber } from '@/components/ui/primitives';

export function Bestsellers({ products }: { products: ProductSummary[] }) {
  if (products.length === 0) return null;

  return (
    <section className="shell py-16 md:py-24">
      <div className="flex items-end justify-between gap-8">
        <div>
          <Eyebrow>Most bought</Eyebrow>
          <h2 className="display-md mt-4 max-w-xl text-content">
            What people actually buy.
          </h2>
        </div>
        <SectionNumber value="01" className="hidden md:block" />
      </div>

      <Reveal stagger={0.08} className="mt-14 grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.slice(0, 4).map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} priority={i < 2} />
        ))}
      </Reveal>

      <div className="mt-14 flex justify-center">
        <ButtonLink href="/collections/electric-lifting" variant="secondary" size="lg">
          See the whole range
        </ButtonLink>
      </div>
    </section>
  );
}
