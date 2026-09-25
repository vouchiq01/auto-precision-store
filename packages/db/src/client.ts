import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.ts';

export type Database = PostgresJsDatabase<typeof schema>;

let cachedClient: postgres.Sql | null = null;
let cachedDb: Database | null = null;

export interface DbOptions {
  connectionString?: string;
  /** Render's free tier is memory-constrained; keep the pool small. */
  max?: number;
}

/**
 * A file-backed PGlite database, for running the whole stack locally with no
 * Postgres server and no Supabase project.
 *
 * Set DATABASE_URL=pglite://./.localdb and everything — migrations, seed, API —
 * works offline against real PostgreSQL compiled to WebAssembly. Intended for
 * development and demos only: PGlite is single-connection, so it will not take
 * concurrent production traffic.
 */
export function isPgliteUrl(url: string | undefined): boolean {
  return Boolean(url?.startsWith('pglite://'));
}

export async function createPgliteDb(connectionString: string): Promise<Database> {
  const raw = connectionString.replace(/^pglite:\/\//, '') || './.localdb';

  /* A relative path is resolved against the REPO ROOT, not process.cwd().
     The API runs from apps/api and the seeder from packages/db; resolving
     against cwd would silently give each one its own empty database. */
  const { fileURLToPath } = await import('node:url');
  const { dirname, isAbsolute, resolve } = await import('node:path');
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  const path = isAbsolute(raw) ? raw : resolve(repoRoot, raw);
  const [{ PGlite }, { drizzle: drizzlePglite }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
  ]);
  const client = new PGlite(path);
  return drizzlePglite(client, { schema }) as unknown as Database;
}

/**
 * Supabase's connection pooler (port 6543) runs in transaction mode, which does
 * not support prepared statements. Disabling `prepare` is what stops the
 * "prepared statement already exists" errors that otherwise appear only under
 * concurrency, in production, on a Sunday.
 */
export function createDb(options: DbOptions = {}): Database {
  const connectionString = options.connectionString ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
  }

  const usesPooler = connectionString.includes(':6543') || connectionString.includes('pooler.supabase');

  const client = postgres(connectionString, {
    max: options.max ?? 5,
    prepare: !usesPooler,
    idle_timeout: 20,
    connect_timeout: 15,
  });

  return drizzle(client, { schema });
}

/**
 * Override the process-wide database.
 *
 * Exists so integration tests can point the whole application at an in-process
 * PGlite instance without every service taking a `db` parameter it would never
 * otherwise need. Production code must never call this.
 */
export function setDb(db: Database | null): void {
  cachedDb = db;
}

/** Process-wide singleton, so hot reload does not open a new pool per edit. */
export function getDb(): Database {
  if (!cachedDb) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not set.');
    const usesPooler = connectionString.includes(':6543') || connectionString.includes('pooler.supabase');
    cachedClient = postgres(connectionString, { max: 5, prepare: !usesPooler, idle_timeout: 20, connect_timeout: 15 });
    cachedDb = drizzle(cachedClient, { schema });
  }
  return cachedDb;
}

export async function closeDb(): Promise<void> {
  if (cachedClient) {
    await cachedClient.end({ timeout: 5 });
    cachedClient = null;
    cachedDb = null;
  }
}

export { schema };
