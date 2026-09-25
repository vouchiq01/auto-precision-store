/**
 * Normalise the result of a raw `db.execute()`.
 *
 * Drizzle hands back whatever the underlying driver returns, and drivers
 * disagree: postgres-js yields an array-like, node-postgres and PGlite yield
 * `{ rows: [...] }`. Code that assumes one shape works until the day it meets
 * the other — and fails silently, because indexing a non-array just gives
 * `undefined` rather than throwing.
 */
export function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && 'rows' in result) {
    const rows = (result as { rows: unknown }).rows;
    if (Array.isArray(rows)) return rows as T[];
  }
  return [];
}
