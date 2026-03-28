// src/types/verification.ts
// General verification types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type VerificationType =
  | 'email'
  | 'phone'
  | 'identity'
  | 'age'
  | 'address';

export type VerificationStatus = 'pending' | 'verified' | 'failed' | 'expired';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Generic verification record */
export interface Verification {
  id: string;
  userId: string;
  type: VerificationType;
  status: VerificationStatus;
  verifiedAt?: Date | null;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Verification result */
export interface VerificationResult {
  success: boolean;
  type: VerificationType;
  verifiedAt?: Date;
  error?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function isVerified(verification: Pick<Verification, 'status'>): boolean {
  return verification.status === 'verified';
}

export function isVerificationExpired(verification: Pick<Verification, 'expiresAt' | 'status'>): boolean {
  if (verification.status === 'verified') return false;
  if (!verification.expiresAt) return false;
  return new Date() > new Date(verification.expiresAt);
}

export default Verification;
