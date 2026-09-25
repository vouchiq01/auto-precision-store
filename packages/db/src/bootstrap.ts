import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createPgliteDb, isPgliteUrl, setDb, type Database } from './client.ts';

/**
 * Prepares the local PGlite database: creates the file store, applies every
 * migration, and installs it as the process-wide database.
 *
 * Migrations are applied idempotently by checking whether the tables already
 * exist, so restarting the dev server does not wipe or duplicate anything.
 */
export async function bootstrapLocalDatabase(connectionString: string): Promise<Database> {
  const db = await createPgliteDb(connectionString);
  setDb(db);

  const migrationsDir = new URL('../migrations', import.meta.url).pathname;
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const text = readFileSync(join(migrationsDir, file), 'utf8');
    const statements = text.split('--> statement-breakpoint').map((s) => s.trim()).filter(Boolean);
    for (const statement of statements) {
      try {
        await db.execute(statement as never);
      } catch (error) {
        /* "already exists" is the expected outcome on every run after the first.
           Anything else is a real migration failure and must surface. */
        const message = error instanceof Error ? error.message : String(error);
        if (!/already exists/i.test(message)) throw error;
      }
    }
  }

  return db;
}

export { isPgliteUrl };
