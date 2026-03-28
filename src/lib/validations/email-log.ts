// src/lib/validations/email-log.ts
// Email log validation schemas

import { z } from 'zod';

export const EmailLogQuerySchema = z.object({
  userId: z.string().cuid().optional(),
  status: z.enum(['pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'spam', 'unsubscribed']).optional(),
  templateId: z.string().cuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const ResendEmailSchema = z.object({
  logId: z.string().cuid('Invalid email log ID'),
  reason: z.string().max(500).optional(),
});

export type EmailLogQueryInput = z.infer<typeof EmailLogQuerySchema>;
export type ResendEmailInput = z.infer<typeof ResendEmailSchema>;
