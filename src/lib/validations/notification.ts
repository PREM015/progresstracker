// src/lib/validations/notification.ts
// Notification validation schemas

import { z } from 'zod';

export const NotificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  read: z.coerce.boolean().optional(),
  type: z.string().optional(),
});

export const MarkNotificationsReadSchema = z.object({
  notificationIds: z.array(z.string().cuid()).min(1).max(100),
});

export const MarkAllReadSchema = z.object({
  markAllAsRead: z.literal(true),
});

export const DeleteNotificationSchema = z.object({
  notificationId: z.string().cuid('Invalid notification ID'),
});

export const CreateNotificationSchema = z.object({
  userId: z.string().cuid(),
  type: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  message: z.string().max(2000),
  actionUrl: z.string().url().optional().nullable(),
  actionText: z.string().max(100).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export type NotificationQueryInput = z.infer<typeof NotificationQuerySchema>;
export type MarkNotificationsReadInput = z.infer<typeof MarkNotificationsReadSchema>;
export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
