'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { formatINR, type ProductDetail } from '@aps/shared';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { ButtonLink } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/primitives';

/**
 * The flagship, told as a scroll sequence.
 *
 * The product image is pinned for the duration of the section while the spec
 * panels advance beside it — the Insta360 move. Pinning is disabled below
 * 1024px: on a phone there is no room for a fixed column and a scrolling one,
 * and a pinned element on a short viewport just feels stuck.
 */
export function FeaturedStory({ product }: { product: ProductDetail }) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const panels = product.features.length > 0
    ? product.features.slice(0, 3)
    : [];

  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current;
    if (!section) return;
    if (window.matchMedia('(max-width: 1023px)').matches) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'), import('gsap/ScrollTrigger'),
      ]);
      if (cancelled || !sectionRef.current) return;
      gsap.registerPlugin(ScrollTrigger);

      const context = gsap.context(() => {
        /* The media column is held in place by CSS `position: sticky`, not a
           GSAP pin. A pin with pinSpacing:false let the image escape its
           section and sit on top of the one below; sticky is scoped to its
           own container by definition and cannot do that. GSAP is left to do
           the one thing CSS cannot — cross-fade the layers on scroll. */

        // Each panel cross-fades its own image over the sticky frame.
        section.querySelectorAll('[data-story-panel]').forEach((panel, i) => {
          const layer = section.querySelector(`[data-story-layer="${i}"]`);
          if (!layer) return;
          gsap.fromTo(layer,
            { opacity: 0 },
            {
              opacity: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: panel,
                start: 'top 70%',
                end: 'top 35%',
                scrub: true,
              },
            },
          );
        });
      }, section);

      cleanup = () => context.revert();
    })();

    return () => { cancelled = true; cleanup?.(); };
  }, [reduced]);

  return (
    <section ref={sectionRef} className="on-ink relative py-24 md:py-32">
      <div className="shell">
        <div className="max-w-2xl">
          <Eyebrow>The flagship</Eyebrow>
          <h2 className="display-lg mt-4 text-on-ink">
            {product.name.replace(' Electric Grooming Table', '')}
            <span className="text-crimson">.</span>
          </h2>
          {product.tagline && <p className="lede mt-6">{product.tagline}</p>}
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Sticky media column — stays put while the copy beside it advances */}
          <div data-story-media className="lg:sticky lg:top-[14vh] lg:h-fit lg:self-start">
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-ink-line bg-ink-raised">
              <Image
                src={product.images[0]?.url ?? '/banners/hero-apex.jpg'}
                alt={product.name}
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
              {panels.map((panel, i) => (
                <div key={panel.id} data-story-layer={i} className="absolute inset-0 opacity-0">
                  <Image
                    src={panel.mediaUrl ?? product.images[i + 1]?.url ?? product.images[0]?.url ?? '/banners/hero-apex.jpg'}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 45vw, 100vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Scrolling copy column */}
          <div data-story-track className="space-y-24 lg:space-y-[38vh] lg:py-[10vh]">
            {panels.map((panel, i) => (
              <div key={panel.id} data-story-panel>
                <span aria-hidden="true" className="numeric font-display text-sm text-crimson">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {panel.eyebrow && <Eyebrow className="mt-3">{panel.eyebrow}</Eyebrow>}
                <h3 className="display-sm mt-3 text-on-ink">{panel.title}</h3>
                {panel.body && <p className="mt-4 max-w-md leading-relaxed text-on-ink-muted">{panel.body}</p>}

                {panel.stats.length > 0 && (
                  <dl className="mt-7 grid grid-cols-2 gap-5 sm:grid-cols-4">
                    {panel.stats.map((stat) => (
                      <div key={stat.label}>
                        <dt className="sr-only">{stat.label}</dt>
                        <dd className="numeric font-display text-2xl font-semibold text-on-ink">
                          {stat.value}
                        </dd>
                        <p className="mt-1 text-[0.6875rem] uppercase tracking-[0.14em] text-on-ink-muted">
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            ))}

            <div>
              <p className="numeric display-sm text-on-ink">{formatINR(product.price)}</p>
              {product.emiTeaser && (
                <p className="numeric mt-1 text-sm text-on-ink-muted">or from {product.emiTeaser} on EMI</p>
              )}
              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href={`/products/${product.slug}`} size="lg">
                  Full specification
                </ButtonLink>
                <ButtonLink href="/collections/electric-lifting" variant="secondary" size="lg">
                  Compare the range
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
