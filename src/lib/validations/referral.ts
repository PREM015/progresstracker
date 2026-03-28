// src/lib/validations/referral.ts
// Referral reward validation schemas

import { z } from 'zod';

export const CreateReferralSchema = z.object({
  referrerUserId: z.string().cuid('Invalid user ID'),
  referredUserId: z.string().cuid('Invalid referred user ID'),
  referralCode: z.string().min(1).max(50),
});

export const RedeemReferralSchema = z.object({
  referralCode: z.string().min(1, 'Referral code is required').max(50).trim().toUpperCase(),
});

export const ReferralQuerySchema = z.object({
  userId: z.string().cuid().optional(),
  status: z.enum(['pending', 'completed', 'paid', 'expired', 'invalid']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateReferralInput = z.infer<typeof CreateReferralSchema>;
export type RedeemReferralInput = z.infer<typeof RedeemReferralSchema>;
