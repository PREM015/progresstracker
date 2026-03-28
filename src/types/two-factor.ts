// src/types/two-factor.ts
// Two-factor authentication types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type TwoFactorMethod = 'totp' | 'sms' | 'email' | 'backup_code';
export type TwoFactorStatus = 'active' | 'disabled' | 'pending_setup';

export const TOTP_ISSUER = 'ProgressTracker';
export const TOTP_ALGORITHM = 'SHA1';
export const TOTP_DIGITS = 6;
export const TOTP_STEP = 30;
export const TOTP_WINDOW = 1; // Allow 1 step drift

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Two-factor auth config record (matches Prisma TwoFactorAuth model) */
export interface TwoFactorAuth {
  id: string;
  userId: string;
  method: TwoFactorMethod;
  secret?: string | null;
  secretEncrypted?: string | null;
  status: TwoFactorStatus;
  isEnabled: boolean;
  phoneNumber?: string | null;
  enabledAt?: Date | null;
  lastUsedAt?: Date | null;
  recoveryEmail?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** TOTP setup data */
export interface TotpSetupData {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

/** 2FA verification result */
export interface TwoFactorVerifyResult {
  success: boolean;
  method?: TwoFactorMethod;
  error?: string;
}

/** 2FA status for a user */
export interface TwoFactorStatusInfo {
  isEnabled: boolean;
  method?: TwoFactorMethod;
  enabledAt?: Date | null;
  lastUsedAt?: Date | null;
  hasBackupCodes: boolean;
  backupCodesRemaining: number;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface SetupTotpInput {
  secret: string;
  code: string; // Verification code to confirm setup
}

export interface VerifyTotpInput {
  code: string;
}

export interface DisableTwoFactorInput {
  code: string;
  password: string;
}

export interface EnableTwoFactorInput {
  method: TwoFactorMethod;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface SetupTotpResponse {
  success: boolean;
  setupData?: TotpSetupData;
  error?: string;
}

export interface DisableTwoFactorResponse {
  success: boolean;
  message: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function isTwoFactorEnabled(tfa: Pick<TwoFactorAuth, 'isEnabled' | 'status'>): boolean {
  return tfa.isEnabled && tfa.status === 'active';
}

export function getTwoFactorMethodLabel(method: TwoFactorMethod): string {
  const labels: Record<TwoFactorMethod, string> = {
    totp: 'Authenticator App (TOTP)',
    sms: 'SMS Text Message',
    email: 'Email Code',
    backup_code: 'Backup Code',
  };
  return labels[method];
}

export default TwoFactorAuth;
