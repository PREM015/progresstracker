// ===== FILE: src/types/platform.ts =====
// Complete platform types matching Prisma schema

import type { 
  PlatformCategory as PrismaPlatformCategory,
  AuthType as PrismaAuthType,
  SyncStatus as PrismaSyncStatus,
} from '@prisma/client';

// =============================================================================
// ENUM MAPPINGS (Config <-> Database)
// =============================================================================

/**
 * Config category IDs (lowercase for config files)
 */
export type PlatformCategoryId = 
  | 'dsa' 
  | 'job' 
  | 'hackathon' 
  | 'git' 
  | 'learning' 
  | 'opensource' 
  | 'company'
  | 'design'
  | 'data_science'
  | 'other';

/**
 * Map config categories to Prisma enum values
 */
export const CategoryMap: Record<PlatformCategoryId, PrismaPlatformCategory> = {
  dsa: 'DSA',
  job: 'JOB',
  git: 'GIT',
  learning: 'LEARNING',
  hackathon: 'HACKATHON',
  opensource: 'OPENSOURCE',
  company: 'COMPANY',
  design: 'DESIGN',
  data_science: 'DATA_SCIENCE',
  other: 'OTHER',
} as const;

/**
 * Reverse map: Prisma enum to config category
 */
export const ReverseCategoryMap: Record<PrismaPlatformCategory, PlatformCategoryId> = {
  DSA: 'dsa',
  JOB: 'job',
  GIT: 'git',
  LEARNING: 'learning',
  HACKATHON: 'hackathon',
  OPENSOURCE: 'opensource',
  COMPANY: 'company',
  DESIGN: 'design',
  DATA_SCIENCE: 'data_science',
  OTHER: 'other',
} as const;

/**
 * Config auth types (lowercase for config files)
 */
export type AuthType = 'none' | 'oauth' | 'api' | 'api_key' | 'scraping' | 'manual' | 'hybrid';

/**
 * Map config auth types to Prisma enum values
 */
export const AuthTypeMap: Record<AuthType, PrismaAuthType> = {
  none: 'NONE',
  oauth: 'OAUTH',
  api: 'API_KEY',
  api_key: 'API_KEY',
  scraping: 'SCRAPING',
  manual: 'MANUAL',
  hybrid: 'HYBRID',
} as const;

/**
 * Reverse map: Prisma enum to config auth type
 */
export const ReverseAuthTypeMap: Record<PrismaAuthType, AuthType> = {
  NONE: 'none',
  OAUTH: 'oauth',
  API_KEY: 'api_key',
  SCRAPING: 'scraping',
  MANUAL: 'manual',
  HYBRID: 'hybrid',
} as const;

/**
 * Sync status type
 */
export type SyncStatus = 
  | 'idle' 
  | 'pending' 
  | 'in_progress' 
  | 'success' 
  | 'partial' 
  | 'failed' 
  | 'cancelled' 
  | 'rate_limited';

/**
 * Map sync status to Prisma enum
 */
export const SyncStatusMap: Record<SyncStatus, PrismaSyncStatus> = {
  idle: 'IDLE',
  pending: 'PENDING',
  in_progress: 'IN_PROGRESS',
  success: 'SUCCESS',
  partial: 'PARTIAL',
  failed: 'FAILED',
  cancelled: 'CANCELLED',
  rate_limited: 'RATE_LIMITED',
} as const;

/**
 * Reverse map: Prisma enum to config sync status
 */
export const ReverseSyncStatusMap: Record<PrismaSyncStatus, SyncStatus> = {
  IDLE: 'idle',
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  SUCCESS: 'success',
  PARTIAL: 'partial',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  RATE_LIMITED: 'rate_limited',
} as const;

// =============================================================================
// CATEGORY TYPE (for UI display)
// =============================================================================

/**
 * Platform category for UI display
 */
export interface PlatformCategory {
  id: PlatformCategoryId;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
}

// =============================================================================
// CONFIG PLATFORM TYPE (for config/platforms.ts)
// =============================================================================

/**
 * Platform as defined in config/platforms.ts
 * Used for static platform definitions
 */
export interface Platform {
  // Identity
  id: string;
  name: string;
  slug: string;
  displayName?: string;

  // Classification
  category: PlatformCategoryId;
  subcategory?: string;
  tags?: string[];

  // Authentication
  authType: AuthType;

  // Branding
  icon?: string;
  logo?: string;
  color?: string;
  backgroundColor?: string;

  // URLs
  website?: string;
  apiEndpoint?: string;
  profileUrlPattern?: string; // e.g., "https://leetcode.com/{username}"

  // Capabilities
  supportsAutoSync: boolean;
  supportsWebhook?: boolean;
  supportsOAuth?: boolean;
  supportsApiKey?: boolean;
  requiresCredentials?: boolean;

  // Description & Help
  description?: string;
  setupInstructions?: string;
  helpArticleUrl?: string;

  // Data Configuration
  dataPoints?: string[];

  // Sync Configuration
  syncPriority?: number;
  syncInterval?: number; // Minutes (default 1440 = 24 hours)

  // Rate Limiting
  rateLimit?: number; // Requests per window
  rateLimitWindow?: number; // Window in seconds
}

// =============================================================================
// DATABASE PLATFORM TYPE (matches Prisma Platform model)
// =============================================================================

/**
 * Platform as stored in database
 * Matches Prisma Platform model exactly
 */
export interface DbPlatform {
  id: string;

  // Identity
  slug: string;
  name: string;
  displayName: string | null;
  description: string | null;

  // Classification
  category: PrismaPlatformCategory;
  subcategory: string | null;
  tags: string[];

  // Authentication
  authType: PrismaAuthType;
  oauthConfig: Record<string, unknown> | null;
  apiKeyConfig: Record<string, unknown> | null;

  // Branding
  icon: string | null;
  logo: string | null;
  color: string | null;
  backgroundColor: string | null;

  // URLs
  website: string | null;
  apiEndpoint: string | null;
  profileUrlPattern: string | null;

  // Capabilities
  supportsAutoSync: boolean;
  supportsWebhook: boolean;
  supportsOAuth: boolean;
  supportsApiKey: boolean;
  requiresCredentials: boolean;

  // Sync Configuration
  syncPriority: number;
  syncInterval: number;

  // Rate Limiting
  rateLimit: number | null;
  rateLimitWindow: number | null;

  // Data Configuration
  dataPoints: Record<string, boolean> | null;
  scraperConfig: Record<string, unknown> | null;

  // Health & Status
  isActive: boolean;
  isVerified: boolean;
  isBeta: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;

  lastHealthCheck: Date | null;
  healthStatus: 'healthy' | 'degraded' | 'down' | 'unknown' | null;
  healthMessage: string | null;

  // Stats
  totalUsers: number;
  successRate: number;
  avgSyncDuration: number | null;

  // Documentation
  setupGuideUrl: string | null;
  helpArticleUrl: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// USER PLATFORM TYPE (matches Prisma UserPlatform model)
// =============================================================================

/**
 * User's connection to a platform
 * Matches Prisma UserPlatform model
 */
export interface UserPlatform {
  id: string;
  userId: string;
  platformId: string;

  // Connection Info
  username: string | null;
  profileUrl: string | null;
  externalUserId: string | null;

  // Credentials (encrypted in DB)
  credentials: Record<string, unknown> | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  apiKey: string | null;

  // Status
  isActive: boolean;
  isVerified: boolean;
  verifiedAt: Date | null;

  // Connection Status
  connectionStatus: 'pending' | 'connected' | 'disconnected' | 'error';
  connectionError: string | null;

  // Sync Status
  syncStatus: PrismaSyncStatus;
  lastSyncedAt: Date | null;
  lastSyncError: string | null;
  lastSyncDuration: number | null;
  syncAttempts: number;
  consecutiveFailures: number;
  nextSyncAt: Date | null;

  // Cached Stats
  cachedStats: Record<string, unknown> | null;
  statsUpdatedAt: Date | null;

  // Platform-specific data
  platformData: Record<string, unknown> | null;

  // Preferences
  autoSync: boolean;
  syncPriority: number;

  // Notification Settings
  notifyOnSync: boolean;
  notifyOnError: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Relations (optional, populated when included)
  user?: {
    id: string;
    name: string | null;
    email: string | null;
  };
  platform?: DbPlatform;
}

// =============================================================================
// SIMPLIFIED TYPES (for common use cases)
// =============================================================================

/**
 * Simplified platform connection for UI
 */
export interface PlatformConnection {
  platform: Platform;
  isConnected: boolean;
  username?: string;
  profileUrl?: string;
  lastSyncedAt?: Date;
  syncStatus: SyncStatus;
  connectionStatus: 'pending' | 'connected' | 'disconnected' | 'error';
  cachedStats?: Record<string, unknown>;
  error?: string;
}

/**
 * Platform with connection status for listing
 */
export interface PlatformWithConnection extends Platform {
  connection: UserPlatform | null;
  isConnected: boolean;
}

/**
 * Platform stats summary
 */
export interface PlatformStats {
  platformId: string;
  platformName: string;
  platformSlug: string;
  category: PlatformCategoryId;
  icon?: string;
  color?: string;

  // Counts
  problemsSolved: number;
  commits: number;
  pullRequests: number;
  coursesCompleted: number;
  certificationsEarned: number;
  points: number;

  // Ratings
  currentRating: number | null;
  maxRating: number | null;
  rank: string | null;

  // Streaks
  currentStreak: number;
  longestStreak: number;

  // Activity
  lastActivityDate: Date | null;
  activeDays: number;

  // Platform-specific
  customStats: Record<string, unknown>;
}

/**
 * Platform sync result
 */
export interface PlatformSyncResult {
  platformId: string;
  success: boolean;
  status: SyncStatus;
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsFailed: number;
  duration: number; // milliseconds
  error?: string;
  data?: Record<string, unknown>;
}

/**
 * Platform health check result
 */
export interface PlatformHealthCheck {
  platformId: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  latency: number; // milliseconds
  message?: string;
  lastChecked: Date;
}

// =============================================================================
// INPUT TYPES (for API requests)
// =============================================================================

/**
 * Connect platform input
 */
export interface ConnectPlatformInput {
  platformId: string;
  username?: string;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  credentials?: Record<string, unknown>;
  autoSync?: boolean;
}

/**
 * Update platform connection input
 */
export interface UpdatePlatformConnectionInput {
  username?: string;
  apiKey?: string;
  autoSync?: boolean;
  syncPriority?: number;
  notifyOnSync?: boolean;
  notifyOnError?: boolean;
}

/**
 * Platform search/filter input
 */
export interface PlatformFilterInput {
  category?: PlatformCategoryId;
  authType?: AuthType;
  supportsAutoSync?: boolean;
  isActive?: boolean;
  search?: string;
}

// =============================================================================
// RESPONSE TYPES (for API responses)
// =============================================================================

/**
 * Platform list response
 */
export interface PlatformListResponse {
  platforms: Platform[];
  total: number;
  categories: PlatformCategory[];
}

/**
 * Connected platforms response
 */
export interface ConnectedPlatformsResponse {
  connections: PlatformConnection[];
  total: number;
  lastSyncAt: Date | null;
}

/**
 * Platform sync response
 */
export interface PlatformSyncResponse {
  success: boolean;
  results: PlatformSyncResult[];
  totalDuration: number;
  failedCount: number;
}

// =============================================================================
// CONVERSION UTILITIES
// =============================================================================

/**
 * Convert config category to database enum
 */
export function toDbCategory(category: PlatformCategoryId): PrismaPlatformCategory {
  return CategoryMap[category];
}

/**
 * Convert database enum to config category
 */
export function toConfigCategory(category: PrismaPlatformCategory): PlatformCategoryId {
  return ReverseCategoryMap[category];
}

/**
 * Convert config authType to database enum
 */
export function toDbAuthType(authType: AuthType): PrismaAuthType {
  return AuthTypeMap[authType];
}

/**
 * Convert database enum to config authType
 */
export function toConfigAuthType(authType: PrismaAuthType): AuthType {
  return ReverseAuthTypeMap[authType];
}

/**
 * Convert config syncStatus to database enum
 */
export function toDbSyncStatus(status: SyncStatus): PrismaSyncStatus {
  return SyncStatusMap[status];
}

/**
 * Convert database enum to config syncStatus
 */
export function toConfigSyncStatus(status: PrismaSyncStatus): SyncStatus {
  return ReverseSyncStatusMap[status];
}

/**
 * Convert config Platform to database format
 */
export function configToDbPlatform(config: Platform): Omit<DbPlatform, 'createdAt' | 'updatedAt'> {
  return {
    id: config.id,
    slug: config.slug,
    name: config.name,
    displayName: config.displayName || config.name,
    description: config.description || null,

    category: toDbCategory(config.category),
    subcategory: config.subcategory || null,
    tags: config.tags || [],

    authType: toDbAuthType(config.authType),
    oauthConfig: null,
    apiKeyConfig: null,

    icon: config.icon || null,
    logo: config.logo || null,
    color: config.color || null,
    backgroundColor: config.backgroundColor || null,

    website: config.website || null,
    apiEndpoint: config.apiEndpoint || null,
    profileUrlPattern: config.profileUrlPattern || null,

    supportsAutoSync: config.supportsAutoSync,
    supportsWebhook: config.supportsWebhook || false,
    supportsOAuth: config.authType === 'oauth',
    supportsApiKey: config.authType === 'api' || config.authType === 'api_key',
    requiresCredentials: config.requiresCredentials || false,

    syncPriority: config.syncPriority || 0,
    syncInterval: config.syncInterval || 1440,

    rateLimit: config.rateLimit || null,
    rateLimitWindow: config.rateLimitWindow || null,

    dataPoints: config.dataPoints
      ? config.dataPoints.reduce((acc, dp) => ({ ...acc, [dp]: true }), {} as Record<string, boolean>)
      : null,
    scraperConfig: null,

    isActive: true,
    isVerified: true,
    isBeta: false,
    maintenanceMode: false,
    maintenanceMessage: null,

    lastHealthCheck: null,
    healthStatus: null,
    healthMessage: null,

    totalUsers: 0,
    successRate: 100,
    avgSyncDuration: null,

    setupGuideUrl: null,
    helpArticleUrl: config.helpArticleUrl || null,
  };
}

/**
 * Convert database Platform to config format
 */
export function dbToConfigPlatform(db: DbPlatform): Platform {
  const dataPoints = db.dataPoints
    ? Object.entries(db.dataPoints)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key)
    : [];

  return {
    id: db.id,
    name: db.name,
    slug: db.slug,
    displayName: db.displayName || db.name,

    category: toConfigCategory(db.category),
    subcategory: db.subcategory || undefined,
    tags: db.tags.length > 0 ? db.tags : undefined,

    authType: toConfigAuthType(db.authType),

    icon: db.icon || undefined,
    logo: db.logo || undefined,
    color: db.color || undefined,
    backgroundColor: db.backgroundColor || undefined,

    website: db.website || undefined,
    apiEndpoint: db.apiEndpoint || undefined,
    profileUrlPattern: db.profileUrlPattern || undefined,

    supportsAutoSync: db.supportsAutoSync,
    supportsWebhook: db.supportsWebhook || undefined,
    supportsOAuth: db.supportsOAuth || undefined,
    supportsApiKey: db.supportsApiKey || undefined,
    requiresCredentials: db.requiresCredentials || undefined,

    description: db.description || undefined,
    setupInstructions: undefined,
    helpArticleUrl: db.helpArticleUrl || undefined,

    dataPoints: dataPoints.length > 0 ? dataPoints : undefined,

    syncPriority: db.syncPriority || undefined,
    syncInterval: db.syncInterval || undefined,

    rateLimit: db.rateLimit || undefined,
    rateLimitWindow: db.rateLimitWindow || undefined,
  };
}

/**
 * Convert UserPlatform to PlatformConnection for UI
 */
export function toPlatformConnection(
  userPlatform: UserPlatform,
  platform: Platform
): PlatformConnection {
  return {
    platform,
    isConnected: userPlatform.connectionStatus === 'connected',
    username: userPlatform.username || undefined,
    profileUrl: userPlatform.profileUrl || undefined,
    lastSyncedAt: userPlatform.lastSyncedAt || undefined,
    syncStatus: toConfigSyncStatus(userPlatform.syncStatus),
    connectionStatus: userPlatform.connectionStatus,
    cachedStats: userPlatform.cachedStats || undefined,
    error: userPlatform.lastSyncError || userPlatform.connectionError || undefined,
  };
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if value is a valid PlatformCategoryId
 */
export function isPlatformCategoryId(value: unknown): value is PlatformCategoryId {
  return typeof value === 'string' && value in CategoryMap;
}

/**
 * Check if value is a valid AuthType
 */
export function isAuthType(value: unknown): value is AuthType {
  return typeof value === 'string' && value in AuthTypeMap;
}

/**
 * Check if value is a valid SyncStatus
 */
export function isSyncStatus(value: unknown): value is SyncStatus {
  return typeof value === 'string' && value in SyncStatusMap;
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default Platform;