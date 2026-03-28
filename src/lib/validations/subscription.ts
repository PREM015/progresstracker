// src/lib/validations/subscription.ts
// Subscription validation schemas

import { z } from 'zod';

export const CreateSubscriptionSchema = z.object({
  plan: z.enum(['free', 'basic', 'pro', 'enterprise']),
  interval: z.enum(['month', 'year']).default('month'),
  paymentMethodId: z.string().optional(),
  couponCode: z.string().max(50).optional(),
  trialDays: z.number().int().min(0).max(90).optional(),
});

export const UpdateSubscriptionSchema = z.object({
  plan: z.enum(['free', 'basic', 'pro', 'enterprise']).optional(),
  interval: z.enum(['month', 'year']).optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

export const CancelSubscriptionSchema = z.object({
  immediately: z.boolean().default(false),
  reason: z.enum(['too_expensive', 'missing_features', 'switching_product', 'not_using', 'other']).optional(),
  feedback: z.string().max(2000).optional(),
});

export const ApplyCouponSchema = z.object({
  couponCode: z.string().min(1, 'Coupon code is required').max(50).trim().toUpperCase(),
});

export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionSchema>;
export type CancelSubscriptionInput = z.infer<typeof CancelSubscriptionSchema>;
export type ApplyCouponInput = z.infer<typeof ApplyCouponSchema>;
