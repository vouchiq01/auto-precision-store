'use client';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

const CLAIMS = [
  'Free freight across Karnataka over ₹25,000',
  'GST invoice on every order',
  'EMI from ₹2,199/mo',
  'Built and serviced in Bengaluru',
  '36-month frame warranty',
];

/**
 * Infinite ticker.
 *
 * The content is duplicated once and the track translated by exactly −50%, so
 * the loop point lands on an identical frame and there is no visible jump.
 * Under reduced motion it becomes a static, wrapping list — the claims are
 * information, so they must survive the animation being switched off.
 */
export function Marquee() {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div className="rule border-b border-ink-line py-4">
        <ul className="shell flex flex-wrap items-center gap-x-8 gap-y-2">
          {CLAIMS.map((claim) => (
            <li key={claim} className="text-[0.8125rem] text-steel">{claim}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="rule relative overflow-hidden border-b border-ink-line py-4">
      <div className="flex w-max animate-[marquee_38s_linear_infinite] gap-10 will-change-transform">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center gap-10" aria-hidden={copy === 1}>
            {CLAIMS.map((claim) => (
              <span key={claim} className="flex items-center gap-10 whitespace-nowrap text-[0.8125rem] text-steel">
                {claim}
                <span className="size-1 rounded-full bg-crimson" aria-hidden="true" />
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Feather the edges so items enter and leave instead of being clipped */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-ink to-transparent" />

      <style>{`
        @keyframes marquee {
          from { transform: translate3d(0, 0, 0); }
          to   { transform: translate3d(-50%, 0, 0); }
        }
      `}</style>
    </div>
  );
}
