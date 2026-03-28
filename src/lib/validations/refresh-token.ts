// src/lib/validations/refresh-token.ts
// Refresh token validation schemas

import { z } from 'zod';

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(32, 'Invalid refresh token'),
});

export const RevokeRefreshTokenSchema = z.object({
  tokenId: z.string().cuid().optional(),
  familyId: z.string().uuid().optional(),
  reason: z.string().max(500).optional(),
}).refine(
  (data) => data.tokenId || data.familyId,
  { message: 'Either tokenId or familyId must be provided' }
);

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type RevokeRefreshTokenInput = z.infer<typeof RevokeRefreshTokenSchema>;
