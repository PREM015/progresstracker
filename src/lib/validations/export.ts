// src/lib/validations/export.ts
// Export job validation schemas

import { z } from 'zod';

export const CreateExportJobSchema = z.object({
  format: z.enum(['csv', 'json', 'pdf', 'excel', 'xml']),
  dataTypes: z.array(
    z.enum(['all', 'tracker', 'goals', 'achievements', 'platforms', 'stats', 'blog_posts', 'account'])
  ).min(1, 'Select at least one data type').max(8),
  filters: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    platformIds: z.array(z.string().cuid()).optional(),
    goalIds: z.array(z.string().cuid()).optional(),
    includeMetadata: z.boolean().optional(),
  }).optional(),
});

export const BaseScheduledExportSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  format: z.enum(['csv', 'json', 'pdf', 'excel']),
  dataTypes: z.array(z.string()).min(1),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  deliveryMethod: z.enum(['email', 'download']),
  deliveryEmail: z.string().email('Invalid email').optional(),
  filters: z.record(z.unknown()).optional(),
});

export const CreateScheduledExportSchema = BaseScheduledExportSchema.refine((data) => {
  if (data.deliveryMethod === 'email' && !data.deliveryEmail) {
    return false;
  }
  return true;
}, { message: 'Email is required for email delivery', path: ['deliveryEmail'] });

export const UpdateScheduledExportSchema = BaseScheduledExportSchema.partial().extend({
  isEnabled: z.boolean().optional(),
});

export type CreateExportJobInput = z.infer<typeof CreateExportJobSchema>;
export type CreateScheduledExportInput = z.infer<typeof CreateScheduledExportSchema>;
export type UpdateScheduledExportInput = z.infer<typeof UpdateScheduledExportSchema>;
