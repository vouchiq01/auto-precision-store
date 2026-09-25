import { closeDb, getDb, isPgliteUrl } from '@aps/db';
import { bootstrapLocalDatabase } from '@aps/db/bootstrap';
import { sql } from 'drizzle-orm';
import { createApp } from './app.ts';
import { env } from './env.ts';
import { logger } from './lib/logger.ts';
import { purgeExpiredCredentials } from './services/auth.service.ts';
import { releaseAbandonedOrders } from './services/order.service.ts';

const app = createApp();

async function verifyDatabase(): Promise<void> {
  /* Local development can run against a file-backed PGlite database, so the
     whole stack works with no Postgres server and no Supabase project. The URL
     scheme is what selects it; production always uses a real connection string. */
  if (isPgliteUrl(env.DATABASE_URL)) {
    await bootstrapLocalDatabase(env.DATABASE_URL);
    logger.info({ url: env.DATABASE_URL }, 'using local PGlite database (development only)');
    return;
  }

  const db = getDb();
  await db.execute(sql`select 1`);
  logger.info('database connection verified');
}

/**
 * Background housekeeping.
 *
 * Two jobs, both of which the store degrades without:
 *  - expired OTPs and refresh tokens accumulate forever otherwise
 *  - stock reserved by an abandoned checkout is never released otherwise,
 *    which quietly removes items from sale
 *
 * setInterval on a single instance is deliberate. If the API is ever scaled
 * past one dyno these need moving to a real scheduler, or every instance will
 * run them simultaneously.
 */
function startHousekeeping(): NodeJS.Timeout[] {
  const fifteenMinutes = 15 * 60 * 1000;

  const purge = setInterval(() => {
    void purgeExpiredCredentials()
      .then(({ otps, tokens }) => {
        if (otps + tokens > 0) logger.info({ otps, tokens }, 'purged expired credentials');
      })
      .catch((error: unknown) => logger.error({ err: error }, 'credential purge failed'));
  }, fifteenMinutes);

  const release = setInterval(() => {
    void releaseAbandonedOrders(45)
      .catch((error: unknown) => logger.error({ err: error }, 'abandoned-order release failed'));
  }, fifteenMinutes);

  // Do not hold the process open purely for a timer.
  purge.unref();
  release.unref();
  return [purge, release];
}

async function main(): Promise<void> {
  await verifyDatabase();

  const server = app.listen(env.PORT, () => {
    logger.info(`Auto Precision API listening on :${env.PORT} (${env.NODE_ENV})`);
  });

  const timers = startHousekeeping();

  /* Render sends SIGTERM and waits ~30s before SIGKILL. Draining in-flight
     requests first means a shopper mid-checkout during a deploy is not
     disconnected with a half-written order. */
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down');
    for (const timer of timers) clearInterval(timer);

    server.close(() => {
      void closeDb().then(() => {
        logger.info('shutdown complete');
        process.exit(0);
      });
    });

    setTimeout(() => {
      logger.error('forced exit — connections did not drain in time');
      process.exit(1);
    }, 15_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'unhandled promise rejection');
  });
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'uncaught exception — exiting');
    process.exit(1);
  });
}

main().catch((error: unknown) => {
  logger.fatal({ err: error }, 'failed to start');
  process.exit(1);
});
