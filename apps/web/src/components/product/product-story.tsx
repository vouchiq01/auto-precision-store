import Image from 'next/image';
import type { ProductFeature } from '@aps/shared';
import { cn } from '@/lib/cn';
import { Reveal } from '@/components/motion/reveal';
import { Eyebrow } from '@/components/ui/primitives';

/**
 * The scroll narrative, rendered straight from `product_features` rows.
 * Layout is chosen per row, so marketing can restructure a product page
 * without a deploy.
 */
export function ProductStory({ features }: { features: ProductFeature[] }) {
  if (features.length === 0) return null;

  return (
    <section className="rule bg-ink-raised py-20 md:py-28">
      <div className="shell space-y-24 md:space-y-32">
        {features.map((feature, index) => {
          if (feature.layout === 'stat_row') {
            return (
              <Reveal key={feature.id} className="text-center">
                <Eyebrow>{feature.eyebrow ?? 'By the numbers'}</Eyebrow>
                <h3 className="display-sm mt-3 text-bone">{feature.title}</h3>
                <dl className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4">
                  {feature.stats.map((stat) => (
                    <div key={stat.label}>
                      <dt className="sr-only">{stat.label}</dt>
                      <dd className="numeric font-display text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-none tracking-[-0.04em] text-bone">
                        {stat.value}
                      </dd>
                      <p className="mt-2 text-[0.6875rem] uppercase tracking-[0.14em] text-steel-dim">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </dl>
              </Reveal>
            );
          }

          if (feature.layout === 'quote') {
            return (
              <Reveal key={feature.id} className="mx-auto max-w-3xl text-center">
                <blockquote className="display-sm text-bone">“{feature.title}”</blockquote>
                {feature.body && <p className="mt-5 text-sm text-steel">{feature.body}</p>}
              </Reveal>
            );
          }

          if (feature.layout === 'media_full') {
            return (
              <Reveal key={feature.id}>
                {feature.mediaUrl && (
                  <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-ink-line">
                    <Image src={feature.mediaUrl} alt={feature.mediaAlt ?? ''} fill sizes="100vw" className="object-cover" />
                  </div>
                )}
                <div className="mx-auto mt-8 max-w-2xl text-center">
                  {feature.eyebrow && <Eyebrow>{feature.eyebrow}</Eyebrow>}
                  <h3 className="display-sm mt-3 text-bone">{feature.title}</h3>
                  {feature.body && <p className="mt-4 leading-relaxed text-steel">{feature.body}</p>}
                </div>
              </Reveal>
            );
          }

          const mediaLeft = feature.layout === 'media_left';

          return (
            <Reveal key={feature.id} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className={cn('relative aspect-[4/3] overflow-hidden rounded-3xl border border-ink-line',
                mediaLeft ? 'lg:order-1' : 'lg:order-2')}
              >
                {feature.mediaUrl && (
                  <Image
                    src={feature.mediaUrl}
                    alt={feature.mediaAlt ?? ''}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                  />
                )}
              </div>

              <div className={mediaLeft ? 'lg:order-2' : 'lg:order-1'}>
                <span aria-hidden="true" className="numeric font-display text-sm text-crimson">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {feature.eyebrow && <Eyebrow className="mt-3">{feature.eyebrow}</Eyebrow>}
                <h3 className="display-sm mt-3 text-bone">{feature.title}</h3>
                {feature.body && <p className="mt-5 max-w-md leading-relaxed text-steel">{feature.body}</p>}

                {feature.stats.length > 0 && (
                  <dl className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3">
                    {feature.stats.map((stat) => (
                      <div key={stat.label}>
                        <dt className="sr-only">{stat.label}</dt>
                        <dd className="numeric font-display text-2xl font-semibold text-bone">
                          {stat.value}
                        </dd>
                        <p className="mt-1 text-[0.625rem] uppercase tracking-[0.14em] text-steel-dim">{stat.label}</p>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
