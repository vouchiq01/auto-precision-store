import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import type { Database } from './client.ts';
import { setDb } from './client.ts';
import * as schema from './schema/index.ts';

/**
 * An in-process Postgres for integration tests.
 *
 * PGlite is genuine PostgreSQL compiled to WebAssembly, so transactions,
 * FOR UPDATE, advisory locks and generate_series all behave as they will in
 * production — unlike a mock, which would happily let a concurrency bug through.
 */
export interface TestDatabase {
  db: Database;
  client: PGlite;
  close: () => Promise<void>;
}

export async function createTestDatabase(migrationsDir?: string): Promise<TestDatabase> {
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as Database;

  const dir = migrationsDir ?? new URL('../migrations', import.meta.url).pathname;
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sqlText = readFileSync(join(dir, file), 'utf8');
    /* drizzle-kit separates statements with this marker. Splitting on it rather
       than on semicolons keeps function bodies and quoted strings intact. */
    const statements = sqlText.split('--> statement-breakpoint').map((s) => s.trim()).filter(Boolean);
    for (const statement of statements) {
      await client.exec(statement);
    }
  }

  setDb(db);

  return {
    db,
    client,
    close: async () => {
      setDb(null);
      await client.close();
    },
  };
}
