// src/types/backup-code.ts
// Backup code types for 2FA recovery

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type BackupCodeStatus = 'active' | 'used' | 'revoked';

export const BACKUP_CODE_COUNT = 10;
export const BACKUP_CODE_LENGTH = 10;
export const BACKUP_CODE_FORMAT = /^[A-Z0-9]{5}-[A-Z0-9]{5}$/;

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Backup code record (matches Prisma BackupCode model) */
export interface BackupCode {
  id: string;
  userId: string;
  codeHash: string;
  status: BackupCodeStatus;
  usedAt?: Date | null;
  usedFromIp?: string | null;
  createdAt: Date;
  revokedAt?: Date | null;
}

/** Backup code for display (never exposes the hash) */
export interface BackupCodeDisplay {
  id: string;
  status: BackupCodeStatus;
  usedAt?: Date | null;
  createdAt: Date;
  /** Only shown once on generation */
  plainCode?: string;
}

/** Regenerated backup codes */
export interface RegeneratedBackupCodes {
  codes: string[]; // Plain text - only shown once
  generatedAt: Date;
  previousCodesRevoked: number;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface UseBackupCodeInput {
  code: string;
  ipAddress?: string;
}

export interface RegenerateBackupCodesInput {
  password: string; // Security confirmation
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface BackupCodesStatusResponse {
  total: number;
  active: number;
  used: number;
  hasCodesRemaining: boolean;
}

export interface UseBackupCodeResponse {
  success: boolean;
  remainingCodes?: number;
  error?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function formatBackupCode(raw: string): string {
  const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length !== BACKUP_CODE_LENGTH) return raw;
  return `${clean.slice(0, 5)}-${clean.slice(5)}`;
}

export function isBackupCodeUsable(code: Pick<BackupCode, 'status'>): boolean {
  return code.status === 'active';
}

export default BackupCode;
