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
    <section className="rule bg-surface py-10 md:py-14">
      <div className="shell space-y-12 md:space-y-16">
        {features.map((feature, index) => {
          if (feature.layout === 'stat_row') {
            return (
              <Reveal key={feature.id} className="text-center">
                <Eyebrow>{feature.eyebrow ?? 'By the numbers'}</Eyebrow>
                <h3 className="display-sm mt-3 text-content">{feature.title}</h3>
                <dl className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
                  {feature.stats.map((stat) => (
                    <div key={stat.label}>
                      <dt className="sr-only">{stat.label}</dt>
                      <dd className="numeric font-display text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-none tracking-[-0.04em] text-content">
                        {stat.value}
                      </dd>
                      <p className="mt-2 text-[0.6875rem] uppercase tracking-[0.14em] text-faint">
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
                <blockquote className="display-sm text-content">“{feature.title}”</blockquote>
                {feature.body && <p className="mt-5 text-sm text-muted">{feature.body}</p>}
              </Reveal>
            );
          }

          if (feature.layout === 'media_full') {
            return (
              <Reveal key={feature.id}>
                {feature.mediaUrl && (
                  <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-line">
                    <Image src={feature.mediaUrl} alt={feature.mediaAlt ?? ''} fill sizes="100vw" className="object-cover" />
                  </div>
                )}
                <div className="mx-auto mt-8 max-w-2xl text-center">
                  {feature.eyebrow && <Eyebrow>{feature.eyebrow}</Eyebrow>}
                  <h3 className="display-sm mt-3 text-content">{feature.title}</h3>
                  {feature.body && <p className="mt-4 leading-relaxed text-muted">{feature.body}</p>}
                </div>
              </Reveal>
            );
          }

          const mediaLeft = feature.layout === 'media_left';
          /* A section can exist before its picture does. Without one it is
             plain text, not an empty bordered box. */
          const hasMedia = Boolean(feature.mediaUrl);

          return (
            <Reveal key={feature.id} className={cn('grid items-center gap-6 lg:gap-14', hasMedia && 'lg:grid-cols-2')}>
              {hasMedia && (
                <div className={cn('relative aspect-[4/3] overflow-hidden rounded-3xl border border-line',
                  mediaLeft ? 'lg:order-1' : 'lg:order-2')}
                >
                  <Image
                    src={feature.mediaUrl!}
                    alt={feature.mediaAlt ?? ''}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
              )}

              <div className={cn(hasMedia && (mediaLeft ? 'lg:order-2' : 'lg:order-1'))}>
                {feature.eyebrow && <Eyebrow>{feature.eyebrow}</Eyebrow>}
                <h3 className="display-sm mt-2 text-content">{feature.title}</h3>
                {feature.body && <p className="mt-3 max-w-md leading-relaxed text-muted">{feature.body}</p>}

                {feature.stats.length > 0 && (
                  <dl className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3">
                    {feature.stats.map((stat) => (
                      <div key={stat.label}>
                        <dt className="sr-only">{stat.label}</dt>
                        <dd className="numeric font-display text-2xl font-semibold text-content">
                          {stat.value}
                        </dd>
                        <p className="mt-1 text-[0.625rem] uppercase tracking-[0.14em] text-faint">{stat.label}</p>
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
