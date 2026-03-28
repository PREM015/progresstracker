// src/lib/validations/audit-log.ts
// Audit log validation schemas

import { z } from 'zod';

export const AuditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  userId: z.string().cuid().optional(),
  actorId: z.string().cuid().optional(),
  action: z.string().optional(),
  severity: z.enum(['info', 'warning', 'error', 'critical']).optional(),
  resourceType: z.string().max(100).optional(),
  resourceId: z.string().max(200).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().max(200).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type AuditLogQueryInput = z.infer<typeof AuditLogQuerySchema>;
