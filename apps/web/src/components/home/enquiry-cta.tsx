import { Reveal } from '@/components/motion/reveal';
import { ButtonLink } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/primitives';

export function EnquiryCta() {
  return (
    <section className="shell py-24 md:py-32">
      <Reveal className="relative overflow-hidden rounded-3xl border border-ink-line bg-ink-raised px-7 py-16 md:px-16 md:py-24">
        {/* Oversized ghost numeral, from the Nhale reference */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-10 select-none font-display text-[14rem] font-bold leading-none text-white/[0.02] md:text-[22rem]"
        >
           05
        </span>

        <div className="relative max-w-2xl">
          <Eyebrow>Buying more than one</Eyebrow>
          <h2 className="display-md mt-4 text-bone">
            Not sure which one? Ask us.
          </h2>
          <p className="lede mt-6">
            Tell us what you groom, how often, and the room you have. We will tell you which
            table actually suits — including when the cheapest one is the right answer, which
            it often is. Buying two or more gets trade pricing.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/enquiry" size="lg">Start an enquiry</ButtonLink>
            <ButtonLink href="/pages/faq" variant="secondary" size="lg">Read the FAQ</ButtonLink>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
