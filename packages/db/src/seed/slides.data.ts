/**
 * The homepage carousel's starting set: finished banner artwork (headline, button
 * and all, so there is no text to overlay). They are ordinary `hero` banners, so the
 * owner replaces, reorders, hides and adds to them in Admin → Banners. `title` is the
 * picture's description (alt text), not text drawn on the page.
 *
 * The artwork is client-supplied and AI-generated; the claims printed inside it
 * (load capacity, steel grade, rust-proof) are not checked against the products.
 */
export const HERO_SLIDES = [
  { title: 'Stop grooming on the floor — round rotating grooming table', imageDesktop: '/banners/banner-1-floor.jpg', ctaUrl: '/collections/round-rotating' },
  { title: 'Grooming made easy — electric lifting table', imageDesktop: '/banners/banner-2-made-easy.jpg', ctaUrl: '/collections/electric-lifting' },
  { title: 'Grooming on the go — foldable portable table', imageDesktop: '/banners/banner-3-on-the-go.jpg', ctaUrl: '/collections/foldable' },
  { title: 'Pristine care for your furry friend — stainless bath tub', imageDesktop: '/banners/banner-4-pristine-care.jpg', ctaUrl: '/collections/bath-tubs' },
  { title: 'Precision and comfort in every wash — electric lifting bath tub', imageDesktop: '/banners/banner-5-precision.jpg', ctaUrl: '/collections/bath-tubs' },
  { title: 'Effortless grooming for every pet — hydraulic round table', imageDesktop: '/banners/banner-6-effortless.jpg', ctaUrl: '/collections/round-rotating' },
  { title: 'The ultimate spa experience for your pet — stainless steel bath tub', imageDesktop: '/banners/banner-7-spa.jpg', ctaUrl: '/collections/bath-tubs' },
  { title: 'Luxury and safety for every pet — modular stainless cage', imageDesktop: '/banners/banner-8-cage.jpg', ctaUrl: '/collections/cages' },
] as const;

/**
 * The scrolling offers line above the carousel: ordinary `strip` banners whose `title` is the
 * sentence (the picture is a placeholder the storefront never shows). Owner-editable in
 * Admin → Banners. Only claims that are true of every order: we deliver to every Indian
 * pincode; free freight is a Karnataka-only threshold; every order gets a GST invoice.
 */
export const TICKER_MESSAGES = [
  { title: 'Pan India delivery — we ship to every pincode', ctaUrl: '/pages/shipping' },
  { title: 'Free freight on orders over ₹25,000 in Karnataka', ctaUrl: '/pages/shipping' },
  { title: 'GST invoice on every order', ctaUrl: null },
] as const;
