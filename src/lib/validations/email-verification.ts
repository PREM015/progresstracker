// src/lib/validations/email-verification.ts
// Email verification validation schemas

import { z } from 'zod';

export const SendVerificationEmailSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  userId: z.string().cuid(),
});

export const VerifyEmailSchema = z.object({
  token: z.string().min(32, 'Invalid token'),
});

export const ResendVerificationEmailSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
});

export type SendVerificationEmailInput = z.infer<typeof SendVerificationEmailSchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
export type ResendVerificationEmailInput = z.infer<typeof ResendVerificationEmailSchema>;
