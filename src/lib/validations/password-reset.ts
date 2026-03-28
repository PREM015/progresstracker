// src/lib/validations/password-reset.ts
// Password reset validation schemas

import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long');

export const RequestPasswordResetSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
});

export const VerifyResetTokenSchema = z.object({
  token: z.string().min(32, 'Invalid token'),
});

export const CompletePasswordResetSchema = z
  .object({
    token: z.string().min(32, 'Invalid token'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const AdminResetPasswordSchema = z.object({
  userId: z.string().cuid(),
  newPassword: passwordSchema,
  sendEmail: z.boolean().default(true),
});

export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetSchema>;
export type CompletePasswordResetInput = z.infer<typeof CompletePasswordResetSchema>;
export type AdminResetPasswordInput = z.infer<typeof AdminResetPasswordSchema>;
