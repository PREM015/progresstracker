// src/lib/validations/daily-stats.ts
// Daily stats validation schemas

import { z } from 'zod';

export const UpdateDailyStatsSchema = z.object({
  date: z.coerce.date().optional(),
  notes: z.string().max(2000).optional().nullable(),
  mood: z.number().int().min(1).max(5).optional().nullable(),
  isRestDay: z.boolean().optional(),
});

export const DailyStatsQuerySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  userId: z.string().cuid().optional(),
  includePlatforms: z.coerce.boolean().default(false),
}).refine(
  (data) => data.startDate <= data.endDate,
  { message: 'startDate must be before endDate', path: ['startDate'] }
);

export const DailyStatsRangeSchema = z.object({
  range: z.enum(['7d', '30d', '90d', '365d', 'custom']).default('30d'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  userId: z.string().cuid().optional(),
});

export type UpdateDailyStatsInput = z.infer<typeof UpdateDailyStatsSchema>;
export type DailyStatsQueryInput = z.infer<typeof DailyStatsQuerySchema>;
export type DailyStatsRangeInput = z.infer<typeof DailyStatsRangeSchema>;
