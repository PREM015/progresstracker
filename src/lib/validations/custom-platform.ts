// src/lib/validations/custom-platform.ts
// Custom platform validation schemas

import { z } from 'zod';
import { PlatformCategory } from '@prisma/client';

export const CreateCustomPlatformSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  description: z.string().max(1000).optional().nullable(),
  category: z.nativeEnum(PlatformCategory),
  baseUrl: z.string().url('Invalid URL').optional().nullable(),
  logoUrl: z.string().url('Invalid URL').optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional().nullable(),
  trackingFields: z.array(z.object({
    name: z.string().min(1).max(50),
    label: z.string().min(1).max(100),
    type: z.enum(['number', 'text', 'boolean', 'date']),
    required: z.boolean().default(false),
    defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  })).max(10).optional(),
  isPublic: z.boolean().default(false),
});

export const UpdateCustomPlatformSchema = CreateCustomPlatformSchema.partial();

export type CreateCustomPlatformInput = z.infer<typeof CreateCustomPlatformSchema>;
export type UpdateCustomPlatformInput = z.infer<typeof UpdateCustomPlatformSchema>;
