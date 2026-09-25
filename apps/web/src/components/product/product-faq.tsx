'use client';

import { useState } from 'react';
import type { ProductFaq as Faq } from '@aps/shared';
import { cn } from '@/lib/cn';
import { Eyebrow, SectionNumber } from '@/components/ui/primitives';

export function ProductFaq({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<string | null>(faqs[0]?.id ?? null);
  if (faqs.length === 0) return null;

  return (
    <section className="shell py-20 md:py-28">
      <div className="flex items-end justify-between gap-8">
        <div>
          <Eyebrow>Questions</Eyebrow>
          <h2 className="display-md mt-4 text-bone">The things people ask.</h2>
        </div>
        <SectionNumber value="04" className="hidden md:block" />
      </div>

      <dl className="mt-12 border-t border-ink-line">
        {faqs.map((faq) => {
          const expanded = open === faq.id;
          return (
            <div key={faq.id} className="border-b border-ink-line">
              <dt>
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : faq.id)}
                  aria-expanded={expanded}
                  aria-controls={`faq-${faq.id}`}
                  className="flex w-full items-start justify-between gap-6 py-6 text-left"
                >
                  <span className="font-display text-lg font-medium tracking-[-0.015em] text-bone">
                    {faq.question}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-1 grid size-7 shrink-0 place-items-center rounded-full border border-ink-line text-steel',
                      'transition-transform duration-500 ease-out-expo',
                      expanded && 'rotate-45 border-crimson text-crimson',
                    )}
                  >
                    +
                  </span>
                </button>
              </dt>
              {/* Grid-rows trick: animates to the content's natural height without
                  measuring it in JS, and collapses cleanly to zero. */}
              <dd
                id={`faq-${faq.id}`}
                className={cn(
                  'grid transition-[grid-template-rows,opacity] duration-500 ease-out-expo',
                  expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                )}
              >
                <div className="overflow-hidden">
                  <p className="max-w-3xl pb-6 leading-relaxed text-steel">{faq.answer}</p>
                </div>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
