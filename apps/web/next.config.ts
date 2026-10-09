import type { NextConfig } from 'next';

const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  /* @aps/shared ships as TypeScript source compiled to dist; transpiling it here
     lets the web app import it without a separate build step in CI. */
  transpilePackages: ['@aps/shared'],

  images: {
    /* Uploaded photographs live in Supabase Storage. The configured project's host
       is allowed explicitly; `*.supabase.co` is the safety net for when
       NEXT_PUBLIC_SUPABASE_URL was not set at build time — without it a product
       with an uploaded photo would throw instead of rendering. */
    remotePatterns: [
      ...(supabaseHost ? [{ protocol: 'https' as const, hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }] : []),
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
        },
      ],
    }, {
      // Fonts are content-hashed by filename and never change in place.
      source: '/fonts/:path*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    }];
  },

  env: { NEXT_PUBLIC_API_URL: apiOrigin },
};

export default nextConfig;
