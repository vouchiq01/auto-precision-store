import { Reveal } from '@/components/motion/reveal';
import { ButtonLink } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/primitives';

/**
 * The last thing on the homepage: one compact, tinted card — a line of advice on the left, the two
 * actions on the right (stacked on a phone). Everything it says is already true elsewhere on the
 * site: we will recommend the right table (including the cheapest), and buying two or more gets
 * trade pricing.
 */
export function EnquiryCta() {
  return (
    <section className="shell pb-2 pt-6 md:pb-4 md:pt-10">
      <Reveal className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFF1E6] via-[#FBF4EC] to-[#FDE6E2] px-5 py-7 ring-1 ring-black/5 md:px-12 md:py-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-crimson/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-12">
          <div className="max-w-xl">
            <Eyebrow className="text-crimson!">Buying more than one</Eyebrow>
            <h2 className="mt-2 font-display text-[1.625rem] font-semibold leading-[1.08] tracking-[-0.03em] text-content md:text-[2.125rem]">
              Not sure which one? Ask us.
            </h2>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted md:text-base">
              Tell us what you groom, how often, and the room you have. We will tell you which table
              actually suits — even when the cheapest is the right answer.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-content">
              {['Honest advice', 'Trade pricing on 2 or more'].map((point) => (
                <li key={point} className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-black/5">
                  <svg viewBox="0 0 16 16" className="size-3 text-success" aria-hidden="true">
                    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row md:flex-col">
            <ButtonLink href="/enquiry" size="lg" className="w-full justify-center">Start an enquiry</ButtonLink>
            <ButtonLink href="/pages/faq" variant="secondary" size="lg" className="w-full justify-center bg-white/80">Read the FAQ</ButtonLink>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
