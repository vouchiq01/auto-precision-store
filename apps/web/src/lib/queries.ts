import type {
  Banner, Category, CmsPage, Paginated, ProductDetail, ProductSummary,
} from '@aps/shared';
import { apiFetchSafe } from './api';

/**
 * Server-side catalogue reads.
 *
 * Everything here is `apiFetchSafe`: a page should degrade with a section
 * missing rather than return a 500 because one panel could not load. That
 * matters especially on Render's free tier, where the first request after an
 * idle period can time out while the instance wakes.
 */

const CATALOGUE_REVALIDATE = 300; // five minutes

export async function getCategories(): Promise<Category[]> {
  const result = await apiFetchSafe<{ items: Category[] }>('/api/catalog/categories', {
    revalidate: CATALOGUE_REVALIDATE, tags: ['categories'],
  });
  return result?.items ?? [];
}

export async function getProducts(params: Record<string, string | number | undefined> = {}): Promise<Paginated<ProductSummary>> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const result = await apiFetchSafe<Paginated<ProductSummary>>(
    `/api/catalog/products?${query.toString()}`,
    { revalidate: CATALOGUE_REVALIDATE, tags: ['products'] },
  );
  return result ?? { items: [], page: 1, perPage: 24, total: 0, totalPages: 1 };
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  return apiFetchSafe<ProductDetail>(`/api/catalog/products/${slug}`, {
    revalidate: CATALOGUE_REVALIDATE, tags: ['products', `product:${slug}`],
  });
}

export async function getProductSlugs(): Promise<{ slug: string; updatedAt: string }[]> {
  const result = await apiFetchSafe<{ items: { slug: string; updatedAt: string }[] }>(
    '/api/catalog/products/slugs', { revalidate: CATALOGUE_REVALIDATE },
  );
  return result?.items ?? [];
}

export async function getBanners(placement?: string): Promise<Banner[]> {
  const query = placement ? `?placement=${placement}` : '';
  const result = await apiFetchSafe<{ items: Banner[] }>(`/api/catalog/banners${query}`, {
    revalidate: 60, tags: ['banners'],
  });
  return result?.items ?? [];
}

export async function getCmsPage(slug: string): Promise<CmsPage | null> {
  return apiFetchSafe<CmsPage>(`/api/pages/${slug}`, {
    revalidate: CATALOGUE_REVALIDATE, tags: ['pages', `page:${slug}`],
  });
}

export interface ReviewPage {
  items: {
    id: string; rating: number; title: string; body: string;
    authorName: string; isVerifiedPurchase: boolean; createdAt: string;
  }[];
  total: number;
  distribution: { five: number; four: number; three: number; two: number; one: number; average: number };
}

export async function getReviews(productId: string): Promise<ReviewPage | null> {
  return apiFetchSafe<ReviewPage>(`/api/products/${productId}/reviews`, { revalidate: 120 });
}
