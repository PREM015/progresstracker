// ===== FILE: src/config/database.ts =====
// Complete database configuration for Prisma, PostgreSQL, and connection pooling
// Optimized for Neon serverless database

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface DatabaseConfig {
  connectionString: string | undefined;
  poolMin: number;
  poolMax: number;
  poolIdleTimeout: number;
  poolConnectionTimeout: number;
  ssl: boolean | object;
  schema: string;
  connectTimeout: number;
  statementTimeout: number;
  idleInTransactionSessionTimeout: number;
}

export interface PrismaConfig {
  log: Array<'query' | 'info' | 'warn' | 'error'>;
  errorFormat: 'minimal' | 'colorless' | 'pretty';
}

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface CacheConfig {
  enabled: boolean;
  defaultTTL: number;
  maxSize: number;
  checkPeriod: number;
}

export interface QueryConfig {
  defaultLimit: number;
  maxLimit: number;
  defaultOffset: number;
  slowQueryThresholdMs: number;
}

// =============================================================================
// ENVIRONMENT DETECTION
// =============================================================================

/** Current environment */
export const NODE_ENV = process.env.NODE_ENV || 'development';

/** Is production environment */
export const IS_PRODUCTION = NODE_ENV === 'production';

/** Is development environment */
export const IS_DEVELOPMENT = NODE_ENV === 'development';

/** Is test environment */
export const IS_TEST = NODE_ENV === 'test';

/** Is serverless environment (Vercel, AWS Lambda, etc.) */
export const IS_SERVERLESS = !!(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NETLIFY
);

// =============================================================================
// DATABASE CONFIGURATION
// =============================================================================

/**
 * Main database configuration
 * Optimized for Neon serverless PostgreSQL
 */
export const DATABASE_CONFIG: DatabaseConfig = {
  // Connection string from environment
  connectionString: process.env.DATABASE_URL,

  // Connection pool settings
  poolMin: IS_SERVERLESS ? 0 : 2,
  poolMax: IS_SERVERLESS ? 5 : 10,
  poolIdleTimeout: IS_SERVERLESS ? 1000 : 10000, // 1s for serverless, 10s otherwise
  poolConnectionTimeout: 10000, // 10 seconds

  // SSL configuration (required for Neon)
  ssl: IS_PRODUCTION ? { rejectUnauthorized: true } : false,

  // Schema
  schema: 'public',

  // Timeouts
  connectTimeout: 10, // seconds
  statementTimeout: 30000, // 30 seconds
  idleInTransactionSessionTimeout: 60000, // 60 seconds
};

/**
 * Direct connection URL (for migrations)
 */
export const DIRECT_DATABASE_URL = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

/**
 * Shadow database URL (for Prisma migrations in production)
 */
export const SHADOW_DATABASE_URL = process.env.SHADOW_DATABASE_URL;

// =============================================================================
// PRISMA CONFIGURATION
// =============================================================================

/**
 * Prisma client configuration
 */
export const PRISMA_CONFIG: PrismaConfig = {
  log: IS_DEVELOPMENT ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: IS_DEVELOPMENT ? 'pretty' : 'minimal',
};

/**
 * Prisma log levels by environment
 */
export const PRISMA_LOG_LEVELS = {
  development: ['query', 'info', 'warn', 'error'] as const,
  production: ['error'] as const,
  test: ['error', 'warn'] as const,
};

/**
 * Get Prisma log levels for current environment
 */
export function getPrismaLogLevels(): Array<'query' | 'info' | 'warn' | 'error'> {
  if (IS_PRODUCTION) return [...PRISMA_LOG_LEVELS.production];
  if (IS_TEST) return [...PRISMA_LOG_LEVELS.test];
  return [...PRISMA_LOG_LEVELS.development];
}

// =============================================================================
// RETRY CONFIGURATION
// =============================================================================

/**
 * Database retry configuration for transient failures
 */
export const RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
  return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const retryableMessages = [
      'connection',
      'timeout',
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'socket hang up',
      'Too many connections',
    ];
    return retryableMessages.some((msg) => error.message.toLowerCase().includes(msg.toLowerCase()));
  }
  return false;
}

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

/**
 * Query cache configuration
 */
export const CACHE_CONFIG: CacheConfig = {
  enabled: IS_PRODUCTION,
  defaultTTL: 60, // 60 seconds
  maxSize: 1000, // Max cached items
  checkPeriod: 120, // Check for expired items every 2 minutes
};

/**
 * Cache TTL by query type (in seconds)
 */
export const CACHE_TTL = {
  platforms: 3600, // 1 hour (rarely changes)
  categories: 3600, // 1 hour
  userProfile: 300, // 5 minutes
  userStats: 60, // 1 minute
  trackerEntries: 30, // 30 seconds
  goals: 60, // 1 minute
  achievements: 300, // 5 minutes
  syncStatus: 10, // 10 seconds
} as const;

/**
 * Get cache TTL for a specific query type
 */
export function getCacheTTL(queryType: keyof typeof CACHE_TTL): number {
  return CACHE_TTL[queryType] ?? CACHE_CONFIG.defaultTTL;
}

// =============================================================================
// QUERY CONFIGURATION
// =============================================================================

/**
 * Default query configuration
 */
export const QUERY_CONFIG: QueryConfig = {
  defaultLimit: 20,
  maxLimit: 100,
  defaultOffset: 0,
  slowQueryThresholdMs: 1000, // Log queries slower than 1 second
};

/**
 * Pagination defaults by entity type
 */
export const PAGINATION_DEFAULTS = {
  platforms: { limit: 50, maxLimit: 100 },
  trackerEntries: { limit: 30, maxLimit: 365 },
  goals: { limit: 20, maxLimit: 50 },
  achievements: { limit: 50, maxLimit: 100 },
  notifications: { limit: 20, maxLimit: 50 },
  syncLogs: { limit: 20, maxLimit: 100 },
  auditLogs: { limit: 50, maxLimit: 200 },
} as const;

/**
 * Get pagination defaults for entity type
 */
export function getPaginationDefaults(
  entityType: keyof typeof PAGINATION_DEFAULTS
): { limit: number; maxLimit: number } {
  return PAGINATION_DEFAULTS[entityType] ?? { limit: QUERY_CONFIG.defaultLimit, maxLimit: QUERY_CONFIG.maxLimit };
}

/**
 * Validate and normalize pagination params
 */
export function normalizePagination(
  params: { page?: number; limit?: number },
  entityType?: keyof typeof PAGINATION_DEFAULTS
): { skip: number; take: number; page: number; limit: number } {
  const defaults = entityType ? getPaginationDefaults(entityType) : { limit: QUERY_CONFIG.defaultLimit, maxLimit: QUERY_CONFIG.maxLimit };

  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(Math.max(1, params.limit ?? defaults.limit), defaults.maxLimit);
  const skip = (page - 1) * limit;

  return { skip, take: limit, page, limit };
}

// =============================================================================
// TRANSACTION CONFIGURATION
// =============================================================================

/**
 * Transaction configuration
 */
export const TRANSACTION_CONFIG = {
  maxWait: 5000, // 5 seconds max wait for transaction slot
  timeout: 10000, // 10 seconds max transaction duration
  isolationLevel: 'ReadCommitted' as const,
};

/**
 * Transaction isolation levels
 */
export const ISOLATION_LEVELS = {
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable',
} as const;

// =============================================================================
// HEALTH CHECK CONFIGURATION
// =============================================================================

/**
 * Health check configuration
 */
export const HEALTH_CHECK_CONFIG = {
  enabled: true,
  interval: 30000, // 30 seconds
  timeout: 5000, // 5 seconds
  unhealthyThreshold: 3, // 3 consecutive failures = unhealthy
  healthyThreshold: 2, // 2 consecutive successes = healthy
};

/**
 * Health check thresholds
 */
export const HEALTH_THRESHOLDS = {
  latencyWarningMs: 500, // Warn if latency > 500ms
  latencyCriticalMs: 2000, // Critical if latency > 2s
  poolUsageWarning: 0.8, // Warn if pool usage > 80%
  poolUsageCritical: 0.95, // Critical if pool usage > 95%
};

// =============================================================================
// PRISMA ERROR CODES
// =============================================================================

/**
 * Prisma error codes reference
 * https://www.prisma.io/docs/reference/api-reference/error-reference
 */
export const PRISMA_ERROR_CODES = {
  // Common errors
  P1000: 'Authentication failed',
  P1001: 'Cannot reach database server',
  P1002: 'Database server timeout',
  P1003: 'Database does not exist',
  P1008: 'Operations timed out',
  P1009: 'Database already exists',
  P1010: 'User denied access',
  P1011: 'Error opening TLS connection',
  P1012: 'Argument missing',
  P1013: 'Invalid database string',
  P1014: 'Model does not exist',
  P1015: 'Unsupported Prisma schema features',
  P1016: 'Incorrect number of parameters',
  P1017: 'Server closed connection',

  // Query errors
  P2000: 'Value too long for column',
  P2001: 'Record not found',
  P2002: 'Unique constraint violation',
  P2003: 'Foreign key constraint violation',
  P2004: 'Constraint failed',
  P2005: 'Invalid value for field',
  P2006: 'Value incompatible with field type',
  P2007: 'Data validation error',
  P2008: 'Failed to parse query',
  P2009: 'Failed to validate query',
  P2010: 'Raw query failed',
  P2011: 'Null constraint violation',
  P2012: 'Missing required value',
  P2013: 'Missing required argument',
  P2014: 'Relation violation',
  P2015: 'Related record not found',
  P2016: 'Query interpretation error',
  P2017: 'Records not connected',
  P2018: 'Connected records not found',
  P2019: 'Input error',
  P2020: 'Value out of range',
  P2021: 'Table does not exist',
  P2022: 'Column does not exist',
  P2023: 'Inconsistent column data',
  P2024: 'Timed out fetching connection',
  P2025: 'Record not found (operation depends on required record)',
  P2026: 'Unsupported feature',
  P2027: 'Multiple errors during query execution',

  // Migration errors
  P3000: 'Failed to create database',
  P3001: 'Migration with destructive changes',
  P3002: 'Migration rolled back',
  P3003: 'Format of migrations changed',
  P3004: 'Database not empty',
  P3005: 'Schema not empty',
  P3006: 'Migration failed to apply',
  P3007: 'Requested preview features not allowed',
  P3008: 'Migration already recorded',
  P3009: 'Migrate failed in non-empty schema',
  P3010: 'Migration name too long',
  P3011: 'Migration not found',
  P3012: 'Migration not in failed state',
  P3013: 'Datasource provider arrays not supported',
  P3014: 'Shadow database could not be created',
  P3015: 'Migration file could not be found',
  P3016: 'Database reset not possible',
  P3017: 'Migration not found in migration list',
  P3018: 'Migration failed to apply',
  P3019: 'Datasource provider mismatch',
  P3020: 'Azure SQL shadow database disabled',

  // Introspection errors
  P4000: 'Introspection operation failed',
  P4001: 'Introspected database empty',
  P4002: 'Inconsistent schema',
} as const;

/**
 * Get error message for Prisma error code
 */
export function getPrismaErrorMessage(code: string): string {
  return PRISMA_ERROR_CODES[code as keyof typeof PRISMA_ERROR_CODES] ?? 'Unknown database error';
}

/**
 * Check if error code is retryable
 */
export function isRetryablePrismaError(code: string): boolean {
  const retryableCodes = ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'];
  return retryableCodes.includes(code);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Build connection string with parameters
 */
export function buildConnectionString(
  baseUrl: string,
  params?: Record<string, string | number | boolean>
): string {
  if (!params || Object.keys(params).length === 0) return baseUrl;

  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  return url.toString();
}

/**
 * Parse connection string into components
 */
export function parseConnectionString(connectionString: string): {
  host: string;
  port: number;
  database: string;
  user: string;
  ssl: boolean;
} | null {
  try {
    const url = new URL(connectionString);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1),
      user: url.username,
      ssl: url.searchParams.get('sslmode') !== 'disable',
    };
  } catch {
    return null;
  }
}

/**
 * Mask sensitive parts of connection string for logging
 */
export function maskConnectionString(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    if (url.password) {
      url.password = '****';
    }
    return url.toString();
  } catch {
    return '****';
  }
}

/**
 * Validate database configuration
 */
export function validateDatabaseConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!DATABASE_CONFIG.connectionString) {
    errors.push('DATABASE_URL environment variable is not set');
  }

  if (DATABASE_CONFIG.poolMax < DATABASE_CONFIG.poolMin) {
    errors.push('poolMax must be greater than or equal to poolMin');
  }

  if (DATABASE_CONFIG.connectTimeout <= 0) {
    errors.push('connectTimeout must be positive');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get database configuration summary for logging
 */
export function getDatabaseConfigSummary(): Record<string, unknown> {
  return {
    environment: NODE_ENV,
    isServerless: IS_SERVERLESS,
    poolMin: DATABASE_CONFIG.poolMin,
    poolMax: DATABASE_CONFIG.poolMax,
    ssl: !!DATABASE_CONFIG.ssl,
    connectTimeout: DATABASE_CONFIG.connectTimeout,
    hasConnectionString: !!DATABASE_CONFIG.connectionString,
    connectionStringMasked: DATABASE_CONFIG.connectionString
      ? maskConnectionString(DATABASE_CONFIG.connectionString)
      : null,
  };
}

// =============================================================================
// EXPORTS SUMMARY
// =============================================================================

/**
 * This module exports:
 *
 * ENVIRONMENT:
 * - NODE_ENV, IS_PRODUCTION, IS_DEVELOPMENT, IS_TEST, IS_SERVERLESS
 *
 * DATABASE CONFIG:
 * - DATABASE_CONFIG: Main database configuration
 * - DIRECT_DATABASE_URL: For migrations
 * - SHADOW_DATABASE_URL: For Prisma shadow database
 *
 * PRISMA CONFIG:
 * - PRISMA_CONFIG: Prisma client configuration
 * - PRISMA_LOG_LEVELS: Log levels by environment
 * - getPrismaLogLevels(): Get current log levels
 *
 * RETRY CONFIG:
 * - RETRY_CONFIG: Retry settings
 * - calculateRetryDelay(): Calculate backoff delay
 * - isRetryableError(): Check if error can be retried
 *
 * CACHE CONFIG:
 * - CACHE_CONFIG: Cache settings
 * - CACHE_TTL: TTL by query type
 * - getCacheTTL(): Get TTL for query type
 *
 * QUERY CONFIG:
 * - QUERY_CONFIG: Query defaults
 * - PAGINATION_DEFAULTS: Pagination by entity
 * - getPaginationDefaults(): Get pagination for entity
 * - normalizePagination(): Validate pagination params
 *
 * TRANSACTION CONFIG:
 * - TRANSACTION_CONFIG: Transaction settings
 * - ISOLATION_LEVELS: Available isolation levels
 *
 * HEALTH CHECK:
 * - HEALTH_CHECK_CONFIG: Health check settings
 * - HEALTH_THRESHOLDS: Warning/critical thresholds
 *
 * ERROR CODES:
 * - PRISMA_ERROR_CODES: Error code reference
 * - getPrismaErrorMessage(): Get message for code
 * - isRetryablePrismaError(): Check if retryable
 *
 * HELPERS:
 * - buildConnectionString(): Build URL with params
 * - parseConnectionString(): Parse URL components
 * - maskConnectionString(): Mask for logging
 * - validateDatabaseConfig(): Validate config
 * - getDatabaseConfigSummary(): Get summary for logs
 */

export default DATABASE_CONFIG;