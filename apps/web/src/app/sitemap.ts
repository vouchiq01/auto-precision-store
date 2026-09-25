import type { MetadataRoute } from 'next';
import { getCategories, getProductSlugs } from '@/lib/queries';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://autoprecision.store';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getProductSlugs(), getCategories()]);

  const staticPages = ['', '/enquiry', '/cart'].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.5,
  }));

  const cmsPages = ['about', 'shipping', 'returns', 'warranty', 'faq', 'privacy', 'terms'].map((slug) => ({
    url: `${SITE_URL}/pages/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.3,
  }));

  return [
    ...staticPages,
    ...categories.map((category) => ({
      url: `${SITE_URL}/collections/${category.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...products.map((product) => ({
      url: `${SITE_URL}/products/${product.slug}`,
      lastModified: new Date(product.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    ...cmsPages,
  ];
}
