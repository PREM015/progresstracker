// src/lib/validations/user-platform.ts
// User platform connection validation schemas

import { z } from 'zod';

export const ConnectPlatformSchema = z.object({
  platformId: z.string().cuid('Invalid platform ID'),
  username: z.string().min(1, 'Username is required').max(100, 'Username too long').trim(),
  accessToken: z.string().optional(),
  syncFrequency: z.enum(['realtime', 'hourly', 'daily', 'manual']).default('daily'),
});

export const UpdateUserPlatformSchema = z.object({
  username: z.string().min(1).max(100).trim().optional(),
  syncFrequency: z.enum(['realtime', 'hourly', 'daily', 'manual']).optional(),
  isPrimary: z.boolean().optional(),
  settings: z.record(z.unknown()).optional(),
});

export const SyncPlatformSchema = z.object({
  userPlatformId: z.string().cuid('Invalid user platform ID'),
  force: z.boolean().default(false),
});

export const UserPlatformQuerySchema = z.object({
  status: z.enum(['active', 'inactive', 'syncing', 'error', 'disconnected']).optional(),
  platformId: z.string().cuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ConnectPlatformInput = z.infer<typeof ConnectPlatformSchema>;
export type UpdateUserPlatformInput = z.infer<typeof UpdateUserPlatformSchema>;
export type SyncPlatformInput = z.infer<typeof SyncPlatformSchema>;
