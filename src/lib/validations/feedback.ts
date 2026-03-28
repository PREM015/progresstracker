// src/lib/validations/feedback.ts
// User feedback validation schemas

import { z } from 'zod';

export const CreateFeedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'improvement', 'praise', 'other']),
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().min(5, 'Title required').max(200).trim(),
  description: z.string().min(10, 'Description required').max(5000).trim(),
  category: z.string().max(50).optional(),
  url: z.string().url().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  isAnonymous: z.boolean().default(false),
  tags: z.array(z.string().max(30)).max(5).default([]),
});

export const UpdateFeedbackStatusSchema = z.object({
  feedbackId: z.string().cuid('Invalid feedback ID'),
  status: z.enum(['open', 'in_review', 'planned', 'in_progress', 'completed', 'rejected', 'duplicate']),
  adminNote: z.string().max(2000).optional(),
});

export type CreateFeedbackInput = z.infer<typeof CreateFeedbackSchema>;
export type UpdateFeedbackStatusInput = z.infer<typeof UpdateFeedbackStatusSchema>;
