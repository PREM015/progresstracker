// src/lib/validations/user-achievement.ts
// User achievement validation schemas

import { z } from 'zod';

export const PinAchievementSchema = z.object({
  achievementId: z.string().cuid('Invalid achievement ID'),
  isPinned: z.boolean(),
});

export const HideAchievementSchema = z.object({
  achievementId: z.string().cuid('Invalid achievement ID'),
  isHidden: z.boolean(),
});

export const MarkAchievementsNotifiedSchema = z.object({
  achievementIds: z.array(z.string().cuid()).min(1).max(100),
});

export const UserAchievementQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  rarity: z.string().optional(),
  isHidden: z.coerce.boolean().optional(),
  isPinned: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['unlockedAt', 'points', 'category', 'rarity']).default('unlockedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PinAchievementInput = z.infer<typeof PinAchievementSchema>;
export type HideAchievementInput = z.infer<typeof HideAchievementSchema>;
export type UserAchievementQueryInput = z.infer<typeof UserAchievementQuerySchema>;
