import { cn } from '@/lib/cn';

/**
 * The Auto Precision mark: a lowercase "ap" hanging from a full-width bar,
 * echoing the shirorekha of Devanagari.
 *
 * Drawn as SOLID letterforms, not outlined strokes. The first version stroked
 * the shapes at 3.4 units on a 52-unit box; rendered at its actual 28px that
 * put roughly 1.8px of line around counters only a few px across, which close
 * up and turn the mark into an unreadable glyph. Filled shapes with the
 * counters knocked out hold their shape at 20px and at 400px.
 *
 * The one detail that decides whether this reads "ap" or "dp": in a
 * single-storey "a" the bowl and its stem are the SAME height. The moment the
 * stem rises above the bowl you have drawn a "d". "p" then drops its descender
 * well below the baseline, which is the only vertical that breaks the line and
 * gives the mark its asymmetry.
 *
 * The holes are a mask rather than counter-coloured circles painted on top,
 * so the mark carries correctly onto the canvas, onto the ink footer, and onto
 * crimson without anyone having to remember to restate the background.
 */

/* Fixed rather than useId(): every instance renders identical geometry, so a
   shared definition is correct — and a constant keeps this a server component. */
const MASK_ID = 'ap-mark-counters';

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
        viewBox="0 0 64 56"
        className="h-7 w-auto"
        role="img"
        aria-label="Auto Precision"
      >
        <mask id={MASK_ID}>
          <rect width="64" height="56" fill="#000" />
          {/* the bar */}
          <rect x="0" y="0" width="64" height="6.5" rx="3.25" fill="#fff" />
          {/* a — bowl hung from the bar, stem stopping level with it */}
          <circle cx="17" cy="24" r="12.5" fill="#fff" />
          <rect x="24.5" y="3" width="6.5" height="33.5" fill="#fff" />
          {/* p — same bowl height, descender running well past the baseline */}
          <rect x="37" y="3" width="6.5" height="51" rx="0.5" fill="#fff" />
          <circle cx="50" cy="24" r="12.5" fill="#fff" />
          {/* counters */}
          <circle cx="16" cy="24" r="6.4" fill="#000" />
          <circle cx="51" cy="24" r="6.4" fill="#000" />
        </mask>
        <rect width="64" height="56" fill="currentColor" mask={`url(#${MASK_ID})`} />
      </svg>

      {showWordmark && (
        <span className="font-display text-[0.9375rem] font-bold tracking-[-0.01em] leading-none">
          Auto Precision
        </span>
      )}
    </span>
  );
}
