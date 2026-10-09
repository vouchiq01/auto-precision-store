import { sql } from 'drizzle-orm';
import { createDb, isPgliteUrl } from './client.ts';
import { bootstrapLocalDatabase } from './bootstrap.ts';

/**
 * Turn row-level security ON for every table in the public schema.
 *
 * Why: Supabase publishes the `public` schema through its Data API, which anyone
 * holding the project's public (anon / publishable) key can call. With RLS off, that
 * key could read and change every customer, order, sign-in code and session. With RLS
 * on and NO policies the public roles see and change nothing, while this store is
 * unaffected: the API connects as the `postgres` role, which bypasses RLS.
 *
 * Run it after any migration that adds a table (idempotent — safe to repeat):
 *
 *   DATABASE_URL=<direct url> npm run db:secure -w @aps/db
 *
 * The production database was secured this way on 2026-10-09. Tables created by a
 * later migration are NOT covered until this is run again.
 */
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL ?? '';
  const db = isPgliteUrl(url) ? await bootstrapLocalDatabase(url) : createDb({ max: 1 });

  await db.execute(sql`
    do $$
    declare t record;
    begin
      for t in select tablename from pg_tables where schemaname = 'public' loop
        execute format('alter table public.%I enable row level security', t.tablename);
      end loop;
    end $$;
  `);

  const result = await db.execute(sql`
    select count(*) filter (where rowsecurity)::int as protected, count(*)::int as total
    from pg_tables where schemaname = 'public'
  `);
  const row = ((result as unknown as { rows?: Record<string, number>[] }).rows ?? (result as unknown as Record<string, number>[]))[0];
  console.log(`Row-level security is on for ${row?.protected} of ${row?.total} tables.`);
  process.exit(0);
}

main().catch((err) => { console.error('db:secure failed:', err); process.exit(1); });
