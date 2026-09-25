import { cn } from '@/lib/cn';

/**
 * The Auto Precision mark: a lowercase "ap" hanging from a full-width bar,
 * echoing the shirorekha of Devanagari.
 *
 * The one detail that decides whether this reads "ap" or "dp": in a
 * single-storey "a" the bowl and its stem are the SAME height. The moment the
 * stem rises above the bowl you have drawn a "d". So the bowl's top sits on the
 * bar, and the stem runs from the bar down to the bowl's baseline — no further.
 *
 * "p" then drops its descender well below that baseline, which is the only
 * vertical that breaks the line and gives the mark its asymmetry.
 */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg
        viewBox="0 0 52 48"
        className="h-7 w-auto overflow-visible"
        role="img"
        aria-label="Auto Precision"
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* the bar */}
          <path d="M2.5 5.5 H49.5" />

          {/* a — bowl hung from the bar, stem stopping level with it */}
          <circle cx="15.5" cy="16" r="10.5" />
          <path d="M26 5.5 V26.5" />

          {/* p — bowl at the same cap height, descender running past the baseline */}
          <path d="M31.5 5.5 V45" />
          <path d="M31.5 7 H36.8 a8.2 8.2 0 0 1 0 16.4 H31.5" />
        </g>
      </svg>

      {showWordmark && (
        <span className="font-display text-[0.9375rem] font-bold tracking-[-0.01em] leading-none">
          Auto Precision
        </span>
      )}
    </span>
  );
}
