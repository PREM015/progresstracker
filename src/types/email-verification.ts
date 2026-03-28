// src/types/email-verification.ts
// Email verification flow types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type EmailVerificationStatus = 'pending' | 'verified' | 'expired' | 'cancelled';

export const EMAIL_VERIFICATION_EXPIRY_HOURS = 48;

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Email verification record (matches Prisma EmailVerification model) */
export interface EmailVerification {
  id: string;
  userId: string;
  email: string;
  token: string;
  tokenHash: string;
  status: EmailVerificationStatus;
  expiresAt: Date;
  verifiedAt?: Date | null;
  ipAddress?: string | null;
  createdAt: Date;
}

/** Email verification with user */
export interface EmailVerificationWithUser extends EmailVerification {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    emailVerified: Date | null;
  };
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface SendVerificationEmailInput {
  userId: string;
  email: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface ResendVerificationEmailInput {
  email: string;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface SendVerificationEmailResponse {
  success: boolean;
  message: string;
  expiresAt?: Date;
}

export interface VerifyEmailResponse {
  success: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function isEmailVerificationValid(
  ev: Pick<EmailVerification, 'status' | 'expiresAt'>
): boolean {
  return ev.status === 'pending' && new Date() < new Date(ev.expiresAt);
}

export default EmailVerification;
