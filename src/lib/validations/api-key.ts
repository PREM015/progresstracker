// src/lib/validations/api-key.ts
// API key validation schemas

import { z } from 'zod';

const API_KEY_SCOPES = [
  'read:profile', 'read:stats', 'read:tracker', 'write:tracker',
  'read:goals', 'write:goals', 'read:platforms', 'write:platforms',
  'read:achievements', 'read:subscriptions', 'admin:all',
] as const;

export const CreateApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  scopes: z.array(z.enum(API_KEY_SCOPES)).min(1, 'At least one scope is required'),
  expiresAt: z.coerce.date().optional(),
  ipWhitelist: z.array(z.string().ip()).max(20).optional(),
  rateLimit: z.number().int().positive().max(10000).default(1000),
});

export const UpdateApiKeySchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  scopes: z.array(z.enum(API_KEY_SCOPES)).min(1).optional(),
  ipWhitelist: z.array(z.string().ip()).max(20).optional(),
  rateLimit: z.number().int().positive().max(10000).optional(),
});

export const RevokeApiKeySchema = z.object({
  reason: z.string().max(500).optional(),
});

export const ApiKeyQuerySchema = z.object({
  status: z.enum(['active', 'revoked', 'expired']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof UpdateApiKeySchema>;
export type RevokeApiKeyInput = z.infer<typeof RevokeApiKeySchema>;
