// src/lib/validations/coupon-redemption.ts
// Coupon redemption validation schemas

import { z } from 'zod';

export const RedeemCouponSchema = z.object({
  couponId: z.string().cuid('Invalid coupon ID'),
  subscriptionId: z.string().cuid('Invalid subscription ID').optional(),
});

export const CouponRedemptionQuerySchema = z.object({
  couponId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type RedeemCouponInput = z.infer<typeof RedeemCouponSchema>;
