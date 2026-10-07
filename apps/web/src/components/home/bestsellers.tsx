import type { ProductSummary } from '@aps/shared';
import { Reveal } from '@/components/motion/reveal';
import { ProductCard } from '@/components/product/product-card';
import { ButtonLink } from '@/components/ui/button';
import { Eyebrow, SectionNumber } from '@/components/ui/primitives';

export function Bestsellers({ products }: { products: ProductSummary[] }) {
  if (products.length === 0) return null;

  return (
    <section className="shell py-12 md:py-24">
      <div className="flex items-end justify-between gap-8">
        <div>
          <Eyebrow>Most bought</Eyebrow>
          <h2 className="display-md mt-4 max-w-xl text-content">
            What people actually buy.
          </h2>
        </div>
        <SectionNumber value="01" className="hidden md:block" />
      </div>

      {/* Two columns on a phone: one card per row ran to ~530px of image each,
          so four bestsellers cost four screens of scrolling. */}
      <Reveal stagger={0.08} className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:mt-14 sm:gap-x-5 sm:gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
        {products.slice(0, 4).map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} priority={i < 2} />
        ))}
      </Reveal>

      <div className="mt-10 flex justify-center sm:mt-14">
        <ButtonLink href="/collections/electric-lifting" variant="secondary" size="lg">
          See the whole range
        </ButtonLink>
      </div>
    </section>
  );
}
