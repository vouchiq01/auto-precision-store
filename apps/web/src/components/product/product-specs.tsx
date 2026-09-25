import type { ProductDetail, ProductSpec } from '@aps/shared';
import { formatKg, formatMm } from '@/lib/format';
import { Reveal } from '@/components/motion/reveal';
import { Eyebrow, SectionNumber } from '@/components/ui/primitives';

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
  const groups = groupSpecs(product.specs);

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
    <section id="specification" className="shell scroll-mt-24 py-20 md:py-28">
      <div className="flex items-end justify-between gap-8">
        <div>
          <Eyebrow>Specification</Eyebrow>
          <h2 className="display-md mt-4 text-content">Every number we have.</h2>
        </div>
        <SectionNumber value="02" className="hidden md:block" />
      </div>

      <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
        {dimensions.length > 0 && (
          <Reveal>
            <h3 className="eyebrow mb-4 text-crimson!">Dimensions</h3>
            <dl className="divide-y divide-line border-t border-line">
              {dimensions.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-6 py-3">
                  <dt className="text-sm text-muted">{label}</dt>
                  <dd className="numeric text-sm text-content">{value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        )}

        {groups.map(([group, specs]) => (
          <Reveal key={group}>
            <h3 className="eyebrow mb-4 text-crimson!">{group}</h3>
            <dl className="divide-y divide-line border-t border-line">
              {specs.map((spec) => (
                <div key={spec.id} className="flex items-baseline justify-between gap-6 py-3">
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
