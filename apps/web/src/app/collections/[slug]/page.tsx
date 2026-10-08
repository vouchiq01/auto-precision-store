import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getCategories, getProducts } from '@/lib/queries';
import { FilterBar } from '@/components/collection/filter-bar';
import { ListingHeader } from '@/components/collection/listing-header';
import { ProductCard } from '@/components/product/product-card';
import { EmptyState } from '@/components/ui/primitives';
import { ButtonLink } from '@/components/ui/button';

export const revalidate = 300;

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) return { title: 'Collection not found' };

  return {
    title: category.name,
    description: category.description ?? `${category.name} grooming tables from Auto Precision.`,
    alternates: { canonical: `/collections/${category.slug}` },
  };
}

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CollectionPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;

  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

  const result = await getProducts({
    category: slug,
    search: single(query.search),
    sort: single(query.sort) ?? 'featured',
    minPrice: single(query.minPrice),
    maxPrice: single(query.maxPrice),
    inStock: single(query.inStock),
    page: single(query.page) ?? 1,
    perPage: 24,
  });

  return (
    <>
      <ListingHeader crumb={category.name} title={category.name} description={category.description} count={category.productCount ?? result.total} />

      <div className="shell pb-10 md:pb-16">
        <Suspense fallback={<div className="mt-5 h-[5.5rem]" />}>
          <FilterBar total={result.total} />
        </Suspense>

        {result.items.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title="Nothing matches those filters"
              description="Try widening the price range, or clear the filters to see the whole collection."
              action={<ButtonLink href={`/collections/${slug}`} variant="secondary">Clear filters</ButtonLink>}
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
