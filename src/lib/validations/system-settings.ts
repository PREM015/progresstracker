// src/lib/validations/system-settings.ts
// System settings validation schemas

import { z } from 'zod';

export const UpdateSystemSettingSchema = z.object({
  key: z.string().min(1, 'Key is required').max(200),
  value: z.string().max(10000),
  description: z.string().max(1000).optional(),
});

export const BulkUpdateSystemSettingsSchema = z.object({
  settings: z.array(z.object({
    key: z.string().min(1).max(200),
    value: z.string().max(10000),
  })).min(1, 'At least one setting required').max(50),
});

export const SystemSettingsQuerySchema = z.object({
  category: z.enum([
    'general', 'auth', 'email', 'billing', 'sync', 'platform',
    'notifications', 'limits', 'features', 'maintenance'
  ]).optional(),
  isPublic: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
});

export type UpdateSystemSettingInput = z.infer<typeof UpdateSystemSettingSchema>;
export type BulkUpdateSystemSettingsInput = z.infer<typeof BulkUpdateSystemSettingsSchema>;
export type SystemSettingsQueryInput = z.infer<typeof SystemSettingsQuerySchema>;
