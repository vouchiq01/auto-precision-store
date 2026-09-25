import { auditLog, getDb } from '@aps/db';
import { logger } from '../lib/logger.ts';

/**
 * Every mutating admin action is recorded.
 *
 * Deliberately never throws: an audit failure must not roll back the business
 * operation that succeeded. A missing audit row is a problem; a failed refund
 * because logging hiccuped is a bigger one.
 */
export async function audit(params: {
  actorId: string | undefined;
  action: string;
  entity: string;
  entityId?: string | null;
  diff?: Record<string, unknown> | null;
  ip?: string | undefined;
}): Promise<void> {
  try {
    const db = getDb();
    await db.insert(auditLog).values({
      actorId: params.actorId ?? null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      diff: params.diff ?? null,
      ip: params.ip ?? null,
    });
  } catch (error) {
    logger.error({ err: error, action: params.action, entity: params.entity }, 'failed to write audit log');
  }
}
