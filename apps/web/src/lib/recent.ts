/**
 * Two small lists kept in this browser only — what the shopper searched for and
 * which products they opened. Nothing here is sent anywhere or tied to an
 * account; localStorage can be blocked or full, so every access is guarded and
 * the screens render fine with both lists empty.
 */

const SEARCHES_KEY = 'aps_recent_searches';
const VIEWED_KEY = 'aps_recently_viewed';
const MAX_SEARCHES = 6;
const MAX_VIEWED = 8;

export interface ViewedProduct {
  slug: string;
  name: string;
  price: number;
  image: string | null;
}

function read<T>(key: string): T[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function write(key: string, value: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* blocked or full — the list just will not persist */ }
}

export function getRecentSearches(): string[] {
  return read<unknown>(SEARCHES_KEY).filter((v): v is string => typeof v === 'string');
}

export function rememberSearch(term: string): void {
  const clean = term.trim().slice(0, 60);
  if (clean.length < 2) return;
  const rest = getRecentSearches().filter((t) => t.toLowerCase() !== clean.toLowerCase());
  write(SEARCHES_KEY, [clean, ...rest].slice(0, MAX_SEARCHES));
}

export function forgetSearch(term: string): void {
  write(SEARCHES_KEY, getRecentSearches().filter((t) => t !== term));
}

export function clearSearches(): void {
  write(SEARCHES_KEY, []);
}

export function getRecentlyViewed(): ViewedProduct[] {
  return read<ViewedProduct>(VIEWED_KEY).filter(
    (p) => p && typeof p.slug === 'string' && typeof p.name === 'string' && typeof p.price === 'number',
  );
}

export function rememberViewed(product: ViewedProduct): void {
  const rest = getRecentlyViewed().filter((p) => p.slug !== product.slug);
  write(VIEWED_KEY, [product, ...rest].slice(0, MAX_VIEWED));
}
