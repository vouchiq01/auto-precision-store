import type { CookieOptions, Response } from 'express';
import { AUTH } from '@aps/shared';
import { env, isProduction } from '../env.ts';

export const REFRESH_COOKIE = 'aps_rt';

/**
 * The refresh token lives in an httpOnly cookie so JavaScript — including any
 * script that sneaks onto the page — cannot read it. The access token is held
 * in memory by the client instead, and is short-lived enough that losing one
 * matters little.
 *
 * SameSite=None is required in production because the Vercel frontend and the
 * Render API are on different sites; Secure is mandatory alongside it.
 */
function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, { ...baseOptions(), maxAge: AUTH.refreshTokenTtlSeconds * 1000 });
}

export function clearRefreshCookie(res: Response): void {
  /* Clearing must use identical attributes to the cookie that was set, or the
     browser keeps the original and the user stays signed in after "log out". */
  res.clearCookie(REFRESH_COOKIE, baseOptions());
}
