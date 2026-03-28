// src/lib/validations/backup-code.ts
// Backup code validation schemas

import { z } from 'zod';

export const UseBackupCodeSchema = z.object({
  code: z
    .string()
    .min(10, 'Invalid backup code')
    .max(11, 'Invalid backup code')
    .transform((c) => c.replace(/-/g, '').toUpperCase()),
  ipAddress: z.string().ip().optional(),
});

export const RegenerateBackupCodesSchema = z.object({
  password: z.string().min(1, 'Password is required for confirmation'),
});

export type UseBackupCodeInput = z.infer<typeof UseBackupCodeSchema>;
export type RegenerateBackupCodesInput = z.infer<typeof RegenerateBackupCodesSchema>;
