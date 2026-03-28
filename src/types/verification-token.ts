// src/types/verification-token.ts
// NextAuth verification token types

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Verification token (matches Prisma VerificationToken model) */
export interface VerificationToken {
  identifier: string;
  token: string;
  expires: Date;
}

/** Extended verification token with metadata */
export interface VerificationTokenExtended extends VerificationToken {
  id: string;
  type: VerificationTokenType;
  userId?: string | null;
  usedAt?: Date | null;
  createdAt: Date;
}

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type VerificationTokenType =
  | 'email_verification'
  | 'magic_link'
  | 'phone_verification'
  | 'delete_account';

export const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreateVerificationTokenInput {
  identifier: string;
  type: VerificationTokenType;
  userId?: string;
  expiresInHours?: number;
}

export interface UseVerificationTokenInput {
  identifier: string;
  token: string;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface VerifyTokenResponse {
  valid: boolean;
  identifier?: string;
  userId?: string;
  type?: VerificationTokenType;
  error?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function isTokenExpired(token: Pick<VerificationToken, 'expires'>): boolean {
  return new Date() > new Date(token.expires);
}

export default VerificationToken;
