import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://autoprecision.store';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Nothing behind a session should ever be indexed.
      disallow: ['/admin', '/account', '/checkout', '/cart', '/order/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
