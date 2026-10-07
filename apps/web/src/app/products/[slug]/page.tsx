import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { formatINR, paiseToRupees, STORE } from '@aps/shared';
import { getProduct, getProductSlugs, getReviews } from '@/lib/queries';
import { ProductGallery } from '@/components/product/product-gallery';
import { BuyBox } from '@/components/product/buy-box';
import { ProductSpecs } from '@/components/product/product-specs';
import { ProductStory } from '@/components/product/product-story';
import { ProductFaq } from '@/components/product/product-faq';
import { Reviews } from '@/components/product/reviews';
import { StickyBar } from '@/components/product/sticky-bar';
import { ProductCard } from '@/components/product/product-card';
import { Reveal } from '@/components/motion/reveal';
import { SectionHead } from '@/components/ui/section-head';
import { Eyebrow } from '@/components/ui/primitives';

export const revalidate = 300;

/**
 * Reads a product's multi-angle frames from disk at build time.
 *
 * Products with a spin/frames.json get the 360° tab; everything else silently
 * does not. Reading the manifest rather than hardcoding a count means dropping
 * in a real photographic spin later needs no code change at all — write the
 * frames and the manifest, and the viewer picks them up.
 */
function readSpinFrames(slug: string): string[] | null {
  try {
    const manifest = join(process.cwd(), 'public', 'products', slug, 'spin', 'frames.json');
    if (!existsSync(manifest)) return null;
    const { frames } = JSON.parse(readFileSync(manifest, 'utf8')) as { frames: string[] };
    return Array.isArray(frames) && frames.length > 1 ? frames : null;
  } catch {
    return null;
  }
}

/** Pre-render every product at build time — the catalogue is small enough. */
export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Product not found' };

  /* The layout template already appends the store name, so strip it from a
     stored metaTitle rather than rendering "… | Auto Precision | Auto Precision". */
  const storedTitle = product.metaTitle?.replace(new RegExp(`\\s*\\|\\s*${STORE.name}\\s*$`), '');
  const title = storedTitle || `${product.name} — ${formatINR(product.price)}`;
  const description = product.metaDescription ?? product.summary ?? product.tagline ?? undefined;

  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title, description, type: 'website',
      images: product.primaryImage ? [{ url: product.primaryImage.url, alt: product.name }] : [],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const reviews = await getReviews(product.id);
  const spinFrames = readSpinFrames(product.slug);

  /* Product structured data. Google needs price as a plain decimal and
     availability as a schema.org URL — not our internal paise/boolean. */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.summary ?? product.tagline ?? undefined,
    sku: product.sku,
    brand: { '@type': 'Brand', name: product.brand },
    image: product.images.map((image) => image.url),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: paiseToRupees(product.price).toFixed(2),
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: STORE.legalName },
    },
    ...(reviews && reviews.total > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: reviews.distribution.average,
            reviewCount: reviews.total,
          },
        }
      : {}),
  };

  const faqLd = product.faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: product.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      <div className="shell pt-28 md:pt-36">
        <nav aria-label="Breadcrumb" className="mb-8 text-xs text-faint">
          <ol className="flex flex-wrap items-center gap-2">
            <li><a href="/" className="transition-colors hover:text-content">Home</a></li>
            <li aria-hidden="true">/</li>
            <li>
              <a href={`/collections/${product.category.slug}`} className="transition-colors hover:text-content">
                {product.category.name}
              </a>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-muted">{product.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16">
          <ProductGallery
            images={product.images}
            name={product.name}
            spinSlug={spinFrames ? product.slug : null}
            spinFrames={spinFrames ?? undefined}
          />
          <BuyBox product={product} />
        </div>

        {product.description && (
          <Reveal className="mx-auto mt-24 max-w-3xl md:mt-32">
            <Eyebrow>In detail</Eyebrow>
            <div className="mt-5 space-y-5">
              {product.description.split('\n\n').map((paragraph, i) => (
                <p key={i} className="text-lg leading-relaxed text-muted">{paragraph}</p>
              ))}
            </div>
          </Reveal>
        )}
      </div>

      <ProductStory features={product.features} />
      <ProductSpecs product={product} />
      <ProductFaq faqs={product.faqs} />
      <Reviews reviews={reviews} />

      {product.related.length > 0 && (
        <section className="shell rule py-10 md:py-16">
          <SectionHead
            eyebrow="Also consider"
            title={`Others in ${product.category.name.toLowerCase()}.`}
            href={`/collections/${product.category.slug}`}
          />
          <ul className="mt-5 grid grid-cols-2 gap-3 md:mt-6 md:gap-4 lg:grid-cols-4">
            {product.related.map((related) => (
              <li key={related.id}>
                <ProductCard product={related} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <StickyBar product={product} />
    </>
  );
}
