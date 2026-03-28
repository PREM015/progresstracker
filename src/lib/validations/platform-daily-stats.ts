// src/lib/validations/platform-daily-stats.ts
// Platform daily stats validation schemas

import { z } from 'zod';

export const CreatePlatformDailyStatsSchema = z.object({
  platformId: z.string().cuid('Invalid platform ID'),
  date: z.coerce.date(),
  problemsSolved: z.number().int().nonnegative().max(10000),
  minutesSpent: z.number().int().nonnegative().max(1440).default(0),
  xpEarned: z.number().int().nonnegative().max(1000000).default(0),
  difficulty: z.object({
    easy: z.number().int().nonnegative().optional(),
    medium: z.number().int().nonnegative().optional(),
    hard: z.number().int().nonnegative().optional(),
    expert: z.number().int().nonnegative().optional(),
  }).optional(),
  topics: z.array(z.string().max(50)).max(20).optional(),
});

export const UpdatePlatformDailyStatsSchema = CreatePlatformDailyStatsSchema.partial().omit({ platformId: true, date: true });

export const PlatformDailyStatsQuerySchema = z.object({
  platformId: z.string().cuid().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  userId: z.string().cuid().optional(),
});

export type CreatePlatformDailyStatsInput = z.infer<typeof CreatePlatformDailyStatsSchema>;
export type PlatformDailyStatsQueryInput = z.infer<typeof PlatformDailyStatsQuerySchema>;
