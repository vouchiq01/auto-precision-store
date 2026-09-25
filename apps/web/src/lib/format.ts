export { formatINR, formatAmount, discountPercent, paiseToRupees } from '@aps/shared';

/** "25 Sep 2026" */
export function formatDate(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "25 Sep 2026, 3:42 pm" */
export function formatDateTime(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  return date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

/** Millimetres to a human dimension string: 1220 → "1,220 mm" */
export function formatMm(mm: number | null | undefined): string | null {
  if (mm === null || mm === undefined || mm === 0) return null;
  return `${new Intl.NumberFormat('en-IN').format(mm)} mm`;
}

/** Grams to kilograms: 58000 → "58 kg" */
export function formatKg(grams: number | null | undefined): string | null {
  if (!grams) return null;
  const kg = grams / 1000;
  return `${Number.isInteger(kg) ? kg : kg.toFixed(1)} kg`;
}

export function pluralise(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural ?? `${singular}s`;
}
