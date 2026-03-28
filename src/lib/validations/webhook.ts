// src/lib/validations/webhook.ts
// Webhook validation schemas

import { z } from 'zod';
import { ALL_WEBHOOK_EVENTS } from '@/types/webhook-info';

export const CreateWebhookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  url: z.string().url('Invalid URL').max(2000),
  events: z.array(
    z.enum(ALL_WEBHOOK_EVENTS as [string, ...string[]])
  ).min(1, 'Select at least one event').max(ALL_WEBHOOK_EVENTS.length),
  timeoutMs: z.number().int().min(1000, 'Minimum timeout is 1 second').max(30000).default(10000),
  maxRetries: z.number().int().min(0).max(10).default(3),
  headers: z.record(z.string().max(500)).optional(),
});

export const UpdateWebhookSchema = CreateWebhookSchema.partial().extend({
  status: z.enum(['active', 'inactive', 'suspended', 'error']).optional(),
});

export const TestWebhookSchema = z.object({
  webhookId: z.string().cuid('Invalid webhook ID'),
  event: z.enum(ALL_WEBHOOK_EVENTS as [string, ...string[]]),
  payload: z.record(z.unknown()).optional(),
});

export const WebhookDeliveryQuerySchema = z.object({
  webhookId: z.string().cuid().optional(),
  status: z.enum(['pending', 'success', 'failed', 'retrying', 'abandoned']).optional(),
  event: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateWebhookInput = z.infer<typeof CreateWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof UpdateWebhookSchema>;
export type TestWebhookInput = z.infer<typeof TestWebhookSchema>;
export type WebhookDeliveryQueryInput = z.infer<typeof WebhookDeliveryQuerySchema>;
