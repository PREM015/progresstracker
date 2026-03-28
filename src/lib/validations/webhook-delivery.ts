// src/lib/validations/webhook-delivery.ts
// Webhook delivery validation schemas (alias)

export {
  WebhookDeliveryQuerySchema,
  type WebhookDeliveryQueryInput,
} from './webhook';

import { z } from 'zod';

export const RetryWebhookDeliverySchema = z.object({
  deliveryId: z.string().cuid('Invalid delivery ID'),
});

export type RetryWebhookDeliveryInput = z.infer<typeof RetryWebhookDeliverySchema>;
