// src/types/api-key.ts
// API key types for programmatic access

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type ApiKeyStatus = 'active' | 'revoked' | 'expired';
export type ApiKeyScope =
  | 'read:profile'
  | 'read:stats'
  | 'read:tracker'
  | 'write:tracker'
  | 'read:goals'
  | 'write:goals'
  | 'read:platforms'
  | 'write:platforms'
  | 'read:achievements'
  | 'read:subscriptions'
  | 'admin:all';

export const API_KEY_PREFIX = 'pt_';
export const API_KEY_LENGTH = 40;
export const MAX_API_KEYS_PER_USER = 10;

export const ALL_API_KEY_SCOPES: ApiKeyScope[] = [
  'read:profile',
  'read:stats',
  'read:tracker',
  'write:tracker',
  'read:goals',
  'write:goals',
  'read:platforms',
  'write:platforms',
  'read:achievements',
  'read:subscriptions',
];

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** API key record (matches Prisma ApiKey model) */
export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  status: ApiKeyStatus;
  lastUsedAt?: Date | null;
  expiresAt?: Date | null;
  requestCount: number;
  rateLimit: number; // Requests per hour
  ipWhitelist?: string[] | null;
  createdAt: Date;
  updatedAt: Date;
  revokedAt?: Date | null;
  revokedReason?: string | null;
}

/** Public API key info (no hash exposed) */
export interface ApiKeyPublic {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  status: ApiKeyStatus;
  lastUsedAt?: Date | null;
  expiresAt?: Date | null;
  requestCount: number;
  createdAt: Date;
}

/** Newly created API key (key only shown once) */
export interface NewApiKeyResponse {
  apiKey: ApiKeyPublic;
  plainKey: string; // Only shown once
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreateApiKeyInput {
  name: string;
  scopes: ApiKeyScope[];
  expiresAt?: Date;
  ipWhitelist?: string[];
  rateLimit?: number;
}

export interface UpdateApiKeyInput {
  name?: string;
  scopes?: ApiKeyScope[];
  ipWhitelist?: string[];
  rateLimit?: number;
}

export interface RevokeApiKeyInput {
  reason?: string;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface ApiKeyListResponse {
  keys: ApiKeyPublic[];
  total: number;
  activeCount: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function isApiKeyValid(key: Pick<ApiKey, 'status' | 'expiresAt'>): boolean {
  if (key.status !== 'active') return false;
  if (key.expiresAt && new Date() > new Date(key.expiresAt)) return false;
  return true;
}

export function hasApiKeyScope(key: Pick<ApiKey, 'scopes'>, scope: ApiKeyScope): boolean {
  return key.scopes.includes(scope) || key.scopes.includes('admin:all');
}

export function maskApiKey(prefix: string): string {
  return `${prefix}${'•'.repeat(32)}`;
}

export default ApiKey;
