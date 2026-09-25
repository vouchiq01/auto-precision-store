import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { env } from '../env.ts';
import type { UserRole } from '@aps/shared';

/**
 * Minimal HS256 JWT, implemented directly rather than pulling in jsonwebtoken.
 *
 * We issue and verify our own tokens for one audience with one algorithm, so the
 * library's flexibility is all attack surface we do not want — notably the
 * `alg: none` and algorithm-confusion classes of bug. The algorithm here is
 * pinned in code and cannot be negotiated by the token itself.
 */

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  /** Issued-at and expiry, seconds since epoch. */
  iat: number;
  exp: number;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(data: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(data).digest('base64url');
}

export function signAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>, ttlSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const body: AccessTokenPayload = { ...payload, iat: now, exp: now + ttlSeconds };

  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify(body));
  return `${header}.${claims}.${sign(`${header}.${claims}`)}`;
}

/**
 * Returns the payload, or null for any failure at all — bad shape, bad
 * signature, expired. Callers cannot accidentally treat "expired" as "valid"
 * because there is no partial success to mishandle.
 */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, claims, signature] = parts as [string, string, string];

    const expected = sign(`${header}.${claims}`);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const decodedHeader = JSON.parse(Buffer.from(header, 'base64url').toString()) as { alg?: string };
    // Pin the algorithm: never trust the token's own claim about how to verify it.
    if (decodedHeader.alg !== 'HS256') return null;

    const payload = JSON.parse(Buffer.from(claims, 'base64url').toString()) as AccessTokenPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof payload.sub !== 'string' || !payload.sub) return null;

    return payload;
  } catch {
    return null;
  }
}

/** Refresh tokens are opaque random strings; only their hash is stored. */
export function generateRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(48).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** OTP codes are hashed with the phone number as a salt, so identical codes for
 *  different numbers do not produce identical hashes. */
export function hashOtp(phone: string, code: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(`${phone}:${code}`).digest('hex');
}

/** Uniform across the full range — randomInt rejects internally rather than
 *  taking a modulo, so no code is more likely than any other. */
export function generateOtp(length = 6): string {
  const value = randomInt(0, 10 ** length);
  return String(value).padStart(length, '0');
}
