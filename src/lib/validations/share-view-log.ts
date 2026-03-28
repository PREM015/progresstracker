// src/lib/validations/share-view-log.ts
// Share view log validation schemas

import { z } from 'zod';

export const RecordShareViewSchema = z.object({
  shareLinkId: z.string().cuid('Invalid share link ID'),
  viewerUserId: z.string().cuid().optional(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().max(500).optional(),
  referrer: z.string().url().optional().nullable(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
});

export const ShareViewLogQuerySchema = z.object({
  shareLinkId: z.string().cuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type RecordShareViewInput = z.infer<typeof RecordShareViewSchema>;
