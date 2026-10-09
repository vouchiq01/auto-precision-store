'use client';

import { useState } from 'react';
import type { ProductFaq as Faq } from '@aps/shared';
import { cn } from '@/lib/cn';
import { Eyebrow } from '@/components/ui/primitives';

export function ProductFaq({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<string | null>(faqs[0]?.id ?? null);
  if (faqs.length === 0) return null;

  return (
    <section className="shell py-10 md:py-14">
      <div>
        <Eyebrow>Questions</Eyebrow>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-[-0.025em] text-content md:text-[1.875rem]">The things people ask.</h2>
      </div>

      <dl className="mt-5 overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
        {faqs.map((faq) => {
          const expanded = open === faq.id;
          return (
            <div key={faq.id} className="border-b border-line last:border-b-0">
              <dt>
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : faq.id)}
                  aria-expanded={expanded}
                  aria-controls={`faq-${faq.id}`}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-display text-base font-medium tracking-[-0.015em] text-content md:text-[1.0625rem]">
                    {faq.question}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-full border border-line text-muted',
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
                  <p className="max-w-3xl px-5 pb-5 text-[0.9375rem] leading-relaxed text-muted">{faq.answer}</p>
                </div>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
