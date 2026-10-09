import type { ProductDetail, ProductSpec } from '@aps/shared';
import { formatKg, formatMm } from '@/lib/format';
import { Reveal } from '@/components/motion/reveal';
import { Eyebrow } from '@/components/ui/primitives';

/** Groups specs by their `group` column, preserving the order they arrive in. */
function groupSpecs(specs: ProductSpec[]): [string, ProductSpec[]][] {
  const groups = new Map<string, ProductSpec[]>();
  for (const spec of specs) {
    const existing = groups.get(spec.group);
    if (existing) existing.push(spec);
    else groups.set(spec.group, [spec]);
  }
  return [...groups.entries()];
}

export function ProductSpecs({ product }: { product: ProductDetail }) {
  /* The Dimensions card is built from the product's own columns (length, width, heights, load,
     weight). Spec rows that only restate those figures are dropped so the same number never
     appears twice on the page. */
  const RESTATED = new Set(['load capacity', 'height range', 'dimensions', 'weight', 'table weight']);
  const hasDimensionColumns = Boolean(
    product.dimensions.lengthMm || product.dimensions.widthMm || product.dimensions.heightMinMm
    || product.dimensions.loadCapacityKg || product.weightG,
  );
  const groups = groupSpecs(
    hasDimensionColumns ? product.specs.filter((spec) => !RESTATED.has(spec.label.trim().toLowerCase())) : product.specs,
  );

  // Dimensions come from dedicated columns rather than spec rows, because they
  // also drive freight banding — so they are rendered as their own block.
  const dimensions = [
    ['Length', formatMm(product.dimensions.lengthMm)],
    ['Width', formatMm(product.dimensions.widthMm)],
    ['Height (min)', formatMm(product.dimensions.heightMinMm)],
    ['Height (max)', formatMm(product.dimensions.heightMaxMm)],
    ['Load capacity', product.dimensions.loadCapacityKg ? `${product.dimensions.loadCapacityKg} kg` : null],
    ['Table weight', formatKg(product.weightG)],
  ].filter((row): row is [string, string] => row[1] !== null);

  if (groups.length === 0 && dimensions.length === 0) return null;

  return (
    <section id="specification" className="shell scroll-mt-32 py-10 md:py-14">
      <div>
        <Eyebrow>Specification</Eyebrow>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-[-0.025em] text-content md:text-[1.875rem]">Every number we have.</h2>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {dimensions.length > 0 && (
          <Reveal className="rounded-2xl bg-surface p-5 ring-1 ring-line">
            <h3 className="eyebrow mb-3 text-crimson!">Dimensions</h3>
            <dl className="divide-y divide-line border-t border-line">
              {dimensions.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-6 py-2.5">
                  <dt className="text-sm text-muted">{label}</dt>
                  <dd className="numeric text-sm text-content">{value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        )}

        {groups.map(([group, specs]) => (
          <Reveal key={group} className="rounded-2xl bg-surface p-5 ring-1 ring-line">
            <h3 className="eyebrow mb-3 text-crimson!">{group}</h3>
            <dl className="divide-y divide-line border-t border-line">
              {specs.map((spec) => (
                <div key={spec.id} className="flex items-baseline justify-between gap-6 py-2.5">
                  <dt className="text-sm text-muted">{spec.label}</dt>
                  <dd className="numeric text-right text-sm text-content">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
