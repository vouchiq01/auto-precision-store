import { formatINR, type Paise } from '@aps/shared';
import { cn } from '@/lib/cn';
import { KARNATAKA_FREE_FREIGHT } from '@/lib/store';

/**
 * "Add ₹X more for free freight" — the nudge that costs nothing and that people
 * do respond to. It only ever talks about Karnataka, because that is the only
 * threshold the site advertises; a buyer elsewhere still sees a true statement
 * ("free freight in Karnataka"), not a promise about their own pincode.
 */
export function FreightProgress({ total, compact = false }: { total: Paise; compact?: boolean }) {
  const left = Math.max(0, KARNATAKA_FREE_FREIGHT - total);
  const unlocked = left === 0;
  const percent = Math.min(100, Math.round((total / KARNATAKA_FREE_FREIGHT) * 100));

  return (
    <div
      className={cn(
        'rounded-2xl border',
        unlocked ? 'border-success/30 bg-success/5' : 'border-line bg-surface',
        compact ? 'p-3' : 'p-4 shadow-card',
      )}
    >
      <p className={cn('flex items-center gap-2 text-sm', unlocked ? 'text-success' : 'text-content')}>
        <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.5 6.5h10v8h-10z" />
          <path d="M12.5 9.5h4l3 3v2h-7z" />
          <circle cx="6.5" cy="16.5" r="1.75" />
          <circle cx="16" cy="16.5" r="1.75" />
        </svg>
        {unlocked ? (
          <span><strong className="font-semibold">Free freight unlocked</strong> for delivery in Karnataka.</span>
        ) : (
          <span>
            Add <strong className="numeric font-semibold">{formatINR(left)}</strong> more for free freight in Karnataka.
          </span>
        )}
      </p>
      <div
        className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-sand"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Progress toward free freight"
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-700 ease-out-expo', unlocked ? 'bg-success' : 'bg-gradient-to-r from-crimson to-amber')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
