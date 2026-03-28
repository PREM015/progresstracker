// src/lib/validations/maintenance-window.ts
// Maintenance window validation schemas

import { z } from 'zod';

const BaseMaintenanceWindowSchema = z.object({
  title: z.string().min(5, 'Title required').max(200).trim(),
  description: z.string().max(5000).optional().nullable(),
  type: z.enum(['planned', 'emergency', 'routine']).default('planned'),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  affectedServices: z.array(z.string().max(100)).max(20).default([]),
  notifyUsers: z.boolean().default(true),
  message: z.string().max(2000).optional().nullable(),
});

export const CreateMaintenanceWindowSchema = BaseMaintenanceWindowSchema.refine(
  (data) => data.endTime > data.startTime,
  { message: 'End time must be after start time', path: ['endTime'] }
);

export const UpdateMaintenanceWindowSchema = BaseMaintenanceWindowSchema.partial().extend({
  status: z.enum(['scheduled', 'active', 'completed', 'cancelled']).optional(),
});

export type CreateMaintenanceWindowInput = z.infer<typeof CreateMaintenanceWindowSchema>;
export type UpdateMaintenanceWindowInput = z.infer<typeof UpdateMaintenanceWindowSchema>;
