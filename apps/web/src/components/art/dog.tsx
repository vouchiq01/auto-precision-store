/**
 * The house dog.
 *
 * Drawn rather than photographed, for three reasons: there is no licensed photo
 * of a dog on one of our tables, an illustration carries the brand colour where
 * a stock photo fights it, and a drawing can be animated through the whole
 * lift-turn-settle sequence that the product is actually for.
 *
 * Built from geometric primitives on purpose. Freehand animal beziers drift
 * toward clip-art; circles and capsules stay in the same family as Clash
 * Display's geometry and hold their shape at 40px as well as at 400px.
 *
 * Two complete poses rather than a rig. Cross-fading a standing dog into a
 * sitting one at the moment it lands on the table reads as "it hopped up and
 * sat down" — the eye fills in the motion, and nothing can snap to a broken
 * in-between the way an interpolated skeleton can.
 */

type Pose = 'standing' | 'sitting';

/**
 * The figure without its own <svg>, so the scroll stage can compose it into a
 * larger scene and share one coordinate space with the table. Drawn on a
 * 240 x 152 box with the feet at y=150.
 */
export function DogFigure({ pose = 'standing', wag = false }: { pose?: Pose; wag?: boolean }) {
  return (
    <>
      {/* The far pair of legs, set back a tone. Without the tonal step the four
          legs read as one flat paddle; too big a step and they read as socks. */}
      <g fill="currentColor" opacity="0.62">
        {pose === 'standing' ? (
          <>
            <rect x="114" y="96" width="14" height="54" rx="7" />
            <rect x="46" y="96" width="14" height="54" rx="7" />
          </>
        ) : (
          <rect x="113" y="100" width="14" height="50" rx="7" />
        )}
      </g>

      <g fill="currentColor">
        {pose === 'standing' ? (
          <>
            <rect x="130" y="96" width="15" height="54" rx="7.5" />
            <rect x="62" y="96" width="15" height="54" rx="7.5" />
            {/* Barrel, then a wedge of neck carrying it up to the head */}
            <ellipse cx="100" cy="82" rx="54" ry="30" />
            <path d="M128 58c10-12 24-17 38-14l8 30c-14 7-32 8-46 3z" />
          </>
        ) : (
          <>
            {/* A sit is read almost entirely from the haunch dropping to the
                floor while the chest stays upright, so that is one continuous
                silhouette rather than a stack of ellipses. Paint order matters
                here: the front leg has to land ON the body, or the barrel
                swallows it and the whole thing reads as a seal. */}
            {/* Haunch reaches the floor — that IS the sit. The chest stops
                short of it so the front legs have somewhere to be: inside one
                flat fill a limb drawn over the body is simply invisible. */}
            <circle cx="74" cy="112" r="38" />
            <ellipse cx="114" cy="80" rx="33" ry="37" transform="rotate(10 114 80)" />
            <path d="M120 52c10-13 25-18 40-15l8 31c-15 7-34 8-49 3z" />
            <rect x="128" y="94" width="15" height="56" rx="7.5" />
          </>
        )}
      </g>

      {/* Head. On the sit it rides higher and further back over the chest. */}
      <g transform={pose === 'sitting' ? 'translate(-30,-12)' : undefined}>
        <g fill="currentColor">
          {/* Ear first, so the skull overlaps it and it reads as set behind */}
          <ellipse cx="157" cy="31" rx="10" ry="18" transform="rotate(-26 157 31)" />
          <circle cx="176" cy="52" r="25" />
          <rect x="193" y="47" width="33" height="20" rx="10" />
        </g>
        <circle cx="223" cy="51" r="5" fill="currentColor" />
        {/* Knocked out of the silhouette rather than drawn on it, so the eye
            survives whatever colour the dog is set to. */}
        <circle cx="182" cy="44" r="3.4" className="fill-canvas" />
      </g>

      {/* Tail */}
      <g
        className={wag ? 'motion-safe:animate-[wag_1.5s_ease-in-out_infinite]' : undefined}
        style={{ transformOrigin: pose === 'standing' ? '52px 72px' : '48px 132px' }}
      >
        <path
          d={pose === 'standing' ? 'M54 72c-13-3-23-15-25-31' : 'M48 132c-16 2-26-4-30-16'}
          fill="none"
          stroke="currentColor"
          strokeWidth="11"
          strokeLinecap="round"
        />
      </g>

      {/* Collar — the one crimson mark on the animal. Banded across the neck
          axis rather than drawn vertically, which just reads as a stripe. */}
      <g transform={pose === 'sitting' ? 'translate(-30,-12)' : undefined}>
        <rect
          x="140" y="46" width="10" height="30" rx="5"
          fill="var(--color-crimson)"
          transform="rotate(-24 145 61)"
        />
      </g>

    </>
  );
}

export function Dog({
  pose = 'standing',
  className,
  /** Drives the tail. Off for the static/reduced-motion case. */
  wag = false,
  title,
  ...rest
}: {
  pose?: Pose;
  className?: string;
  wag?: boolean;
  title?: string;
} & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 240 152"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      {...rest}
    >
      <DogFigure pose={pose} wag={wag} />
    </svg>
  );
}
