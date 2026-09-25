import { z } from 'zod';
import { FEATURE_LAYOUTS, PRODUCT_STATUSES } from '../constants.ts';
import { mediaUrlSchema, paiseSchema, slugSchema, uuidSchema } from './common.ts';

export const productVariantInputSchema = z.object({
  id: uuidSchema.optional(),
  sku: z.string().trim().min(1).max(60),
  optionName: z.string().trim().min(1).max(40).default('Variant'),
  optionValue: z.string().trim().min(1).max(60),
  /** Added to the product's base price; may be negative for a cheaper option. */
  priceDelta: z.number().int().default(0),
  stockQty: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(2),
  weightG: z.number().int().min(0).default(0),
  hexColour: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const productSpecInputSchema = z.object({
  id: uuidSchema.optional(),
  group: z.string().trim().min(1).max(60).default('General'),
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(200),
  sortOrder: z.number().int().default(0),
});

/** Drives the scroll-story blocks on the product page, straight from the database. */
export const productFeatureInputSchema = z.object({
  id: uuidSchema.optional(),
  eyebrow: z.string().trim().max(40).optional().nullable(),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().max(1200).optional().nullable(),
  mediaUrl: mediaUrlSchema.optional().nullable(),
  mediaAlt: z.string().trim().max(160).optional().nullable(),
  layout: z.enum(FEATURE_LAYOUTS).default('media_right'),
  /** Big numbers for the stat_row layout, e.g. [{value:"120kg", label:"Load capacity"}] */
  stats: z.array(z.object({ value: z.string().max(24), label: z.string().max(60) })).max(4).default([]),
  sortOrder: z.number().int().default(0),
});

export const productFaqInputSchema = z.object({
  id: uuidSchema.optional(),
  question: z.string().trim().min(4).max(200),
  answer: z.string().trim().min(4).max(2000),
  sortOrder: z.number().int().default(0),
});

export const productImageInputSchema = z.object({
  id: uuidSchema.optional(),
  url: mediaUrlSchema,
  alt: z.string().trim().max(160).default(''),
  variantId: uuidSchema.optional().nullable(),
  sortOrder: z.number().int().default(0),
  isPrimary: z.boolean().default(false),
});

export const productInputSchema = z.object({
  slug: slugSchema,
  sku: z.string().trim().min(1).max(60),
  name: z.string().trim().min(2).max(160),
  tagline: z.string().trim().max(200).optional().nullable(),
  /** Short paragraph for cards and meta descriptions. */
  summary: z.string().trim().max(500).optional().nullable(),
  description: z.string().trim().max(20_000).optional().nullable(),
  categoryId: uuidSchema,
  brand: z.string().trim().max(60).default('Auto Precision'),
  basePrice: paiseSchema,
  compareAtPrice: paiseSchema.optional().nullable(),
  status: z.enum(PRODUCT_STATUSES).default('draft'),
  hsnCode: z.string().trim().max(10).default('9403'),
  taxRateBps: z.number().int().min(0).max(10_000).default(1800),
  weightG: z.number().int().min(0).default(0),
  lengthMm: z.number().int().min(0).optional().nullable(),
  widthMm: z.number().int().min(0).optional().nullable(),
  heightMinMm: z.number().int().min(0).optional().nullable(),
  heightMaxMm: z.number().int().min(0).optional().nullable(),
  loadCapacityKg: z.number().int().min(0).optional().nullable(),
  warrantyMonths: z.number().int().min(0).default(12),
  badges: z.array(z.string().max(24)).max(3).default([]),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  metaTitle: z.string().trim().max(70).optional().nullable(),
  metaDescription: z.string().trim().max(170).optional().nullable(),
  variants: z.array(productVariantInputSchema).default([]),
  images: z.array(productImageInputSchema).default([]),
  specs: z.array(productSpecInputSchema).default([]),
  features: z.array(productFeatureInputSchema).default([]),
  faqs: z.array(productFaqInputSchema).default([]),
}).refine((p) => !p.compareAtPrice || p.compareAtPrice > p.basePrice, {
  message: 'Compare-at price must be higher than the selling price',
  path: ['compareAtPrice'],
});

export type ProductInput = z.infer<typeof productInputSchema>;

export const productFilterSchema = z.object({
  category: z.string().optional(),
  minPrice: z.coerce.number().int().optional(),
  maxPrice: z.coerce.number().int().optional(),
  brand: z.string().optional(),
  inStock: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  search: z.string().trim().max(120).optional(),
  sort: z.enum(['featured', 'price_asc', 'price_desc', 'newest', 'name']).default('featured'),
});
export type ProductFilter = z.infer<typeof productFilterSchema>;
