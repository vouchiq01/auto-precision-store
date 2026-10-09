/** Five stars, filled to `value` (a partial star shows as a partial fill). `0` is five empty stars. */
export function Stars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  const path = 'M10 1.8l2.4 5 5.4.7-4 3.8 1 5.4L10 14l-4.8 2.7 1-5.4-4-3.8 5.4-.7z';
  const dim = size === 'md' ? 'size-5' : 'size-3.5';
  const row = (className: string) => (
    <span className={`flex ${className}`} aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" className={`${dim} shrink-0`} fill="currentColor"><path d={path} /></svg>
      ))}
    </span>
  );
  return (
    <span className="relative inline-flex">
      {row('text-line-strong')}
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${Math.min(100, Math.max(0, (value / 5) * 100))}%` }}>
        {row('text-amber-deep')}
      </span>
    </span>
  );
}
