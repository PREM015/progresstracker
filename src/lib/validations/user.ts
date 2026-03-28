// src/lib/validations/user.ts
// User profile validation schemas

import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long').trim().optional(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username may only contain letters, numbers, underscores, and hyphens')
    .toLowerCase()
    .optional(),
  bio: z.string().max(500, 'Bio too long').optional().nullable(),
  website: z.string().url('Invalid URL').optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  timezone: z.string().max(50).optional(),
  avatarUrl: z.string().url('Invalid URL').optional().nullable(),
  bannerUrl: z.string().url('Invalid URL').optional().nullable(),
  isPublic: z.boolean().optional(),
});

export const DeleteAccountSchema = z.object({
  password: z.string().min(1, 'Password confirmation is required'),
  confirmation: z.literal('DELETE', { errorMap: () => ({ message: 'Type DELETE to confirm' }) }),
  reason: z.string().max(1000).optional(),
});

export const AdminUpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().toLowerCase().optional(),
  role: z.enum(['user', 'pro', 'admin', 'super_admin']).optional(),
  isActive: z.boolean().optional(),
  emailVerified: z.coerce.date().optional().nullable(),
  username: z.string().min(3).max(30).toLowerCase().optional(),
});

export const AdminUserQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  role: z.enum(['user', 'pro', 'admin', 'super_admin']).optional(),
  isActive: z.coerce.boolean().optional(),
  emailVerified: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'email']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>;
export type AdminUpdateUserInput = z.infer<typeof AdminUpdateUserSchema>;
export type AdminUserQueryInput = z.infer<typeof AdminUserQuerySchema>;
