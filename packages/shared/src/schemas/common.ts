import { z } from 'zod';
import { INDIAN_STATES } from '../constants.ts';
import { isValidGstin } from '../domain/gst.ts';
import { isValidPincode } from '../domain/shipping.ts';

/**
 * Indian mobile numbers, normalised to E.164 (+91XXXXXXXXXX).
 * Accepts the shapes people actually type — 9876543210, 09876543210,
 * +91 98765 43210 — and rejects the ones that can't be a mobile.
 */
export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s\-()]/g, ''))
  .transform((value) => {
    /* Strip the country code only when it really IS a country code.
       A blanket /^\+?91/ strip corrupts perfectly valid mobiles that simply
       begin with 91 — 9123456780 would become 23456780 and be rejected at
       sign-up. Length is what disambiguates: 12 digits means 91 + 10. */
    let digits = value.startsWith('+') ? value.slice(1) : value;
    if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
    else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
    return digits;
  })
  .refine((digits) => /^[6-9][0-9]{9}$/.test(digits), {
    message: 'Enter a valid 10-digit Indian mobile number',
  })
  .transform((digits) => `+91${digits}`);

export const otpSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{6}$/, 'Enter the 6-digit code');

export const pincodeSchema = z
  .string()
  .trim()
  .refine(isValidPincode, 'Enter a valid 6-digit pincode');

export const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(isValidGstin, 'Enter a valid 15-character GSTIN');

export const stateSchema = z.enum(INDIAN_STATES);

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address');

/**
 * Images and video live in one of two places, and both are legitimate:
 *   - Supabase Storage, as an absolute https:// URL
 *   - the Next.js public/ folder, as a root-relative path like /products/x/01.svg
 *
 * Requiring a fully-qualified URL rejected every seeded product and made the
 * catalogue unsaveable from the admin panel.
 */
export const mediaUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) => /^https?:\/\//.test(value) || value.startsWith('/'),
    'Enter a full https:// URL, or a path starting with /',
  );

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only');

export const uuidSchema = z.string().uuid();

/** Money crossing the wire is always an integer paise count. */
export const paiseSchema = z.number().int().nonnegative();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(24),
});

export type Pagination = z.infer<typeof paginationSchema>;
