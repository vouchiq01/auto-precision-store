import { z } from 'zod';
import { CART } from '../constants.ts';
import { uuidSchema } from './common.ts';

export const addToCartSchema = z.object({
  variantId: uuidSchema,
  quantity: z.number().int().min(1).max(CART.maxQuantityPerLine).default(1),
});
export type AddToCartInput = z.infer<typeof addToCartSchema>;

export const updateCartItemSchema = z.object({
  /** Zero removes the line, which is what the stepper's minus button sends at qty 1. */
  quantity: z.number().int().min(0).max(CART.maxQuantityPerLine),
});
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export const applyCouponSchema = z.object({ code: z.string().trim().min(1).max(40) });
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
