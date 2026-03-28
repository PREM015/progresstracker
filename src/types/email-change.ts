// src/types/email-change.ts
// Email change request types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type EmailChangeStatus = 'pending' | 'confirmed' | 'cancelled' | 'expired';

export const EMAIL_CHANGE_EXPIRY_HOURS = 24;

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Email change request record (matches Prisma EmailChangeRequest model) */
export interface EmailChangeRequest {
  id: string;
  userId: string;
  oldEmail: string;
  newEmail: string;
  token: string;
  tokenHash: string;
  status: EmailChangeStatus;
  expiresAt: Date;
  confirmedAt?: Date | null;
  ipAddress?: string | null;
  createdAt: Date;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface RequestEmailChangeInput {
  newEmail: string;
  password: string; // Require password confirmation
}

export interface ConfirmEmailChangeInput {
  token: string;
}

export interface CancelEmailChangeInput {
  requestId: string;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface RequestEmailChangeResponse {
  success: boolean;
  message: string;
  expiresAt?: Date;
}

export interface ConfirmEmailChangeResponse {
  success: boolean;
  newEmail?: string;
  error?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function isEmailChangeValid(
  req: Pick<EmailChangeRequest, 'status' | 'expiresAt'>
): boolean {
  return req.status === 'pending' && new Date() < new Date(req.expiresAt);
}

export default EmailChangeRequest;
