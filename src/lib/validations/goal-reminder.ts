// src/lib/validations/goal-reminder.ts
// Goal reminder validation schemas

import { z } from 'zod';

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)');

export const CreateGoalReminderSchema = z.object({
  goalId: z.string().cuid('Invalid goal ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').trim(),
  message: z.string().max(1000).optional(),
  frequency: z.enum(['daily', 'weekly', 'custom']),
  channels: z.array(z.enum(['email', 'push', 'sms', 'in_app'])).min(1, 'At least one channel required'),
  time: timeSchema,
  timezone: z.string().max(50).default('UTC'),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  customCronExpr: z.string().max(100).optional(),
});

export const UpdateGoalReminderSchema = CreateGoalReminderSchema.partial().omit({ goalId: true }).extend({
  isEnabled: z.boolean().optional(),
});

export type CreateGoalReminderInput = z.infer<typeof CreateGoalReminderSchema>;
export type UpdateGoalReminderInput = z.infer<typeof UpdateGoalReminderSchema>;
