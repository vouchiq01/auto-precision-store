import rateLimit, { type Options } from 'express-rate-limit';
import type { Request } from 'express';
import { isProduction } from '../env.ts';

/**
 * In-memory rate limiting. Correct for a single Render instance; if the API is
 * ever scaled to more than one, this needs a shared store (Redis) or each
 * instance will independently allow the full quota.
 */
function make(options: Partial<Options>) {
  return rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Rate limiting the whole internet is pointless in local development.
    skip: () => !isProduction && process.env.FORCE_RATE_LIMIT !== '1',
    message: { type: 'rate_limited', title: 'Too many requests', status: 429, detail: 'Please slow down and try again shortly.' },
    ...options,
  });
}

/** Generous ceiling for ordinary browsing. */
export const generalLimiter = make({ windowMs: 60_000, limit: 300 });

/** OTP requests are the expensive, abusable endpoint — every send costs money. */
export const otpLimiter = make({
  windowMs: 15 * 60_000,
  limit: 10,
  keyGenerator: (req: Request) => `${req.ip}:${String((req.body as { phone?: string })?.phone ?? '')}`,
});

/** Credential stuffing protection on the admin login. */
export const loginLimiter = make({ windowMs: 15 * 60_000, limit: 15 });

/** Checkout and payment verification. */
export const checkoutLimiter = make({ windowMs: 60_000, limit: 30 });

/** Public write endpoints that a bot would love: reviews and enquiries. */
export const publicWriteLimiter = make({ windowMs: 60 * 60_000, limit: 20 });
