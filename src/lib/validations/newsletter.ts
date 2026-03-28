// src/lib/validations/newsletter.ts
// Newsletter subscriber validation schemas

import { z } from 'zod';

export const SubscribeNewsletterSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  name: z.string().max(100).trim().optional(),
  source: z.string().max(100).optional(),
  preferences: z.object({
    weekly_digest: z.boolean().default(true),
    product_updates: z.boolean().default(true),
    tips_tricks: z.boolean().default(true),
  }).optional(),
});

export const UnsubscribeNewsletterSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  token: z.string().min(32, 'Invalid unsubscribe token').optional(),
  reason: z.string().max(500).optional(),
});

export const NewsletterQuerySchema = z.object({
  status: z.enum(['subscribed', 'unsubscribed', 'bounced', 'complained']).optional(),
  source: z.string().max(100).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type SubscribeNewsletterInput = z.infer<typeof SubscribeNewsletterSchema>;
export type UnsubscribeNewsletterInput = z.infer<typeof UnsubscribeNewsletterSchema>;
