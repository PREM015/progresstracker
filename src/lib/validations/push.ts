// src/lib/validations/push.ts
// Push notification validation schemas

import { z } from 'zod';

export const SubscribePushSchema = z.object({
  endpoint: z.string().url('Invalid endpoint URL'),
  keys: z.object({
    p256dh: z.string().min(1, 'p256dh key is required'),
    auth: z.string().min(1, 'Auth key is required'),
  }),
  userAgent: z.string().max(500).optional(),
});

export const SendPushSchema = z.object({
  userId: z.string().cuid('Invalid user ID'),
  type: z.enum([
    'achievement_unlocked', 'streak_at_risk', 'streak_broken',
    'goal_deadline', 'goal_completed', 'sync_completed', 'sync_failed',
    'reminder', 'announcement', 'subscription_expiring', 'payment_failed'
  ]),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  url: z.string().url().optional().nullable(),
  data: z.record(z.unknown()).optional(),
});

export type SubscribePushInput = z.infer<typeof SubscribePushSchema>;
export type SendPushInput = z.infer<typeof SendPushSchema>;
