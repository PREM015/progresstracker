// src/lib/validations/account.ts
// OAuth account validation schemas

import { z } from 'zod';

export const LinkAccountSchema = z.object({
  provider: z.enum(['github', 'google', 'discord', 'twitter', 'linkedin', 'gitlab', 'bitbucket']),
  providerAccountId: z.string().min(1, 'Provider account ID is required'),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  expires_at: z.number().int().optional(),
  scope: z.string().optional(),
  token_type: z.string().optional(),
});

export const UnlinkAccountSchema = z.object({
  provider: z.string().min(1),
  providerAccountId: z.string().min(1),
});

export type LinkAccountInput = z.infer<typeof LinkAccountSchema>;
export type UnlinkAccountInput = z.infer<typeof UnlinkAccountSchema>;
