// src/lib/validations/coupon.ts
// Coupon validation schemas

import { z } from 'zod';

export const CreateCouponSchema = z.object({
  code: z.string().min(3, 'Code must be at least 3 characters').max(50).toUpperCase().trim(),
  description: z.string().max(500).optional(),
  type: z.enum(['percent', 'fixed']),
  value: z.number().positive('Value must be positive').max(100), // % or amount
  currency: z.string().length(3).toUpperCase().optional(),
  maxRedemptions: z.number().int().positive().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  minimumAmount: z.number().int().nonnegative().optional(),
  appliesTo: z.enum(['all', 'basic', 'pro', 'enterprise']).default('all'),
  isActive: z.boolean().default(true),
});

export const UpdateCouponSchema = CreateCouponSchema.partial();

export const ValidateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required').max(50).toUpperCase().trim(),
  plan: z.enum(['basic', 'pro', 'enterprise']).optional(),
  amount: z.number().int().positive().optional(),
});

export type CreateCouponInput = z.infer<typeof CreateCouponSchema>;
export type UpdateCouponInput = z.infer<typeof UpdateCouponSchema>;
export type ValidateCouponInput = z.infer<typeof ValidateCouponSchema>;
