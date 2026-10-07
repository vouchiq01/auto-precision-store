import type { Metadata } from 'next';
import { STORE } from '@aps/shared';
import { getBanners, getCategories, getProduct, getProducts } from '@/lib/queries';
import { Hero } from '@/components/home/hero';
import { TrustCards } from '@/components/home/trust-cards';
import { CategoryPills } from '@/components/home/category-pills';
import { ProductRail } from '@/components/home/product-rail';
import { CouponStrip } from '@/components/home/coupon-strip';
import { CategoryRail } from '@/components/home/category-rail';
import { WhatItDoes } from '@/components/home/what-it-does';
import { TableDemo } from '@/components/home/table-demo';
import { FeaturedStory } from '@/components/home/featured-story';
import { Bestsellers } from '@/components/home/bestsellers';
import { Proof } from '@/components/home/proof';
import { EnquiryCta } from '@/components/home/enquiry-cta';

export const metadata: Metadata = {
  title: `${STORE.name} — Professional pet grooming tables`,
  description:
    'Electric, hydraulic, round and portable grooming tables built in Bengaluru. Every model explained in full. Free freight across Karnataka over ₹25,000.',
};

/* The homepage is fully static and revalidates in the background, so a cold API
   never blocks a visitor. */
export const revalidate = 300;

/* Shelves under the first one. Chosen as the three collections that cover the
   range from "a pro's daily driver" to "the one I keep at home". */
const RAIL_SLUGS = ['electric-lifting', 'round-rotating', 'portable'] as const;

export default async function HomePage() {
  /* Fetched in parallel: sequential awaits would stack cold-start round-trips
     on the very first render after a deploy. */
  const [heroBanners, categories, featured, rails] = await Promise.all([
    getBanners('hero'),
    getCategories(),
    getProducts({ featured: 'true', perPage: 4 }),
    Promise.all(RAIL_SLUGS.map((slug) => getProducts({ category: slug, perPage: 8 }))),
  ]);

  /* Counted from the live catalogue so the copy cannot go stale the moment a
     nineteenth product is added. */
  const totalProducts = categories.reduce((sum, category) => sum + (category.productCount ?? 0), 0);

  const flagshipSlug = featured.items[0]?.slug;
  const flagship = flagshipSlug ? await getProduct(flagshipSlug) : null;

  const railFor = (index: number) => {
    const slug = RAIL_SLUGS[index]!;
    const category = categories.find((c) => c.slug === slug);
    return {
      slug,
      title: category?.name ?? slug,
      eyebrow: category ? `${category.productCount ?? 0} ${category.productCount === 1 ? 'table' : 'tables'}` : undefined,
      products: rails[index]?.items ?? [],
    };
  };

  return (
    <>
      {/* Shop first: a short hero, the collections as pills, and the products —
          all inside the first screen. The story that explains the tables sits
          below, for the people who want it. */}
      <Hero banner={heroBanners[0] ?? null} totalProducts={totalProducts} featured={featured.items[0] ?? null} />
      <CategoryPills categories={categories} />
      <Bestsellers products={featured.items} />
      <TrustCards />

      {[0, 1, 2].map((index) => {
        const rail = railFor(index);
        return (
          <div key={rail.slug}>
            <ProductRail eyebrow={rail.eyebrow} title={rail.title} href={`/collections/${rail.slug}`} products={rail.products} />
            {index === 0 && <CouponStrip />}
          </div>
        );
      })}

      <CategoryRail categories={categories} />
      {/* Show, then explain: the demo answers "what even is this and is it
          hard?", WhatItDoes then backs it with the numbers. */}
      <TableDemo />
      <WhatItDoes />
      {flagship && <FeaturedStory product={flagship} />}
      <Proof />
      <EnquiryCta />
    </>
  );
}
