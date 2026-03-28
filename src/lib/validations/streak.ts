// src/lib/validations/streak.ts
// Streak validation schemas

import { z } from 'zod';

export const UpdateStreakSchema = z.object({
  date: z.coerce.date(),
  hasActivity: z.boolean(),
  isRestDay: z.boolean().default(false),
});

export const StreakQuerySchema = z.object({
  userId: z.string().cuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const SetRestDaySchema = z.object({
  date: z.coerce.date(),
  isRestDay: z.boolean(),
});

export type UpdateStreakInput = z.infer<typeof UpdateStreakSchema>;
export type StreakQueryInput = z.infer<typeof StreakQuerySchema>;
export type SetRestDayInput = z.infer<typeof SetRestDaySchema>;
