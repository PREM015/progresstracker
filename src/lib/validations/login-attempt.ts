// src/lib/validations/login-attempt.ts
// Login attempt validation schemas

import { z } from 'zod';

export const LoginAttemptQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['success', 'failed', 'blocked', 'mfa_required', 'locked']).optional(),
  email: z.string().email().optional(),
  ipAddress: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const BlockIpSchema = z.object({
  ipAddress: z.string().ip({ version: 'v4' }).or(z.string().ip({ version: 'v6' })),
  reason: z.string().max(500).optional(),
  durationHours: z.number().int().positive().max(8760).optional(), // Max 1 year
});

export type LoginAttemptQueryInput = z.infer<typeof LoginAttemptQuerySchema>;
export type BlockIpInput = z.infer<typeof BlockIpSchema>;
