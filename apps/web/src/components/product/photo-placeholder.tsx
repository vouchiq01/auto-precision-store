/**
 * Stands in for a product photograph that has not been supplied yet.
 *
 * Some products are in the catalogue before their photography exists. A bare
 * "No image" in a large empty tile reads as a broken page; this reads as a
 * deliberate "photo to come", and costs the layout nothing because it fills the
 * same box the image would.
 */
export function PhotoPlaceholder({ label = 'Photo coming soon' }: { label?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-sand to-canvas text-faint">
      <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
        <circle cx="9" cy="10.5" r="1.5" />
        <path d="M4 17l4.5-4.5 3.5 3.5 3-3 5 5" />
      </svg>
      <span className="text-xs">{label}</span>
    </div>
  );
}
