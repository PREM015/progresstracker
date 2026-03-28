// src/lib/validations/platform.ts
// Platform validation schemas

import { z } from 'zod';
import { PlatformCategory } from '@prisma/client';

export const CreatePlatformSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long').trim(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(2000).optional().nullable(),
  category: z.nativeEnum(PlatformCategory),
  baseUrl: z.string().url('Invalid URL').optional().nullable(),
  apiUrl: z.string().url('Invalid URL').optional().nullable(),
  logoUrl: z.string().url('Invalid URL').optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  isActive: z.boolean().default(true),
  requiresAuth: z.boolean().default(false),
  supportsScraping: z.boolean().default(false),
  supportsApi: z.boolean().default(false),
});

export const UpdatePlatformSchema = CreatePlatformSchema.partial();

export const PlatformQuerySchema = z.object({
  category: z.nativeEnum(PlatformCategory).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePlatformInput = z.infer<typeof CreatePlatformSchema>;
export type UpdatePlatformInput = z.infer<typeof UpdatePlatformSchema>;
export type PlatformQueryInput = z.infer<typeof PlatformQuerySchema>;
