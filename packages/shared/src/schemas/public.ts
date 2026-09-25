import { z } from 'zod';
import { emailSchema, phoneSchema, pincodeSchema, uuidSchema } from './common.ts';

export const reviewInputSchema = z.object({
  productId: uuidSchema,
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(10, 'Tell us a little more').max(2000),
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export const enquiryInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: phoneSchema,
  email: emailSchema.optional().nullable(),
  productId: uuidSchema.optional().nullable(),
  /** Bulk/dealer enquiries are the main reason this exists. */
  quantity: z.number().int().min(1).max(999).optional().nullable(),
  message: z.string().trim().min(5).max(2000),
  businessName: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
});
export type EnquiryInput = z.infer<typeof enquiryInputSchema>;

export const pincodeCheckSchema = z.object({
  pincode: pincodeSchema,
  variantId: uuidSchema.optional(),
});

export const stockNotifySchema = z.object({
  variantId: uuidSchema,
  phone: phoneSchema.optional().nullable(),
  email: emailSchema.optional().nullable(),
}).refine((d) => d.phone || d.email, {
  message: 'Give us a phone number or an email so we can tell you',
  path: ['phone'],
});
