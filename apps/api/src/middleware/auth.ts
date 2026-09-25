import { eq } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import { getDb, users } from '@aps/db';
import type { AuthUser } from '@aps/shared';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.ts';
import { verifyAccessToken } from '../lib/jwt.ts';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function bearerToken(req: Request): string | null {
  const header = req.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Attach the user when a valid token is present, and carry on regardless.
 * Used by routes that behave differently for signed-in visitors — the cart,
 * for instance — but must still work for guests.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = bearerToken(req);
    if (!token) return next();

    const payload = verifyAccessToken(token);
    if (!payload) return next();

    const db = getDb();
    const [row] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    if (row && !row.isBlocked) {
      req.user = { id: row.id, phone: row.phone, email: row.email, fullName: row.fullName, role: row.role };
    }
    next();
  } catch (error) {
    next(error);
  }
}

/** Reject anything without a valid session. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(new UnauthorizedError());
  next();
}

/**
 * Admin gate.
 *
 * The role is re-read from the database by optionalAuth on every request rather
 * than trusted from the token, so demoting or blocking an admin takes effect
 * immediately instead of when their 15-minute access token happens to expire.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(new UnauthorizedError());
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return next(new ForbiddenError('Admin access is required.'));
  }
  next();
}

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(new UnauthorizedError());
  if (req.user.role !== 'superadmin') {
    return next(new ForbiddenError('This action requires a super-admin account.'));
  }
  next();
}
