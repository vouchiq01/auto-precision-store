import { Reveal } from '@/components/motion/reveal';
import { Eyebrow } from '@/components/ui/primitives';

/**
 * Three steps, because "is this complicated?" is the unspoken objection behind
 * a ₹27,000 machine. Naming the whole operation in three short steps answers it
 * faster than any amount of specification can.
 */
const STEPS = [
  {
    n: '1',
    title: 'Set the height',
    body: 'Tap the foot bar, or pump the pedal, or drop a pin. Somewhere between your hip and your chest — wherever you can work without leaning.',
    time: 'Five seconds',
  },
  {
    n: '2',
    title: 'Dog on, noose on',
    body: 'Low enough that most dogs step up themselves. The noose goes round the neck loose — it stops a dog walking off the edge, it does not hold it down.',
    time: 'Ten seconds',
  },
  {
    n: '3',
    title: 'Turn, do not walk',
    body: 'Unlock the collar, bring the side you need round to your hand, lock it again. Repeat as often as you like; the dog never has to move.',
    time: 'Two seconds, any time',
  },
];

export function HowEasy() {
  return (
    <section className="shell py-20 md:py-28">
      <Reveal className="max-w-2xl">
        <Eyebrow>Using one</Eyebrow>
        <h2 className="display-md mt-4 text-bone">
          There are three steps, and that is all there is
          <span className="text-crimson">.</span>
        </h2>
      </Reveal>

      <Reveal stagger={0.1} className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-ink-line bg-ink-line md:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.n} className="bg-ink-raised p-7 md:p-8">
            <span
              aria-hidden="true"
              className="numeric font-display text-5xl font-semibold leading-none text-ink-line"
            >
              {step.n}
            </span>
            <h3 className="mt-5 font-display text-xl font-medium tracking-[-0.02em] text-bone">
              {step.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-steel">{step.body}</p>
            <p className="mt-5 text-[0.625rem] uppercase tracking-[0.14em] text-crimson">{step.time}</p>
          </div>
        ))}
      </Reveal>

      <p className="mt-8 max-w-2xl text-sm text-steel-dim">
        No assembly beyond bolting the arm on, which is one spanner and two minutes.
        Every table arrives built.
      </p>
    </section>
  );
}
