// src/types/user-platform.ts
// User-platform connection types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type UserPlatformStatus = 'active' | 'inactive' | 'syncing' | 'error' | 'disconnected';
export type SyncFrequency = 'realtime' | 'hourly' | 'daily' | 'manual';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** User-platform connection (matches Prisma UserPlatform model) */
export interface UserPlatform {
  id: string;
  userId: string;
  platformId: string;
  username: string;
  profileUrl?: string | null;
  isVerified: boolean;
  isPrimary: boolean;
  status: UserPlatformStatus;
  syncFrequency: SyncFrequency;
  lastSyncAt?: Date | null;
  nextSyncAt?: Date | null;
  syncError?: string | null;
  totalProblemsSolved: number;
  totalMinutesSpent: number;
  totalXpEarned: number;
  rank?: string | null;
  rating?: number | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  settings?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/** User platform with platform info */
export interface UserPlatformWithPlatform extends UserPlatform {
  platform: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    color?: string | null;
    baseUrl?: string | null;
  };
}

/** Lightweight user platform summary */
export interface UserPlatformSummary {
  id: string;
  platformId: string;
  platformName: string;
  platformSlug: string;
  platformLogo?: string | null;
  username: string;
  isVerified: boolean;
  isPrimary: boolean;
  status: UserPlatformStatus;
  lastSyncAt?: Date | null;
  totalProblemsSolved: number;
  rank?: string | null;
  rating?: number | null;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface ConnectPlatformInput {
  platformId: string;
  username: string;
  accessToken?: string;
  syncFrequency?: SyncFrequency;
}

export interface UpdateUserPlatformInput {
  username?: string;
  syncFrequency?: SyncFrequency;
  isPrimary?: boolean;
  settings?: Record<string, unknown>;
}

export interface SyncUserPlatformInput {
  userPlatformId: string;
  force?: boolean;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface ConnectPlatformResponse {
  success: boolean;
  userPlatform?: UserPlatformWithPlatform;
  error?: string;
}

export interface SyncPlatformResponse {
  success: boolean;
  userPlatformId: string;
  problemsSynced?: number;
  error?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function isPlatformSyncable(up: Pick<UserPlatform, 'status' | 'lastSyncAt'>): boolean {
  if (up.status === 'error' || up.status === 'disconnected') return false;
  return true;
}

export function getPlatformStatusLabel(status: UserPlatformStatus): string {
  const labels: Record<UserPlatformStatus, string> = {
    active: 'Active',
    inactive: 'Inactive',
    syncing: 'Syncing...',
    error: 'Error',
    disconnected: 'Disconnected',
  };
  return labels[status];
}

export default UserPlatform;
