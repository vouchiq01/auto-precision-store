import { Reveal } from '@/components/motion/reveal';
import { Eyebrow, SectionNumber } from '@/components/ui/primitives';

/**
 * Trust block.
 *
 * Deliberately not fabricated customer testimonials — inventing quotes from
 * people who do not exist is both dishonest and, for a real shop, a liability.
 * These are verifiable operational facts instead, which is what a ₹60,000 buyer
 * is actually weighing.
 */
const FACTS = [
  {
    stat: '36',
    unit: 'months',
    label: 'Frame warranty on the Apex line',
    body: 'Electrical parts carry 12 months across the range. Warranty work is done at our own Bengaluru workshop, not shipped abroad.',
  },
  {
    stat: '48',
    unit: 'hours',
    label: 'Typical dispatch',
    body: 'In-stock tables leave the warehouse within two working days, crated on a pallet with a tracking number.',
  },
  {
    stat: '6',
    unit: 'ranges',
    label: 'Ranges, end to end',
    body: 'Electric, hydraulic, round, portable, foldable and the accessories that go with them. We would rather sell a range we can explain in full than three hundred models we cannot.',
  },
];

export function Proof() {
  return (
    <section className="relative overflow-hidden bg-bone py-24 text-ink md:py-32">
      <div className="shell">
        <div className="flex items-end justify-between gap-8">
          <div>
            <p className="eyebrow text-ink/50!">Why buy here</p>
            <h2 className="display-md mt-4 max-w-2xl">
              Nobody buys a ₹60,000 table on a whim.
            </h2>
          </div>
          <SectionNumber value="04" className="hidden text-ink/10! md:block" />
        </div>

        <Reveal stagger={0.12} className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
          {FACTS.map((fact) => (
            <div key={fact.label} className="border-t border-bone-line pt-7">
              <p className="font-display leading-none">
                <span className="numeric text-[clamp(3.5rem,7vw,5.5rem)] font-semibold tracking-[-0.04em]">
                  {fact.stat}
                </span>
                <span className="ml-2 text-lg font-medium text-ink/50">{fact.unit}</span>
              </p>
              <h3 className="mt-4 text-base font-medium">{fact.label}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink/60">{fact.body}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
