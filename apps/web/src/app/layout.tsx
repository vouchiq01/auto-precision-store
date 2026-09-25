import type { Metadata, Viewport } from 'next';
import { STORE } from '@aps/shared';
import { SiteChrome } from '@/components/layout/site-chrome';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://autoprecision.store';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${STORE.name} — Professional pet grooming tables`,
    template: `%s | ${STORE.name}`,
  },
  description:
    'Electric, hydraulic and portable grooming tables built in Bengaluru for people who stand at them all day. Free freight across Karnataka over ₹25,000.',
  keywords: [
    'pet grooming table', 'electric grooming table', 'hydraulic grooming table',
    'dog grooming table India', 'professional grooming equipment',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: STORE.name,
    title: `${STORE.name} — Professional pet grooming tables`,
    description: 'Grooming tables engineered for the working groomer.',
    url: SITE_URL,
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#08080A',
  width: 'device-width',
  initialScale: 1,
  // Never block pinch-zoom: it is an accessibility necessity, not a polish detail.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        {/* Marks that JS is running, so CSS can safely pre-hide reveal targets.
            Without JS the class never lands and nothing is hidden. */}
        <script
          dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.add('js')` }}
        />
      </head>
      <body className="grain antialiased">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
