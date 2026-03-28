// src/lib/validations/share-link.ts
// Share link validation schemas

import { z } from 'zod';

export const CreateShareLinkSchema = z.object({
  type: z.enum(['profile', 'stats', 'streak', 'goals', 'achievements', 'report']),
  title: z.string().max(200).trim().optional().nullable(),
  description: z.string().max(1000).trim().optional().nullable(),
  isPublic: z.boolean().default(true),
  password: z.string().min(4).max(100).optional(),
  allowedViews: z.number().int().positive().max(100000).optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  customization: z.object({
    theme: z.enum(['light', 'dark']).optional(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    showBranding: z.boolean().optional(),
    showAvatar: z.boolean().optional(),
  }).optional(),
  includedData: z.object({
    showStreak: z.boolean().optional(),
    showTotalProblems: z.boolean().optional(),
    showPlatforms: z.boolean().optional(),
    showGoals: z.boolean().optional(),
    showAchievements: z.boolean().optional(),
    showHeatmap: z.boolean().optional(),
    showStats: z.boolean().optional(),
    dateRange: z.object({
      preset: z.enum(['7d', '30d', '90d', '365d', 'all']).optional(),
      start: z.string().optional(),
      end: z.string().optional(),
    }).optional(),
  }).optional(),
});

export const UpdateShareLinkSchema = CreateShareLinkSchema.partial().extend({
  status: z.enum(['active', 'expired', 'revoked']).optional(),
});

export const ShareLinkAuthSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export type CreateShareLinkInput = z.infer<typeof CreateShareLinkSchema>;
export type UpdateShareLinkInput = z.infer<typeof UpdateShareLinkSchema>;
export type ShareLinkAuthInput = z.infer<typeof ShareLinkAuthSchema>;
