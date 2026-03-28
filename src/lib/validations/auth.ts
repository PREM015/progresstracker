// src/lib/validations/auth.ts
// Authentication schemas

import { z } from 'zod';

const emailSchema = z.string().email('Invalid email address').toLowerCase().trim();
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long');

export const LoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: z.boolean().default(false),
});

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long').trim(),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine((v) => v === true, 'You must accept the terms'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const MagicLinkSchema = z.object({
  email: emailSchema,
});

export const OAuthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
  provider: z.enum(['github', 'google', 'discord']),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type MagicLinkInput = z.infer<typeof MagicLinkSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
