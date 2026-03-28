// ============================================================================
// FILE: src/config/cache.ts
// PURPOSE: Cache configuration for Redis and in-memory caching
// ============================================================================

// =============================================================================
// ENVIRONMENT
// =============================================================================

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const IS_DEVELOPMENT = NODE_ENV === 'development';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface CacheConfig {
  redis: RedisConfig;
  memory: MemoryCacheConfig;
  ttl: TTLConfig;
  prefixes: CachePrefixes;
  options: CacheOptions;
}

export interface RedisConfig {
  url: string | undefined;
  token: string | undefined;
  enabled: boolean;
  maxRetries: number;
  retryDelayMs: number;
  connectTimeoutMs: number;
  commandTimeoutMs: number;
}

export interface MemoryCacheConfig {
  enabled: boolean;
  maxSize: number;
  maxAge: number;
  checkPeriod: number;
  updateAgeOnGet: boolean;
}

export interface TTLConfig {
  // User data
  user: number;
  userProfile: number;
  userSettings: number;
  userStats: number;

  // Session data
  session: number;
  activeSession: number;

  // Platform data
  platforms: number;
  userPlatforms: number;
  platformHealth: number;

  // Tracker data
  trackerEntries: number;
  dailyStats: number;
  heatmap: number;

  // Goals & Achievements
  goals: number;
  achievements: number;
  userAchievements: number;

  // Leaderboard
  leaderboard: number;
  leaderboardGlobal: number;

  // Analytics
  analytics: number;
  reports: number;

  // Sync
  syncStatus: number;
  syncLogs: number;

  // Feature flags
  featureFlags: number;

  // System
  systemSettings: number;
  maintenance: number;

  // API
  apiRateLimit: number;
  apiKeyValidation: number;

  // Short-lived
  otp: number;
  magicLink: number;
  passwordReset: number;
  emailVerification: number;

  // Default
  default: number;
}

export interface CachePrefixes {
  user: string;
  session: string;
  platform: string;
  tracker: string;
  goals: string;
  achievements: string;
  stats: string;
  leaderboard: string;
  analytics: string;
  sync: string;
  notifications: string;
  featureFlags: string;
  apiKey: string;
  rateLimit: string;
  system: string;
  temp: string;
}

export interface CacheOptions {
  compression: boolean;
  compressionThreshold: number;
  serialization: 'json' | 'msgpack';
  hashKeys: boolean;
  enableStats: boolean;
  warmupOnStart: boolean;
}

// =============================================================================
// REDIS CONFIGURATION
// =============================================================================

export const REDIS_CONFIG: RedisConfig = {
  /** Upstash Redis REST URL */
  url: process.env.UPSTASH_REDIS_REST_URL,

  /** Upstash Redis REST Token */
  token: process.env.UPSTASH_REDIS_REST_TOKEN,

  /** Enable Redis caching */
  enabled: !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN &&
    !process.env.UPSTASH_REDIS_REST_URL.includes('your-upstash')
  ),

  /** Maximum retry attempts */
  maxRetries: 3,

  /** Delay between retries in ms */
  retryDelayMs: 1000,

  /** Connection timeout in ms */
  connectTimeoutMs: 5000,

  /** Command timeout in ms */
  commandTimeoutMs: 3000,
};

// =============================================================================
// MEMORY CACHE CONFIGURATION
// =============================================================================

export const MEMORY_CACHE_CONFIG: MemoryCacheConfig = {
  /** Enable in-memory cache (fallback when Redis unavailable) */
  enabled: true,

  /** Maximum number of items in cache */
  maxSize: 1000,

  /** Default max age in seconds */
  maxAge: 300, // 5 minutes

  /** Check period for expired items in seconds */
  checkPeriod: 60,

  /** Update item age on get */
  updateAgeOnGet: false,
};

// =============================================================================
// TTL CONFIGURATION (in seconds)
// =============================================================================

export const TTL_CONFIG: TTLConfig = {
  // User data
  user: 300,              // 5 minutes
  userProfile: 300,       // 5 minutes
  userSettings: 600,      // 10 minutes
  userStats: 60,          // 1 minute

  // Session data
  session: 3600,          // 1 hour
  activeSession: 1800,    // 30 minutes

  // Platform data
  platforms: 3600,        // 1 hour (rarely changes)
  userPlatforms: 300,     // 5 minutes
  platformHealth: 60,     // 1 minute

  // Tracker data
  trackerEntries: 30,     // 30 seconds
  dailyStats: 60,         // 1 minute
  heatmap: 300,           // 5 minutes

  // Goals & Achievements
  goals: 60,              // 1 minute
  achievements: 300,      // 5 minutes
  userAchievements: 300,  // 5 minutes

  // Leaderboard
  leaderboard: 60,        // 1 minute
  leaderboardGlobal: 300, // 5 minutes

  // Analytics
  analytics: 300,         // 5 minutes
  reports: 600,           // 10 minutes

  // Sync
  syncStatus: 10,         // 10 seconds
  syncLogs: 60,           // 1 minute

  // Feature flags
  featureFlags: 60,       // 1 minute

  // System
  systemSettings: 300,    // 5 minutes
  maintenance: 30,        // 30 seconds

  // API
  apiRateLimit: 60,       // 1 minute
  apiKeyValidation: 300,  // 5 minutes

  // Short-lived
  otp: 300,               // 5 minutes
  magicLink: 900,         // 15 minutes
  passwordReset: 3600,    // 1 hour
  emailVerification: 86400, // 24 hours

  // Default
  default: 300,           // 5 minutes
};

// =============================================================================
// CACHE PREFIXES
// =============================================================================

export const CACHE_PREFIXES: CachePrefixes = {
  user: 'user',
  session: 'session',
  platform: 'platform',
  tracker: 'tracker',
  goals: 'goals',
  achievements: 'achievements',
  stats: 'stats',
  leaderboard: 'leaderboard',
  analytics: 'analytics',
  sync: 'sync',
  notifications: 'notifications',
  featureFlags: 'ff',
  apiKey: 'apikey',
  rateLimit: 'rl',
  system: 'sys',
  temp: 'tmp',
};

// =============================================================================
// CACHE OPTIONS
// =============================================================================

export const CACHE_OPTIONS: CacheOptions = {
  /** Enable compression for large values */
  compression: IS_PRODUCTION,

  /** Minimum size in bytes before compression */
  compressionThreshold: 1024, // 1KB

  /** Serialization format */
  serialization: 'json',

  /** Hash long keys */
  hashKeys: false,

  /** Enable cache statistics */
  enableStats: IS_DEVELOPMENT,

  /** Warm up cache on server start */
  warmupOnStart: IS_PRODUCTION,
};

// =============================================================================
// CACHE KEY BUILDERS
// =============================================================================

export const CACHE_KEYS = {
  // User keys
  user: (userId: string) => `${CACHE_PREFIXES.user}:${userId}`,
  userProfile: (userId: string) => `${CACHE_PREFIXES.user}:profile:${userId}`,
  userSettings: (userId: string) => `${CACHE_PREFIXES.user}:settings:${userId}`,
  userStats: (userId: string) => `${CACHE_PREFIXES.stats}:user:${userId}`,

  // Session keys
  session: (sessionId: string) => `${CACHE_PREFIXES.session}:${sessionId}`,
  activeSession: (userId: string) => `${CACHE_PREFIXES.session}:active:${userId}`,
  sessionUser: (userId: string) => `${CACHE_PREFIXES.session}:user:${userId}`,

  // Platform keys
  platforms: () => `${CACHE_PREFIXES.platform}:all`,
  platformBySlug: (slug: string) => `${CACHE_PREFIXES.platform}:slug:${slug}`,
  platformCategories: () => `${CACHE_PREFIXES.platform}:categories`,
  userPlatforms: (userId: string) => `${CACHE_PREFIXES.platform}:user:${userId}`,
  platformHealth: (platformId: string) => `${CACHE_PREFIXES.platform}:health:${platformId}`,

  // Tracker keys
  trackerEntries: (userId: string, date?: string) =>
    date
      ? `${CACHE_PREFIXES.tracker}:entries:${userId}:${date}`
      : `${CACHE_PREFIXES.tracker}:entries:${userId}`,
  trackerDashboard: (userId: string) => `${CACHE_PREFIXES.tracker}:dashboard:${userId}`,
  dailyStats: (userId: string, date: string) => `${CACHE_PREFIXES.stats}:daily:${userId}:${date}`,
  heatmap: (userId: string, year?: number) =>
    year
      ? `${CACHE_PREFIXES.stats}:heatmap:${userId}:${year}`
      : `${CACHE_PREFIXES.stats}:heatmap:${userId}`,

  // Goals keys
  goals: (userId: string) => `${CACHE_PREFIXES.goals}:${userId}`,
  goalById: (goalId: string) => `${CACHE_PREFIXES.goals}:id:${goalId}`,
  goalsActive: (userId: string) => `${CACHE_PREFIXES.goals}:active:${userId}`,
  goalsStats: (userId: string) => `${CACHE_PREFIXES.goals}:stats:${userId}`,

  // Achievement keys
  achievements: () => `${CACHE_PREFIXES.achievements}:all`,
  achievementBySlug: (slug: string) => `${CACHE_PREFIXES.achievements}:slug:${slug}`,
  userAchievements: (userId: string) => `${CACHE_PREFIXES.achievements}:user:${userId}`,
  achievementProgress: (userId: string) => `${CACHE_PREFIXES.achievements}:progress:${userId}`,

  // Leaderboard keys
  leaderboard: (type: string, period?: string) =>
    period
      ? `${CACHE_PREFIXES.leaderboard}:${type}:${period}`
      : `${CACHE_PREFIXES.leaderboard}:${type}`,
  leaderboardRank: (userId: string) => `${CACHE_PREFIXES.leaderboard}:rank:${userId}`,

  // Stats keys
  statsOverview: (userId: string) => `${CACHE_PREFIXES.stats}:overview:${userId}`,
  statsSummary: (userId: string) => `${CACHE_PREFIXES.stats}:summary:${userId}`,
  statsWeekly: (userId: string) => `${CACHE_PREFIXES.stats}:weekly:${userId}`,
  statsMonthly: (userId: string) => `${CACHE_PREFIXES.stats}:monthly:${userId}`,
  statsPlatform: (userId: string, platformId: string) =>
    `${CACHE_PREFIXES.stats}:platform:${userId}:${platformId}`,

  // Analytics keys
  analytics: (userId: string, type: string) => `${CACHE_PREFIXES.analytics}:${type}:${userId}`,
  report: (reportId: string) => `${CACHE_PREFIXES.analytics}:report:${reportId}`,

  // Sync keys
  syncStatus: (userId: string) => `${CACHE_PREFIXES.sync}:status:${userId}`,
  syncPlatform: (userId: string, platformId: string) =>
    `${CACHE_PREFIXES.sync}:platform:${userId}:${platformId}`,
  syncLock: (userId: string, platformId: string) =>
    `${CACHE_PREFIXES.sync}:lock:${userId}:${platformId}`,

  // Notification keys
  notifications: (userId: string) => `${CACHE_PREFIXES.notifications}:${userId}`,
  notificationCount: (userId: string) => `${CACHE_PREFIXES.notifications}:count:${userId}`,
  notificationPrefs: (userId: string) => `${CACHE_PREFIXES.notifications}:prefs:${userId}`,

  // Feature flag keys
  featureFlag: (key: string) => `${CACHE_PREFIXES.featureFlags}:${key}`,
  featureFlagsAll: () => `${CACHE_PREFIXES.featureFlags}:all`,
  featureFlagsUser: (userId: string) => `${CACHE_PREFIXES.featureFlags}:user:${userId}`,

  // API key keys
  apiKey: (keyHash: string) => `${CACHE_PREFIXES.apiKey}:${keyHash}`,
  apiKeyUser: (userId: string) => `${CACHE_PREFIXES.apiKey}:user:${userId}`,

  // Rate limit keys
  rateLimit: (identifier: string, action: string) =>
    `${CACHE_PREFIXES.rateLimit}:${action}:${identifier}`,
  rateLimitUser: (userId: string, action: string) =>
    `${CACHE_PREFIXES.rateLimit}:${action}:user:${userId}`,
  rateLimitIp: (ip: string, action: string) =>
    `${CACHE_PREFIXES.rateLimit}:${action}:ip:${ip}`,

  // System keys
  systemSettings: (key?: string) =>
    key
      ? `${CACHE_PREFIXES.system}:settings:${key}`
      : `${CACHE_PREFIXES.system}:settings`,
  maintenance: () => `${CACHE_PREFIXES.system}:maintenance`,
  healthCheck: () => `${CACHE_PREFIXES.system}:health`,

  // Temp keys
  temp: (key: string) => `${CACHE_PREFIXES.temp}:${key}`,
  otp: (userId: string) => `${CACHE_PREFIXES.temp}:otp:${userId}`,
  magicLink: (token: string) => `${CACHE_PREFIXES.temp}:magic:${token}`,
  passwordReset: (token: string) => `${CACHE_PREFIXES.temp}:pwreset:${token}`,
  emailVerification: (token: string) => `${CACHE_PREFIXES.temp}:emailverify:${token}`,
};

// =============================================================================
// CACHE INVALIDATION PATTERNS
// =============================================================================

export const INVALIDATION_PATTERNS = {
  /** Invalidate all user-related caches */
  user: (userId: string) => [
    CACHE_KEYS.user(userId),
    CACHE_KEYS.userProfile(userId),
    CACHE_KEYS.userSettings(userId),
    CACHE_KEYS.userStats(userId),
    CACHE_KEYS.sessionUser(userId),
  ],

  /** Invalidate all stats caches for a user */
  stats: (userId: string) => [
    CACHE_KEYS.userStats(userId),
    CACHE_KEYS.statsOverview(userId),
    CACHE_KEYS.statsSummary(userId),
    CACHE_KEYS.statsWeekly(userId),
    CACHE_KEYS.statsMonthly(userId),
    CACHE_KEYS.heatmap(userId),
    CACHE_KEYS.trackerDashboard(userId),
  ],

  /** Invalidate goals caches */
  goals: (userId: string) => [
    CACHE_KEYS.goals(userId),
    CACHE_KEYS.goalsActive(userId),
    CACHE_KEYS.goalsStats(userId),
  ],

  /** Invalidate achievement caches */
  achievements: (userId: string) => [
    CACHE_KEYS.userAchievements(userId),
    CACHE_KEYS.achievementProgress(userId),
  ],

  /** Invalidate leaderboard caches */
  leaderboard: () => [
    CACHE_KEYS.leaderboard('global'),
    CACHE_KEYS.leaderboard('weekly'),
    CACHE_KEYS.leaderboard('monthly'),
    CACHE_KEYS.leaderboard('streak'),
  ],

  /** Invalidate sync caches */
  sync: (userId: string) => [
    CACHE_KEYS.syncStatus(userId),
    CACHE_KEYS.userPlatforms(userId),
  ],

  /** Invalidate all tracker entry caches */
  trackerEntry: (userId: string) => [
    CACHE_KEYS.trackerEntries(userId),
    CACHE_KEYS.trackerDashboard(userId),
    ...INVALIDATION_PATTERNS.stats(userId),
  ],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get TTL for cache type */
export function getTTL(type: keyof TTLConfig): number {
  return TTL_CONFIG[type] ?? TTL_CONFIG.default;
}

/** Check if Redis is available */
export function isRedisAvailable(): boolean {
  return REDIS_CONFIG.enabled;
}

/** Get cache key with namespace */
export function getNamespacedKey(namespace: string, key: string): string {
  const appPrefix = process.env.CACHE_PREFIX || 'pt';
  return `${appPrefix}:${namespace}:${key}`;
}

/** Parse cache key */
export function parseKey(fullKey: string): { namespace: string; key: string } | null {
  const parts = fullKey.split(':');
  if (parts.length < 3) return null;
  return {
    namespace: parts[1],
    key: parts.slice(2).join(':'),
  };
}

/** Calculate expiry timestamp */
export function getExpiryTimestamp(ttlSeconds: number): number {
  return Date.now() + ttlSeconds * 1000;
}

/** Check if cache entry is expired */
export function isExpired(expiryTimestamp: number): boolean {
  return Date.now() > expiryTimestamp;
}

/** Validate cache configuration */
export function validateCacheConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!REDIS_CONFIG.enabled) {
    warnings.push('Redis is not configured, using in-memory cache only');
  }

  if (REDIS_CONFIG.enabled && !REDIS_CONFIG.url) {
    errors.push('UPSTASH_REDIS_REST_URL is required when Redis is enabled');
  }

  if (REDIS_CONFIG.enabled && !REDIS_CONFIG.token) {
    errors.push('UPSTASH_REDIS_REST_TOKEN is required when Redis is enabled');
  }

  if (MEMORY_CACHE_CONFIG.maxSize < 100) {
    warnings.push('Memory cache max size is very low');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/** Get cache configuration summary */
export function getCacheConfigSummary(): Record<string, unknown> {
  return {
    redisEnabled: REDIS_CONFIG.enabled,
    redisUrl: REDIS_CONFIG.url ? '***configured***' : 'not configured',
    memoryCacheEnabled: MEMORY_CACHE_CONFIG.enabled,
    memoryCacheMaxSize: MEMORY_CACHE_CONFIG.maxSize,
    defaultTTL: TTL_CONFIG.default,
    compression: CACHE_OPTIONS.compression,
  };
}

// =============================================================================
// COMBINED CONFIG EXPORT
// =============================================================================

export const CACHE_CONFIG: CacheConfig = {
  redis: REDIS_CONFIG,
  memory: MEMORY_CACHE_CONFIG,
  ttl: TTL_CONFIG,
  prefixes: CACHE_PREFIXES,
  options: CACHE_OPTIONS,
};

export default CACHE_CONFIG;