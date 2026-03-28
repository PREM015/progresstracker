// src/types/password-reset.ts
// Password reset flow types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type PasswordResetStatus = 'pending' | 'used' | 'expired' | 'cancelled';

export const PASSWORD_RESET_EXPIRY_HOURS = 1;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Password reset token record (matches Prisma PasswordReset model) */
export interface PasswordReset {
  id: string;
  userId: string;
  token: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  status: PasswordResetStatus;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

/** Password reset with user info */
export interface PasswordResetWithUser extends PasswordReset {
  user: {
    id: string;
    email: string | null;
    name: string | null;
  };
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Request password reset */
export interface RequestPasswordResetInput {
  email: string;
}

/** Verify reset token */
export interface VerifyResetTokenInput {
  token: string;
}

/** Complete password reset */
export interface CompletePasswordResetInput {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

/** Direct admin password update */
export interface AdminResetPasswordInput {
  userId: string;
  newPassword: string;
  sendEmail?: boolean;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface RequestPasswordResetResponse {
  success: boolean;
  message: string;
  expiresAt?: Date;
}

export interface VerifyResetTokenResponse {
  valid: boolean;
  userId?: string;
  email?: string;
  expiresAt?: Date;
  error?: string;
}

export interface CompletePasswordResetResponse {
  success: boolean;
  message: string;
  redirectUrl?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function isResetTokenExpired(reset: Pick<PasswordReset, 'expiresAt' | 'status'>): boolean {
  if (reset.status !== 'pending') return true;
  return new Date() > new Date(reset.expiresAt);
}

export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length < PASSWORD_MIN_LENGTH) {
    feedback.push(`Must be at least ${PASSWORD_MIN_LENGTH} characters`);
  } else {
    score += 1;
  }

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add an uppercase letter');

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add a lowercase letter');

  if (/\d/.test(password)) score += 1;
  else feedback.push('Add a number');

  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push('Add a special character');

  return {
    isValid: score >= 3 && password.length >= PASSWORD_MIN_LENGTH,
    score,
    feedback,
  };
}

export default PasswordReset;
