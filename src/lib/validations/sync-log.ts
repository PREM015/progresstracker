// src/lib/validations/sync-log.ts
// Sync log validation schemas

import { z } from 'zod';

export const SyncLogQuerySchema = z.object({
  userPlatformId: z.string().cuid().optional(),
  platformId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'partial', 'skipped']).optional(),
  trigger: z.enum(['manual', 'scheduled', 'webhook', 'auto', 'admin']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const TriggerSyncSchema = z.object({
  userPlatformId: z.string().cuid('Invalid user platform ID'),
  force: z.boolean().default(false),
});

export type SyncLogQueryInput = z.infer<typeof SyncLogQuerySchema>;
export type TriggerSyncInput = z.infer<typeof TriggerSyncSchema>;
