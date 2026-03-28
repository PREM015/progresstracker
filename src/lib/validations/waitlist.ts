// src/lib/validations/waitlist.ts
// Waitlist signup validation schemas

import { z } from 'zod';

export const JoinWaitlistSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  name: z.string().max(100).trim().optional(),
  referralCode: z.string().max(50).optional(),
  source: z.string().max(100).optional(),
  metadata: z.object({
    useCase: z.string().max(500).optional(),
    role: z.string().max(100).optional(),
    company: z.string().max(200).optional(),
    heardFrom: z.string().max(100).optional(),
  }).optional(),
});

export const ApproveWaitlistSchema = z.object({
  waitlistId: z.string().cuid('Invalid waitlist ID'),
  sendEmail: z.boolean().default(true),
});

export const BulkApproveWaitlistSchema = z.object({
  waitlistIds: z.array(z.string().cuid()).min(1).max(100),
  sendEmail: z.boolean().default(true),
});

export const WaitlistQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'registered']).optional(),
  search: z.string().max(200).optional(),
  source: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type JoinWaitlistInput = z.infer<typeof JoinWaitlistSchema>;
export type ApproveWaitlistInput = z.infer<typeof ApproveWaitlistSchema>;
export type BulkApproveWaitlistInput = z.infer<typeof BulkApproveWaitlistSchema>;
