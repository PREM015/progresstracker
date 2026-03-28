// src/types/refresh-token.ts
// JWT Refresh token types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type RefreshTokenStatus = 'active' | 'used' | 'revoked' | 'expired';

export const REFRESH_TOKEN_EXPIRY_DAYS = 30;
export const ACCESS_TOKEN_EXPIRY_MINUTES = 15;

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Refresh token record (matches Prisma RefreshToken model) */
export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  tokenHash: string;
  familyId: string;
  status: RefreshTokenStatus;
  expiresAt: Date;
  usedAt?: Date | null;
  revokedAt?: Date | null;
  revokedReason?: string | null;
  replacedByToken?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

/** Token pair returned on login/refresh */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

/** Decoded access token payload */
export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  role: string;
  sessionId?: string;
  iat: number;
  exp: number;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface RevokeRefreshTokenInput {
  tokenId?: string;
  familyId?: string;
  userId?: string;
  reason?: string;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface RefreshTokenResponse {
  success: boolean;
  tokens?: TokenPair;
  error?: string;
}

export interface ActiveTokensResponse {
  tokens: Array<Pick<RefreshToken, 'id' | 'ipAddress' | 'userAgent' | 'createdAt' | 'expiresAt'>>;
  total: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function isRefreshTokenValid(token: Pick<RefreshToken, 'status' | 'expiresAt'>): boolean {
  return token.status === 'active' && new Date() < new Date(token.expiresAt);
}

export default RefreshToken;
