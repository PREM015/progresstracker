// src/lib/validations/verification-token.ts
// Verification token validation schemas

import { z } from 'zod';

export const CreateVerificationTokenSchema = z.object({
  identifier: z.string().email('Identifier must be a valid email'),
  type: z.enum(['email_verification', 'magic_link', 'phone_verification', 'delete_account']),
  userId: z.string().cuid().optional(),
  expiresInHours: z.number().int().positive().max(168).default(24), // Max 7 days
});

export const UseVerificationTokenSchema = z.object({
  identifier: z.string().min(1),
  token: z.string().min(32, 'Invalid token'),
});

export type CreateVerificationTokenInput = z.infer<typeof CreateVerificationTokenSchema>;
export type UseVerificationTokenInput = z.infer<typeof UseVerificationTokenSchema>;
