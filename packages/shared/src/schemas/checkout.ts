import { z } from 'zod';
import { addressSchema } from './address.ts';
import { gstinSchema, uuidSchema } from './common.ts';

export const checkoutQuoteSchema = z.object({
  shippingAddressId: uuidSchema.optional(),
  shippingAddress: addressSchema.optional(),
  couponCode: z.string().trim().max(40).optional().nullable(),
  gstin: gstinSchema.optional().nullable(),
}).refine((data) => data.shippingAddressId || data.shippingAddress, {
  message: 'A shipping address is required',
  path: ['shippingAddress'],
});
export type CheckoutQuoteInput = z.infer<typeof checkoutQuoteSchema>;

export const createOrderSchema = z.object({
  shippingAddressId: uuidSchema.optional(),
  shippingAddress: addressSchema.optional(),
  billingSameAsShipping: z.boolean().default(true),
  billingAddress: addressSchema.optional(),
  couponCode: z.string().trim().max(40).optional().nullable(),
  gstin: gstinSchema.optional().nullable(),
  /** Free-text delivery instruction, shown to the packing team. */
  notes: z.string().trim().max(500).optional().nullable(),
}).refine((data) => data.shippingAddressId || data.shippingAddress, {
  message: 'A shipping address is required',
  path: ['shippingAddress'],
}).refine((data) => data.billingSameAsShipping || data.billingAddress, {
  message: 'A billing address is required when it differs from shipping',
  path: ['billingAddress'],
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/**
 * What Razorpay Checkout hands back to the browser.
 * The signature is verified server-side; none of this is trusted on its own,
 * and the payment.captured webhook remains the source of truth.
 */
export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
