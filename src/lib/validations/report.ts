// src/lib/validations/report.ts
// Report generation validation schemas

import { z } from 'zod';

export const GenerateReportSchema = z.object({
  type: z.enum(['weekly', 'monthly', 'custom', 'annual', 'platform', 'achievement']),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  platformIds: z.array(z.string().cuid()).optional(),
  format: z.enum(['summary', 'detailed', 'pdf']).default('summary'),
  includeGoals: z.boolean().default(true),
  includeAchievements: z.boolean().default(true),
  includePlatformBreakdown: z.boolean().default(true),
}).refine(
  (data) => data.startDate <= data.endDate,
  { message: 'startDate must be before endDate', path: ['startDate'] }
);

export const ReportQuerySchema = z.object({
  type: z.enum(['weekly', 'monthly', 'custom', 'annual', 'platform', 'achievement']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type GenerateReportInput = z.infer<typeof GenerateReportSchema>;
