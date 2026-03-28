// src/types/login.ts
// Login attempt and authentication types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type LoginAttemptStatus = 'success' | 'failed' | 'blocked' | 'mfa_required' | 'locked';
export type LoginFailureReason =
  | 'invalid_credentials'
  | 'account_locked'
  | 'account_disabled'
  | 'email_not_verified'
  | 'mfa_failed'
  | 'too_many_attempts'
  | 'ip_blocked'
  | 'suspicious_activity';

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_MINUTES = 30;

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Login attempt record (matches Prisma LoginAttempt model) */
export interface LoginAttempt {
  id: string;
  userId?: string | null;
  email: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  status: LoginAttemptStatus;
  failureReason?: LoginFailureReason | null;
  attemptCount: number;
  lockedUntil?: Date | null;
  country?: string | null;
  city?: string | null;
  createdAt: Date;
}

/** Login credentials */
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  mfaCode?: string;
}

/** Login result from auth service */
export interface LoginResult {
  success: boolean;
  status: LoginAttemptStatus;
  userId?: string;
  sessionToken?: string;
  mfaRequired?: boolean;
  remainingAttempts?: number;
  lockedUntil?: Date;
  error?: string;
}

/** Login rate limit info */
export interface LoginRateLimitInfo {
  attempts: number;
  maxAttempts: number;
  remaining: number;
  isLocked: boolean;
  lockedUntil?: Date;
  resetAt?: Date;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface MfaLoginInput {
  email: string;
  mfaCode: string;
  backupCode?: string;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface LoginAttemptsResponse {
  attempts: LoginAttempt[];
  total: number;
  failedCount: number;
  successCount: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function isAccountLocked(attempt: Pick<LoginAttempt, 'lockedUntil'>): boolean {
  if (!attempt.lockedUntil) return false;
  return new Date() < new Date(attempt.lockedUntil);
}

export function getLockoutRemainingMinutes(lockedUntil: Date): number {
  return Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 60000);
}

export default LoginAttempt;
