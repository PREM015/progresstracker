// src/lib/validations/session.ts
// Session validation schemas

import { z } from 'zod';

export const CreateSessionSchema = z.object({
  sessionToken: z.string().min(1),
  userId: z.string().cuid(),
  expires: z.coerce.date(),
});

export const UpdateSessionSchema = z.object({
  expires: z.coerce.date(),
});

export const RevokeSessionSchema = z.object({
  sessionId: z.string().cuid('Invalid session ID'),
  reason: z.string().max(500).optional(),
});

export const RevokeAllSessionsSchema = z.object({
  exceptCurrentSession: z.boolean().default(true),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
export type UpdateSessionInput = z.infer<typeof UpdateSessionSchema>;
export type RevokeSessionInput = z.infer<typeof RevokeSessionSchema>;
export type RevokeAllSessionsInput = z.infer<typeof RevokeAllSessionsSchema>;
