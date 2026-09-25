import { z } from 'zod';
import { phoneSchema, pincodeSchema, stateSchema } from './common.ts';

export const addressSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the recipient name').max(80),
  phone: phoneSchema,
  line1: z.string().trim().min(4, 'Enter the street address').max(160),
  line2: z.string().trim().max(160).optional().nullable(),
  landmark: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().min(2, 'Enter the city').max(80),
  state: stateSchema,
  pincode: pincodeSchema,
  type: z.enum(['home', 'work', 'other']).default('home'),
  isDefault: z.boolean().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;

export interface Address extends AddressInput {
  id: string;
  userId: string;
  createdAt: string;
}
