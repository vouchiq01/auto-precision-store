import { eq } from 'drizzle-orm';
import { createDb, isPgliteUrl } from '../client.ts';
import { bootstrapLocalDatabase } from '../bootstrap.ts';
import * as s from '../schema/index.ts';
import { EXTRA_PRODUCTS } from './products.extra.ts';

/**
 * Give each product its card tag — Hot, Best Seller, New or Trending — as the first of its badges.
 * These are PLACEHOLDER assignments for the owner to change (Admin → Products → "Card tag"); the
 * only one with a factual basis is "New": the second-wave products really were added most recently.
 * Hot / Best Seller / Trending need his own sales knowledge — there is no sales data behind them.
 *
 * Idempotent, and it only touches `badges`: any tag already on a product is replaced, other
 * badges are kept (the card shows the tag; the product page shows all of them).
 *
 *   DATABASE_URL=<direct url> npm run seed:tags -w @aps/db
 */
const TAGS = ['Hot', 'Best Seller', 'New', 'Trending'] as const;
type Tag = (typeof TAGS)[number];

const ASSIGN: Record<string, Tag> = {
  'apex-e9-electric-grooming-table': 'Hot',
  'orbit-r-led-round-table': 'Hot',
  'orbit-r-round-rotating-table': 'Best Seller',
  'vertex-x-electric-lifting-table': 'Best Seller',
  'apex-e7-electric-grooming-table': 'Best Seller',
  'stride-adjustable-portable-table': 'Trending',
  'orbit-r-mini-round-table': 'Trending',
  'vertex-x-pro-electric-lifting-table': 'Trending',
  ...Object.fromEntries(EXTRA_PRODUCTS.map((p) => [p.slug, 'New' as Tag])),
};

const isTag = (badge: string) => {
  const n = badge.toLowerCase().replace(/[^a-z]/g, '');
  return n === 'hot' || n === 'bestseller' || n === 'new' || n === 'trending';
};

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL ?? '';
  const db = isPgliteUrl(url) ? await bootstrapLocalDatabase(url) : createDb({ max: 1 });

  const rows = await db.select({ id: s.products.id, slug: s.products.slug, badges: s.products.badges }).from(s.products);
  let changed = 0;
  for (const row of rows) {
    const tag = ASSIGN[row.slug];
    if (!tag) continue;
    const next = [tag, ...(row.badges ?? []).filter((b) => !isTag(b))].slice(0, 3);
    if (JSON.stringify(next) === JSON.stringify(row.badges)) continue;
    await db.update(s.products).set({ badges: next }).where(eq(s.products.id, row.id));
    changed += 1;
    console.log(`  ${row.slug}: ${next.join(', ')}`);
  }
  console.log(`\nTagged ${changed} products (${rows.length} in the catalogue). Nothing else was changed.`);
  process.exit(0);
}

main().catch((err) => { console.error('seed:tags failed:', err); process.exit(1); });
