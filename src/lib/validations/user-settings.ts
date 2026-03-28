// src/lib/validations/user-settings.ts
// User settings validation schemas

import { z } from 'zod';

export const UpdateUserSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().length(2).optional(),
  timezone: z.string().max(50).optional(),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
  weekStartDay: z.number().int().min(0).max(6).optional(), // 0=Sunday
  dashboardLayout: z.enum(['grid', 'list', 'compact']).optional(),
  showPublicProfile: z.boolean().optional(),
  showStreakOnProfile: z.boolean().optional(),
  showStatsOnProfile: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  digestEmail: z.enum(['daily', 'weekly', 'monthly', 'never']).optional(),
  marketingEmails: z.boolean().optional(),
});

export type UpdateUserSettingsInput = z.infer<typeof UpdateUserSettingsSchema>;
