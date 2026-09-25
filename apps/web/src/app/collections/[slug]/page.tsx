import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getCategories, getProducts } from '@/lib/queries';
import { FilterBar } from '@/components/collection/filter-bar';
import { ProductCard } from '@/components/product/product-card';
import { Reveal } from '@/components/motion/reveal';
import { Eyebrow, EmptyState } from '@/components/ui/primitives';
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
    sort: single(query.sort) ?? 'featured',
    minPrice: single(query.minPrice),
    maxPrice: single(query.maxPrice),
    inStock: single(query.inStock),
    page: single(query.page) ?? 1,
    perPage: 24,
  });

  return (
    <div className="shell pt-28 md:pt-36">
      <nav aria-label="Breadcrumb" className="mb-8 text-xs text-steel-dim">
        <ol className="flex items-center gap-2">
          <li><a href="/" className="transition-colors hover:text-bone">Home</a></li>
          <li aria-hidden="true">/</li>
          <li className="text-steel">{category.name}</li>
        </ol>
      </nav>

      <header className="max-w-3xl">
        <Eyebrow>Collection</Eyebrow>
        <h1 className="display-lg mt-4 text-bone">{category.name}<span className="text-crimson">.</span></h1>
        {category.description && <p className="lede mt-6">{category.description}</p>}
      </header>

      <Suspense fallback={<div className="rule py-5 text-sm text-steel">Loading filters…</div>}>
        <FilterBar total={result.total} />
      </Suspense>

      {result.items.length === 0 ? (
        <div className="py-16">
          <EmptyState
            title="Nothing matches those filters"
            description="Try widening the price range, or clear the filters to see the whole collection."
            action={<ButtonLink href={`/collections/${slug}`} variant="secondary">Clear filters</ButtonLink>}
          />
        </div>
      ) : (
        <Reveal stagger={0.06} className="mt-10 grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.items.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} priority={i < 4} />
          ))}
        </Reveal>
      )}

      {/* Cross-links to the rest of the range */}
      <section className="rule mt-24 py-12">
        <Eyebrow>Other collections</Eyebrow>
        <div className="mt-5 flex flex-wrap gap-2">
          {categories.filter((c) => c.slug !== slug).map((other) => (
            <ButtonLink key={other.id} href={`/collections/${other.slug}`} variant="secondary" size="sm">
              {other.name}
            </ButtonLink>
          ))}
        </div>
      </section>
    </div>
  );
}
