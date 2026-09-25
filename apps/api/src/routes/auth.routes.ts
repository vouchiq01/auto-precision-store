import { Router } from 'express';
import { adminLoginSchema, requestOtpSchema, verifyOtpSchema } from '@aps/shared';
import { asyncHandler } from '../lib/async-handler.ts';
import { clearRefreshCookie, REFRESH_COOKIE, setRefreshCookie } from '../lib/cookies.ts';
import { UnauthorizedError } from '../lib/errors.ts';
import { optionalAuth, requireAuth } from '../middleware/auth.ts';
import { loginLimiter, otpLimiter } from '../middleware/rate-limit.ts';
import { validateBody } from '../middleware/validate.ts';
import { adminLogin, attachGuestCart, refreshSession, requestOtp, revokeRefreshToken, verifyOtp } from '../services/auth.service.ts';
import { CART_COOKIE } from './cart.routes.ts';

export const authRouter: Router = Router();

authRouter.post('/otp/request', otpLimiter, validateBody(requestOtpSchema), asyncHandler(async (req, res) => {
  const { phone } = req.body as { phone: string };
  const result = await requestOtp(phone, req.ip);
  res.json({ sent: true, phone, ...(result.devCode ? { devCode: result.devCode } : {}) });
}));

authRouter.post('/otp/verify', otpLimiter, validateBody(verifyOtpSchema), asyncHandler(async (req, res) => {
  const body = req.body as { phone: string; code: string; fullName?: string };
  const session = await verifyOtp({ ...body, userAgent: req.get('user-agent') ?? undefined });

  // Adopt whatever the visitor had in their guest cart before signing in.
  await attachGuestCart(session.user.id, (req.cookies as Record<string, string>)?.[CART_COOKIE]);

  setRefreshCookie(res, session.refreshToken);
  res.json({ user: session.user, accessToken: session.accessToken, expiresIn: session.expiresIn });
}));

authRouter.post('/admin/login', loginLimiter, validateBody(adminLoginSchema), asyncHandler(async (req, res) => {
  const body = req.body as { email: string; password: string };
  const session = await adminLogin({ ...body, userAgent: req.get('user-agent') ?? undefined });
  setRefreshCookie(res, session.refreshToken);
  res.json({ user: session.user, accessToken: session.accessToken, expiresIn: session.expiresIn });
}));

authRouter.post('/refresh', asyncHandler(async (req, res) => {
  const token = (req.cookies as Record<string, string>)?.[REFRESH_COOKIE];
  if (!token) throw new UnauthorizedError('Your session has expired. Please sign in again.');

  const session = await refreshSession(token, req.get('user-agent') ?? undefined);
  setRefreshCookie(res, session.refreshToken);
  res.json({ user: session.user, accessToken: session.accessToken, expiresIn: session.expiresIn });
}));

authRouter.post('/logout', asyncHandler(async (req, res) => {
  const token = (req.cookies as Record<string, string>)?.[REFRESH_COOKIE];
  if (token) await revokeRefreshToken(token);
  clearRefreshCookie(res);
  res.json({ ok: true });
}));

authRouter.get('/me', optionalAuth, requireAuth, (req, res) => {
  res.json({ user: req.user });
});
