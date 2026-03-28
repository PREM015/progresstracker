// src/lib/validations/email-change.ts
// Email change validation schemas

import { z } from 'zod';

export const RequestEmailChangeSchema = z.object({
  newEmail: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required for confirmation'),
});

export const ConfirmEmailChangeSchema = z.object({
  token: z.string().min(32, 'Invalid token'),
});

export const CancelEmailChangeSchema = z.object({
  requestId: z.string().cuid(),
});

export type RequestEmailChangeInput = z.infer<typeof RequestEmailChangeSchema>;
export type ConfirmEmailChangeInput = z.infer<typeof ConfirmEmailChangeSchema>;
export type CancelEmailChangeInput = z.infer<typeof CancelEmailChangeSchema>;
