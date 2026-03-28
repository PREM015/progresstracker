// src/lib/validations/settings.ts
// General application settings validation schemas

import { z } from 'zod';

export const NotificationPreferencesSchema = z.object({
  emailAchievements: z.boolean().optional(),
  emailStreakReminder: z.boolean().optional(),
  emailGoalDeadline: z.boolean().optional(),
  emailWeeklyDigest: z.boolean().optional(),
  emailMarketing: z.boolean().optional(),
  pushAchievements: z.boolean().optional(),
  pushStreakAtRisk: z.boolean().optional(),
  pushGoalReminder: z.boolean().optional(),
  pushSyncComplete: z.boolean().optional(),
  pushAnnouncements: z.boolean().optional(),
});

export const PrivacySettingsSchema = z.object({
  profileVisibility: z.enum(['public', 'private', 'friends']).optional(),
  showEmail: z.boolean().optional(),
  showLocation: z.boolean().optional(),
  showActivity: z.boolean().optional(),
  allowFollowing: z.boolean().optional(),
  showAchievements: z.boolean().optional(),
  showStreak: z.boolean().optional(),
});

export const AppearanceSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  fontSize: z.enum(['sm', 'md', 'lg']).optional(),
  compactMode: z.boolean().optional(),
  animationsEnabled: z.boolean().optional(),
});

export type NotificationPreferencesInput = z.infer<typeof NotificationPreferencesSchema>;
export type PrivacySettingsInput = z.infer<typeof PrivacySettingsSchema>;
export type AppearanceSettingsInput = z.infer<typeof AppearanceSettingsSchema>;
