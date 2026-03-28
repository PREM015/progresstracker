// src/lib/validations/feature-flag.ts
// Feature flag validation schemas

import { z } from 'zod';

export const CreateFeatureFlagSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[A-Z_]+$/, 'Key must be uppercase with underscores'),
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional().nullable(),
  isEnabled: z.boolean().default(false),
  enabledForRoles: z.array(z.enum(['user', 'pro', 'admin', 'super_admin'])).default([]),
  enabledForUserIds: z.array(z.string().cuid()).max(1000).default([]),
  rolloutPercentage: z.number().int().min(0).max(100).default(0),
  expiresAt: z.coerce.date().optional().nullable(),
});

export const UpdateFeatureFlagSchema = CreateFeatureFlagSchema.partial();

export const FeatureFlagQuerySchema = z.object({
  isEnabled: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateFeatureFlagInput = z.infer<typeof CreateFeatureFlagSchema>;
export type UpdateFeatureFlagInput = z.infer<typeof UpdateFeatureFlagSchema>;
