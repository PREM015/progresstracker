// src/lib/validations/active-session.ts
// Active session validation schemas

import { z } from 'zod';

export const ActiveSessionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(['active', 'expired', 'revoked']).optional(),
});

export const RevokeActiveSessionSchema = z.object({
  sessionId: z.string().cuid(),
  reason: z.string().max(500).optional(),
});

export const TrustSessionSchema = z.object({
  sessionId: z.string().cuid(),
  isTrusted: z.boolean(),
});

export type ActiveSessionQueryInput = z.infer<typeof ActiveSessionQuerySchema>;
export type RevokeActiveSessionInput = z.infer<typeof RevokeActiveSessionSchema>;
export type TrustSessionInput = z.infer<typeof TrustSessionSchema>;
