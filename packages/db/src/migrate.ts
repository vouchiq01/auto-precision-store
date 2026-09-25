import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

/**
 * Migrations must run on a direct (non-pooled) connection: the pooler's
 * transaction mode cannot hold the advisory lock the migrator relies on.
 * Use the port 5432 connection string here, not 6543.
 */
async function main(): Promise<void> {
  const connectionString = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DIRECT_DATABASE_URL or DATABASE_URL must be set');

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  console.log('Running migrations…');
  await migrate(db, { migrationsFolder: new URL('../migrations', import.meta.url).pathname });
  console.log('Migrations complete.');

  await client.end();
}

main().catch((error: unknown) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
