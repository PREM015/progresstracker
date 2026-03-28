// src/lib/validations/streak-history.ts
// Streak history validation schemas

import { z } from 'zod';

export const StreakHistoryQuerySchema = z.object({
  userId: z.string().cuid().optional(),
  type: z.enum(['daily', 'weekly']).optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type StreakHistoryQueryInput = z.infer<typeof StreakHistoryQuerySchema>;
