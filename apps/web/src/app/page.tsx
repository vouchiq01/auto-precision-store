import type { Metadata } from 'next';
import { STORE } from '@aps/shared';
import { getBanners, getCategories, getProduct, getProducts } from '@/lib/queries';
import { Hero } from '@/components/home/hero';
import { Marquee } from '@/components/home/marquee';
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

export default async function HomePage() {
  /* Fetched in parallel: four sequential awaits would stack four cold-start
     round-trips on the very first render after a deploy. */
  const [heroBanners, categories, featured] = await Promise.all([
    getBanners('hero'),
    getCategories(),
    getProducts({ featured: 'true', perPage: 4 }),
  ]);

  /* Counted from the live catalogue so the copy cannot go stale the moment a
     nineteenth product is added. */
  const totalProducts = categories.reduce((sum, category) => sum + (category.productCount ?? 0), 0);

  const flagshipSlug = featured.items[0]?.slug;
  const flagship = flagshipSlug ? await getProduct(flagshipSlug) : null;

  return (
    <>
      <Hero banner={heroBanners[0] ?? null} totalProducts={totalProducts} />
      {/* Bestsellers 2nd, categories 3rd: social proof — what people actually
          buy — lands before the full range does, then the range itself,
          before the "does this even work" pitch below. */}
      <Bestsellers products={featured.items} />
      <CategoryRail categories={categories} />
      <Marquee />
      <CouponStrip />
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
