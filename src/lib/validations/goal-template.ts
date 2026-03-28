// src/lib/validations/goal-template.ts
// Goal template validation schemas

import { z } from 'zod';

export const CreateGoalTemplateSchema = z.object({
  name: z.string().min(2, 'Name required').max(200).trim(),
  description: z.string().max(2000).optional().nullable(),
  category: z.enum(['consistency', 'volume', 'speed', 'difficulty', 'platform_specific', 'streak', 'custom']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).default('beginner'),
  metric: z.string().min(1).max(100),
  defaultTarget: z.number().int().positive().max(1000000),
  unit: z.string().max(50).optional().nullable(),
  durationDays: z.number().int().positive().max(3650).optional().nullable(),
  platformId: z.string().cuid().optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  tags: z.array(z.string().max(30)).max(10).default([]),
});

export const UpdateGoalTemplateSchema = CreateGoalTemplateSchema.partial().extend({
  isActive: z.boolean().optional(),
  isPopular: z.boolean().optional(),
});

export const CreateGoalFromTemplateSchema = z.object({
  templateId: z.string().cuid('Invalid template ID'),
  customTarget: z.number().int().positive().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional().nullable(),
  reminderEnabled: z.boolean().default(false),
});

export type CreateGoalTemplateInput = z.infer<typeof CreateGoalTemplateSchema>;
export type UpdateGoalTemplateInput = z.infer<typeof UpdateGoalTemplateSchema>;
export type CreateGoalFromTemplateInput = z.infer<typeof CreateGoalFromTemplateSchema>;
