import Image from 'next/image';
import { Reveal } from '@/components/motion/reveal';
import { ButtonLink } from '@/components/ui/button';
import { Eyebrow, SectionNumber } from '@/components/ui/primitives';

/**
 * What the product actually does.
 *
 * The rest of the homepage sells the brand; this section sells the machine —
 * it rises, it rotates, it holds the dog still. Without it a visitor who has
 * never used a grooming table has no idea what one is for, or why it would be
 * easier than what they already do. It sits directly under the hero for that
 * reason: convince first, let them browse second.
 */

const CAPABILITIES = [
  {
    n: '01',
    eyebrow: 'It goes up and down',
    title: 'The dog comes to your height.',
    body:
      'Every table in the range adjusts — powered on the Apex and Vertex lines, foot-pumped '
      + 'on the Anchor, pinned by hand on the portables. Drop it to 510 mm and an old or '
      + 'nervous dog walks straight on instead of being lifted. Raise it to a metre and you '
      + 'clip a small breed standing upright, not folded over it.',
    stats: [
      { value: '510mm', label: 'Lowest step-on' },
      { value: '1,050mm', label: 'Highest working' },
      { value: '11s', label: 'Full travel, powered' },
    ],
    image: '/products/apex-e9-electric-grooming-table/feature-1.jpg',
  },
  {
    n: '02',
    eyebrow: 'It rotates',
    title: 'Turn the dog, not yourself.',
    body:
      'A 360° locking deck on every electric and hydraulic model, and on the whole round '
      + 'Orbit R range. Unlock, bring the far shoulder round to your scissor hand, lock '
      + 'again — about two seconds, one hand. The alternative is walking round the table, '
      + 'or asking a dog that has finally settled to get up and settle again.',
    stats: [
      { value: '360°', label: 'Full rotation' },
      { value: 'Lock', label: 'At any angle' },
      { value: '2s', label: 'To reposition' },
    ],
    image: '/products/orbit-r-round-rotating-table/feature-1.jpg',
  },
  {
    n: '03',
    eyebrow: 'It is easy to live with',
    title: 'And it folds away when you are done.',
    body:
      'You do not need a room for it. The lightest table is 9 kg and stands against a '
      + 'wall at 110 mm thick; the round ones take a 620 mm circle of floor and nothing '
      + 'more. Set up takes under a minute — unfold, set the height, hook the arm on.\n\n'
      + 'And the dog learns it. A dog groomed in the same place at the same height settles '
      + 'for it far faster than one chased around a living room, which is most of the '
      + 'battle with a puppy.',
    stats: [
      { value: '9kg', label: 'Lightest, folds flat' },
      { value: '₹8,900', label: 'From' },
      { value: '110mm', label: 'Folded, against a wall' },
    ],
    image: '/products/stride-air-ultralight-table-medium/feature-1.jpg',
  },
];

export function WhatItDoes() {
  return (
    <section className="rule bg-surface py-24 md:py-32">
      <div className="shell">
        <div className="flex items-end justify-between gap-8">
          <div className="max-w-2xl">
            <Eyebrow>What a grooming table does</Eyebrow>
            <h2 className="display-md mt-4 text-content">
              It lifts, it turns, it holds the dog still<span className="text-crimson">.</span>
            </h2>
            <p className="lede mt-6">
              Three mechanical things, and every one of them is about your back and the
              dog&rsquo;s patience rather than the table itself.
            </p>
          </div>
          <SectionNumber value="01" className="hidden md:block" />
        </div>

        <div className="mt-16 space-y-20 md:space-y-28">
          {CAPABILITIES.map((item, index) => (
            <Reveal
              key={item.n}
              className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
            >
              <div
                className={`relative aspect-[4/3] overflow-hidden rounded-3xl border border-line ${
                  index % 2 === 1 ? 'lg:order-2' : ''
                }`}
              >
                <Image
                  src={item.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-content/5" />
              </div>

              <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                <span aria-hidden="true" className="numeric font-display text-sm text-crimson">
                  {item.n}
                </span>
                <Eyebrow className="mt-3">{item.eyebrow}</Eyebrow>
                <h3 className="display-sm mt-3 text-content">{item.title}</h3>
                <p className="mt-5 max-w-md leading-relaxed text-muted">{item.body}</p>

                <dl className="mt-8 grid grid-cols-3 gap-5">
                  {item.stats.map((stat) => (
                    <div key={stat.label}>
                      <dt className="sr-only">{stat.label}</dt>
                      <dd className="numeric font-display text-xl font-semibold text-content md:text-2xl">
                        {stat.value}
                      </dd>
                      <p className="mt-1 text-[0.625rem] uppercase tracking-[0.14em] text-faint">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap gap-3">
          <ButtonLink href="/collections/round-rotating" size="lg">
            See the round tables
          </ButtonLink>
          <ButtonLink href="/collections/portable" variant="secondary" size="lg">
            Lighter tables for home
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
