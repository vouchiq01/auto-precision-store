import type { Metadata } from 'next';
import { STORE } from '@aps/shared';
import { getBanners, getCategories, getProducts } from '@/lib/queries';
import { Hero } from '@/components/home/hero';
import { TrustCards } from '@/components/home/trust-cards';
import { ProductRail } from '@/components/home/product-rail';
import { CouponStrip } from '@/components/home/coupon-strip';
import { CategoryRail } from '@/components/home/category-rail';
import { WhatItDoes } from '@/components/home/what-it-does';
import { TableDemo } from '@/components/home/table-demo';
import { Bestsellers } from '@/components/home/bestsellers';
import { BannerCarousel } from '@/components/home/banner-carousel';
import { OfferTicker, type TickerMessage } from '@/components/home/offer-ticker';
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
  const [heroBanners, stripBanners, categories, featured, rails] = await Promise.all([
    getBanners('hero'),
    getBanners('strip'),
    getCategories(),
    getProducts({ featured: 'true', perPage: 4 }),
    Promise.all(RAIL_SLUGS.map((slug) => getProducts({ category: slug, perPage: 8 }))),
  ]);

  /* Counted from the live catalogue so the copy cannot go stale the moment a
     nineteenth product is added. */
  const totalProducts = categories.reduce((sum, category) => sum + (category.productCount ?? 0), 0);

  /* The scrolling offers line: what the owner wrote in Admin → Banners, plus the best real saving
     in the catalogue — the largest percent-off among products we are showing, from their own
     compare-at prices, so it can never claim more than a product actually carries. Coupons join
     it in the browser. */
  const shown = [...featured.items, ...rails.flatMap((r) => r.items)];
  const bestSaving = shown.reduce((max, p) => Math.max(max, p.discountPercent ?? 0), 0);
  const tickerMessages: TickerMessage[] = [
    ...stripBanners.map((b) => ({ id: b.id, text: b.title, href: b.ctaUrl })),
    ...(bestSaving >= 5 ? [{ id: 'best-saving', text: `Up to ${bestSaving}% off on our best sellers`, href: '/shop' }] : []),
  ];
  const showTicker = heroBanners.length > 0 && tickerMessages.length > 0;

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
      {/* Shop first: the banner carousel, then the products. The story that explains the
          tables sits below, for the people who want it. The collections are in
          the header, and in the menu on a phone. */}
      {/* The admin's banner artwork when there is any; the built-in hero is the fallback
          so the page is never empty at the top. */}
      {heroBanners.length > 0
        ? <>
            {showTicker && <OfferTicker messages={tickerMessages} />}
            <BannerCarousel slides={heroBanners} offsetForHeader={!showTicker} />
          </>
        : <Hero banner={null} totalProducts={totalProducts} spotlight={rails[1]?.items.find((p) => p.slug === 'orbit-r-round-rotating-table') ?? rails[1]?.items[0] ?? null} />}
      {/* Live offers, right under the carousel where they are seen. */}
      <CouponStrip />
      <Bestsellers products={featured.items} />
      <TrustCards />

      {[0, 1, 2].map((index) => {
        const rail = railFor(index);
        return (
          <div key={rail.slug}>
            <ProductRail eyebrow={rail.eyebrow} title={rail.title} href={`/collections/${rail.slug}`} products={rail.products} />
          </div>
        );
      })}

      <CategoryRail categories={categories} />
      {/* Show, then explain: the demo answers "what even is this and is it
          hard?", WhatItDoes then backs it with the numbers. */}
      <TableDemo />
      <WhatItDoes />
      <EnquiryCta />
    </>
  );
}
