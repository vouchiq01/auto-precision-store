import { z } from 'zod';
import { emailSchema, otpSchema, phoneSchema } from './common.ts';

export const requestOtpSchema = z.object({ phone: phoneSchema });
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: otpSchema,
  /** Collected on first sign-up so we can address the customer by name. */
  fullName: z.string().trim().min(2).max(80).optional(),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: emailSchema.optional().nullable(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export interface SessionUser {
  id: string;
  phone: string | null;
  email: string | null;
  fullName: string | null;
  role: 'customer' | 'admin' | 'superadmin';
}
