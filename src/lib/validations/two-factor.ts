// src/lib/validations/two-factor.ts
// Two-factor authentication validation schemas

import { z } from 'zod';

const totpCodeSchema = z
  .string()
  .length(6, 'Code must be 6 digits')
  .regex(/^\d+$/, 'Code must be digits only');

export const SetupTotpSchema = z.object({
  secret: z.string().min(16, 'Invalid secret'),
  code: totpCodeSchema,
});

export const VerifyTotpSchema = z.object({
  code: totpCodeSchema,
});

export const VerifyBackupCodeSchema = z.object({
  code: z.string().min(10, 'Invalid backup code').max(11),
});

export const DisableTwoFactorSchema = z.object({
  code: z.string().min(6, 'Verification code required'),
  password: z.string().min(1, 'Password is required for confirmation'),
});

export const EnableTwoFactorSchema = z.object({
  method: z.enum(['totp', 'sms', 'email', 'backup_code']),
});

export type SetupTotpInput = z.infer<typeof SetupTotpSchema>;
export type VerifyTotpInput = z.infer<typeof VerifyTotpSchema>;
export type DisableTwoFactorInput = z.infer<typeof DisableTwoFactorSchema>;
export type EnableTwoFactorInput = z.infer<typeof EnableTwoFactorSchema>;
