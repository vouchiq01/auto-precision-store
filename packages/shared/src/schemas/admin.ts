import { z } from 'zod';
import { BANNER_PLACEMENTS, ENQUIRY_STATUSES, ORDER_STATUSES, REVIEW_STATUSES } from '../constants.ts';
import { mediaUrlSchema, paiseSchema, slugSchema, uuidSchema } from './common.ts';

export const bannerInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(240).optional().nullable(),
  eyebrow: z.string().trim().max(40).optional().nullable(),
  imageDesktop: mediaUrlSchema,
  imageMobile: mediaUrlSchema.optional().nullable(),
  /** Optional looping background video for the hero placement. */
  videoUrl: mediaUrlSchema.optional().nullable(),
  ctaLabel: z.string().trim().max(40).optional().nullable(),
  ctaUrl: z.string().trim().max(400).optional().nullable(),
  placement: z.enum(BANNER_PLACEMENTS).default('hero'),
  sortOrder: z.number().int().default(0),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  isActive: z.boolean().default(true),
}).refine((b) => !b.startsAt || !b.endsAt || b.endsAt > b.startsAt, {
  message: 'End date must be after the start date',
  path: ['endsAt'],
});
export type BannerInput = z.infer<typeof bannerInputSchema>;

export const couponInputSchema = z.object({
  code: z.string().trim().toUpperCase().min(3).max(40).regex(/^[A-Z0-9_-]+$/, 'Letters, numbers, hyphen and underscore only'),
  description: z.string().trim().max(200).optional().nullable(),
  type: z.enum(['percent', 'flat', 'free_shipping']),
  /** Basis points for percent (2000 = 20%), paise for flat, 0 for free_shipping. */
  value: z.number().int().min(0).default(0),
  minOrderValue: paiseSchema.optional().nullable(),
  maxDiscount: paiseSchema.optional().nullable(),
  usageLimitTotal: z.number().int().min(1).optional().nullable(),
  usageLimitPerUser: z.number().int().min(1).optional().nullable(),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  scope: z.enum(['all', 'category', 'product']).default('all'),
  targetIds: z.array(uuidSchema).default([]),
  isActive: z.boolean().default(true),
})
  .refine((c) => c.type !== 'percent' || (c.value > 0 && c.value <= 10_000), {
    message: 'Percentage must be between 0 and 100', path: ['value'],
  })
  .refine((c) => c.type !== 'flat' || c.value > 0, {
    message: 'Enter the discount amount', path: ['value'],
  })
  .refine((c) => c.scope === 'all' || c.targetIds.length > 0, {
    message: 'Select at least one target', path: ['targetIds'],
  })
  .refine((c) => !c.startsAt || !c.endsAt || c.endsAt > c.startsAt, {
    message: 'End date must be after the start date', path: ['endsAt'],
  });
export type CouponInput = z.infer<typeof couponInputSchema>;

export const categoryInputSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(600).optional().nullable(),
  imageUrl: mediaUrlSchema.optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500).optional().nullable(),
  trackingNumber: z.string().trim().max(80).optional().nullable(),
  trackingUrl: z.string().url().optional().nullable(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const moderateReviewSchema = z.object({
  status: z.enum(REVIEW_STATUSES),
  moderationNote: z.string().trim().max(300).optional().nullable(),
});

export const updateEnquirySchema = z.object({
  status: z.enum(ENQUIRY_STATUSES),
  internalNote: z.string().trim().max(1000).optional().nullable(),
});

export const cmsPageInputSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(2).max(120),
  body: z.string().max(60_000),
  metaTitle: z.string().trim().max(70).optional().nullable(),
  metaDescription: z.string().trim().max(170).optional().nullable(),
  isPublished: z.boolean().default(false),
});
export type CmsPageInput = z.infer<typeof cmsPageInputSchema>;

export const updateStockSchema = z.object({
  stockQty: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).optional(),
});
