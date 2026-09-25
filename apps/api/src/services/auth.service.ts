import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { getDb, otpCodes, refreshTokens, users, carts } from '@aps/db';
import { verifyPassword } from '@aps/db';
import { AUTH, type AuthUser } from '@aps/shared';
import { generateOtp, generateRefreshToken, hashOtp, hashToken, signAccessToken } from '../lib/jwt.ts';
import { ForbiddenError, RateLimitError, UnauthorizedError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';
import { acceptsDevOtp, getSmsProvider } from './sms/index.ts';

export interface IssuedSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function toAuthUser(row: typeof users.$inferSelect): AuthUser {
  return { id: row.id, phone: row.phone, email: row.email, fullName: row.fullName, role: row.role };
}

/**
 * Issue an OTP for a phone number.
 *
 * Rate limited per phone per hour. The response is deliberately identical
 * whether or not an account exists — an attacker must not be able to enumerate
 * which numbers are registered by watching response times or messages.
 */
export async function requestOtp(phone: string, ip: string | undefined): Promise<{ sent: true; devCode?: string }> {
  const db = getDb();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [{ count } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), gt(otpCodes.createdAt, oneHourAgo)));

  if (count >= AUTH.otpMaxRequestsPerHour) {
    throw new RateLimitError(600, 'Too many codes requested for this number. Try again in about ten minutes.');
  }

  const code = generateOtp(AUTH.otpLength);
  const expiresAt = new Date(Date.now() + AUTH.otpTtlSeconds * 1000);

  // Supersede any outstanding code, so only the newest one can be used.
  await db.update(otpCodes)
    .set({ consumedAt: new Date() })
    .where(and(eq(otpCodes.phone, phone), isNull(otpCodes.consumedAt)));

  await db.insert(otpCodes).values({
    phone, codeHash: hashOtp(phone, code), expiresAt, requestIp: ip ?? null,
  });

  await getSmsProvider().sendOtp(phone, code);

  // Returned only in mock mode so the dev UI can show it. Never in production.
  return acceptsDevOtp() ? { sent: true, devCode: code } : { sent: true };
}

/**
 * Verify an OTP and issue a session, creating the account on first sign-in.
 *
 * Attempts are counted on the OTP row: five wrong guesses burn the code, so a
 * 6-digit space cannot be brute-forced within its 5-minute life.
 */
export async function verifyOtp(params: {
  phone: string; code: string; fullName?: string; userAgent?: string;
}): Promise<IssuedSession> {
  const db = getDb();
  const { phone, code, fullName, userAgent } = params;

  const [record] = await db.select().from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), isNull(otpCodes.consumedAt)))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  const isDevCode = acceptsDevOtp() && code === AUTH.devOtpCode;

  if (!record && !isDevCode) {
    throw new UnauthorizedError('That code has expired. Please request a new one.');
  }

  if (record && !isDevCode) {
    if (record.expiresAt < new Date()) {
      await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, record.id));
      throw new UnauthorizedError('That code has expired. Please request a new one.');
    }

    if (record.attempts >= AUTH.otpMaxAttempts) {
      await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, record.id));
      throw new RateLimitError(300, 'Too many incorrect attempts. Please request a new code.');
    }

    if (record.codeHash !== hashOtp(phone, code)) {
      await db.update(otpCodes)
        .set({ attempts: sql`${otpCodes.attempts} + 1` })
        .where(eq(otpCodes.id, record.id));
      const remaining = AUTH.otpMaxAttempts - record.attempts - 1;
      throw new UnauthorizedError(
        remaining > 0 ? `That code is not right. ${remaining} attempt${remaining === 1 ? '' : 's'} left.` : 'That code is not right.',
      );
    }

    await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, record.id));
  }

  let [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

  if (!user) {
    [user] = await db.insert(users).values({
      phone, fullName: fullName ?? null, role: 'customer', lastLoginAt: new Date(),
    }).returning();
    logger.info({ phone }, 'new customer registered');
  } else {
    if (user.isBlocked) throw new ForbiddenError('This account has been suspended. Please contact support.');
    await db.update(users)
      .set({ lastLoginAt: new Date(), ...(fullName && !user.fullName ? { fullName } : {}) })
      .where(eq(users.id, user.id));
  }

  if (!user) throw new UnauthorizedError('Could not sign you in.');

  return issueSession(toAuthUser(user), userAgent);
}

/** Admin sign-in. Email and password, never OTP. */
export async function adminLogin(params: {
  email: string; password: string; userAgent?: string;
}): Promise<IssuedSession> {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, params.email)).limit(1);

  /* Verify against a dummy hash when the account does not exist, so a missing
     account and a wrong password take the same time and leak nothing. */
  const storedHash = user?.passwordHash ?? 'scrypt$65536$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA';
  const passwordOk = await verifyPassword(params.password, storedHash);

  if (!user || !user.passwordHash || !passwordOk) {
    throw new UnauthorizedError('Those credentials are not right.');
  }
  if (user.isBlocked) throw new ForbiddenError('This account has been suspended.');
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    throw new ForbiddenError('This account does not have admin access.');
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  return issueSession(toAuthUser(user), params.userAgent);
}

async function issueSession(user: AuthUser, userAgent?: string): Promise<IssuedSession> {
  const db = getDb();
  const { token, hash } = generateRefreshToken();

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hash,
    expiresAt: new Date(Date.now() + AUTH.refreshTokenTtlSeconds * 1000),
    userAgent: userAgent?.slice(0, 300) ?? null,
  });

  return {
    user,
    accessToken: signAccessToken({ sub: user.id, role: user.role }, AUTH.accessTokenTtlSeconds),
    refreshToken: token,
    expiresIn: AUTH.accessTokenTtlSeconds,
  };
}

/**
 * Rotate a refresh token.
 *
 * Every refresh issues a new token and revokes the old one. If a revoked token
 * is presented again, the whole family is nuked: either the user's token was
 * stolen and replayed, or ours was — and in both cases the safe move is to make
 * everyone sign in again.
 */
export async function refreshSession(presentedToken: string, userAgent?: string): Promise<IssuedSession> {
  const db = getDb();
  const hash = hashToken(presentedToken);

  const [existing] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, hash)).limit(1);
  if (!existing) throw new UnauthorizedError('Your session has expired. Please sign in again.');

  if (existing.revokedAt) {
    logger.warn({ userId: existing.userId }, 'revoked refresh token replayed — revoking all sessions for this user');
    await db.update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, existing.userId), isNull(refreshTokens.revokedAt)));
    throw new UnauthorizedError('Your session has expired. Please sign in again.');
  }

  if (existing.expiresAt < new Date()) {
    throw new UnauthorizedError('Your session has expired. Please sign in again.');
  }

  const [user] = await db.select().from(users).where(eq(users.id, existing.userId)).limit(1);
  if (!user) throw new UnauthorizedError('Your session has expired. Please sign in again.');
  if (user.isBlocked) throw new ForbiddenError('This account has been suspended.');

  const next = generateRefreshToken();
  await db.update(refreshTokens)
    .set({ revokedAt: new Date(), replacedByHash: next.hash })
    .where(eq(refreshTokens.id, existing.id));

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: next.hash,
    expiresAt: new Date(Date.now() + AUTH.refreshTokenTtlSeconds * 1000),
    userAgent: userAgent?.slice(0, 300) ?? null,
  });

  return {
    user: toAuthUser(user),
    accessToken: signAccessToken({ sub: user.id, role: user.role }, AUTH.accessTokenTtlSeconds),
    refreshToken: next.token,
    expiresIn: AUTH.accessTokenTtlSeconds,
  };
}

export async function revokeRefreshToken(presentedToken: string): Promise<void> {
  const db = getDb();
  await db.update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.tokenHash, hashToken(presentedToken)), isNull(refreshTokens.revokedAt)));
}

/** Housekeeping: drop expired OTPs and refresh tokens. Called on a timer. */
export async function purgeExpiredCredentials(): Promise<{ otps: number; tokens: number }> {
  const db = getDb();
  const now = new Date();
  const otpResult = await db.delete(otpCodes).where(sql`${otpCodes.expiresAt} < ${now}`).returning({ id: otpCodes.id });
  const tokenResult = await db.delete(refreshTokens).where(sql`${refreshTokens.expiresAt} < ${now}`).returning({ id: refreshTokens.id });
  return { otps: otpResult.length, tokens: tokenResult.length };
}

/** On sign-in, adopt whatever the visitor had in their guest cart. */
export async function attachGuestCart(userId: string, sessionToken: string | undefined): Promise<void> {
  if (!sessionToken) return;
  const db = getDb();
  const [guestCart] = await db.select().from(carts).where(eq(carts.sessionToken, sessionToken)).limit(1);
  if (!guestCart || guestCart.userId) return;

  const [existing] = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
  if (existing) {
    /* The signed-in cart wins on conflict; merging line-by-line across two carts
       is handled in cart.service so this stays a single concern. */
    const { mergeCarts } = await import('./cart.service.ts');
    await mergeCarts(guestCart.id, existing.id);
    return;
  }

  await db.update(carts).set({ userId, sessionToken: null }).where(eq(carts.id, guestCart.id));
}
