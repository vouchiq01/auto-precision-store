import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getCategories, getProducts } from '@/lib/queries';
import { FilterBar } from '@/components/collection/filter-bar';
import { ListingHeader } from '@/components/collection/listing-header';
import { CategoryPills } from '@/components/home/category-pills';
import { ProductCard } from '@/components/product/product-card';
import { EmptyState } from '@/components/ui/primitives';
import { ButtonLink } from '@/components/ui/button';

export const revalidate = 300;

type SearchParams = Record<string, string | string[] | undefined>;
const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const search = single((await searchParams).search);
  return {
    title: search ? `Results for “${search}”` : 'Shop all grooming tables',
    description: 'Every table in the range — electric, hydraulic, round, portable and foldable — and the accessories that go with them.',
    alternates: { canonical: '/shop' },
    /* A results page is not a page worth ranking; the collections are. */
    robots: search ? { index: false, follow: true } : undefined,
  };
}

/**
 * Every product in one list, with search.
 *
 * The collections answer "show me electric tables"; this answers "show me
 * everything" and "find the one I half-remember", which a shop with a search
 * box has to be able to do. Filters and search live in the URL, so a result is
 * shareable and survives the back button.
 */
export default async function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = await searchParams;
  const search = single(query.search);

  const [categories, result] = await Promise.all([
    getCategories(),
    getProducts({
      search,
      sort: single(query.sort) ?? 'featured',
      minPrice: single(query.minPrice),
      maxPrice: single(query.maxPrice),
      inStock: single(query.inStock),
      page: single(query.page) ?? 1,
      perPage: 48,
    }),
  ]);

  const total = categories.reduce((sum, c) => sum + (c.productCount ?? 0), 0);

  return (
    <>
      <ListingHeader
        crumb={search ? 'Search' : 'All products'}
        title={search ? `Results for “${search}”` : 'All products'}
        description={search ? null : 'Every table, tub and bundle in the range, from a folding table for home to a flagship electric lift.'}
        count={search ? result.total : total}
      />
      <CategoryPills categories={categories} />

      <div className="shell pb-10 md:pb-16">
        <Suspense fallback={<div className="mt-5 h-[5.5rem]" />}>
          <FilterBar total={result.total} />
        </Suspense>

        {result.items.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title={search ? `Nothing found for “${search}”` : 'Nothing matches those filters'}
              description="Check the spelling, try a broader word like “electric” or “round”, or clear the filters."
              action={<ButtonLink href="/shop" variant="secondary">Clear and show all</ButtonLink>}
            />
          </div>
        ) : (
          <ul className="mt-5 grid grid-cols-2 gap-3 md:mt-6 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {result.items.map((product, i) => (
              <li key={product.id}>
                <ProductCard product={product} priority={i < 4} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
