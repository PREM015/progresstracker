// ============================================================================
// FILE: config/api.ts
// PURPOSE: API configuration and settings
// ============================================================================

import type { ErrorCode } from '@/types/api';

// =============================================================================
// VERSION CONFIGURATION
// =============================================================================

/** Current API version */
export const API_VERSION = 'v1';

/** API version history */
export const API_VERSIONS = {
  v1: {
    version: 'v1',
    releaseDate: '2024-01-01',
    deprecated: false,
    deprecationDate: null,
    sunsetDate: null,
    baseUrl: '/api/v1',
  },
} as const;

/** Get current API base URL */
export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/${API_VERSION}`;
}

// =============================================================================
// RATE LIMITING CONFIGURATION
// =============================================================================

/** Rate limit tiers */
export const RATE_LIMITS = {
  /** Default rate limit for unauthenticated requests */
  default: {
    requests: 100,
    window: 60, // 1 minute
    message: 'Too many requests from this IP, please try again later.',
  },
  
  /** Rate limit for authenticated users */
  authenticated: {
    requests: 500,
    window: 60, // 1 minute
    message: 'Rate limit exceeded, please slow down.',
  },
  
  /** Rate limit for premium/pro users */
  premium: {
    requests: 1000,
    window: 60, // 1 minute
    message: 'Premium rate limit exceeded.',
  },
  
  /** Rate limit for team/enterprise users */
  enterprise: {
    requests: 5000,
    window: 60, // 1 minute
    message: 'Enterprise rate limit exceeded.',
  },
  
  /** Rate limit for admin users */
  admin: {
    requests: 10000,
    window: 60, // 1 minute
    message: 'Admin rate limit exceeded.',
  },
  
  /** Special limits for specific operations */
  auth: {
    requests: 5,
    window: 300, // 5 minutes
    message: 'Too many authentication attempts, please try again later.',
  },
  
  sync: {
    requests: 10,
    window: 3600, // 1 hour
    message: 'Sync rate limit exceeded, please wait before syncing again.',
  },
  
  export: {
    requests: 5,
    window: 3600, // 1 hour
    message: 'Export rate limit exceeded, please try again later.',
  },
  
  webhook: {
    requests: 100,
    window: 60, // 1 minute
    message: 'Webhook rate limit exceeded.',
  },
} as const;

/** Rate limit window in seconds (default) */
export const RATE_LIMIT_WINDOW = 60; // 1 minute

/** Get rate limit for user tier */
export function getRateLimitForTier(tier?: 'free' | 'starter' | 'pro' | 'team' | 'enterprise'): {
  requests: number;
  window: number;
} {
  switch (tier) {
    case 'starter':
      return RATE_LIMITS.authenticated;
    case 'pro':
      return RATE_LIMITS.premium;
    case 'team':
    case 'enterprise':
      return RATE_LIMITS.enterprise;
    case 'free':
    default:
      return RATE_LIMITS.default;
  }
}

// =============================================================================
// API KEY CONFIGURATION
// =============================================================================

/** API key scopes/permissions */
export const API_KEY_SCOPES = {
  // Read operations
  'read:profile': 'Read user profile',
  'read:platforms': 'Read platform data',
  'read:tracker': 'Read tracker entries',
  'read:goals': 'Read goals',
  'read:achievements': 'Read achievements',
  'read:analytics': 'Read analytics data',
  'read:streak': 'Read streak data',
  
  // Write operations
  'write:profile': 'Update user profile',
  'write:platforms': 'Manage platform connections',
  'write:tracker': 'Create/update tracker entries',
  'write:goals': 'Manage goals',
  'write:settings': 'Update settings',
  
  // Delete operations
  'delete:platforms': 'Delete platform connections',
  'delete:tracker': 'Delete tracker entries',
  'delete:goals': 'Delete goals',
  
  // Special operations
  'sync:trigger': 'Trigger platform sync',
  'export:create': 'Create data exports',
  'webhook:manage': 'Manage webhooks',
  
  // Admin operations
  'admin:read': 'Read admin data',
  'admin:write': 'Write admin data',
  'admin:users': 'Manage users',
  'admin:system': 'System administration',
} as const;

export type ApiKeyScope = keyof typeof API_KEY_SCOPES;

/** Default scopes for new API keys */
export const DEFAULT_API_KEY_SCOPES: ApiKeyScope[] = [
  'read:profile',
  'read:platforms',
  'read:tracker',
  'read:goals',
  'read:achievements',
  'read:analytics',
  'read:streak',
];

/** Admin-only scopes */
export const ADMIN_ONLY_SCOPES: ApiKeyScope[] = [
  'admin:read',
  'admin:write',
  'admin:users',
  'admin:system',
];

/** Get scope description */
export function getScopeDescription(scope: ApiKeyScope): string {
  return API_KEY_SCOPES[scope];
}

/** Check if scope requires admin */
export function isAdminScope(scope: ApiKeyScope): boolean {
  return ADMIN_ONLY_SCOPES.includes(scope);
}

// =============================================================================
// PAGINATION CONFIGURATION
// =============================================================================

/** Pagination defaults */
export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
  minLimit: 1,
} as const;

/** Pagination limits by resource type */
export const PAGINATION_LIMITS = {
  default: { min: 1, max: 100, default: 20 },
  users: { min: 1, max: 50, default: 20 },
  platforms: { min: 1, max: 50, default: 25 },
  tracker: { min: 1, max: 100, default: 50 },
  goals: { min: 1, max: 50, default: 20 },
  achievements: { min: 1, max: 100, default: 50 },
  notifications: { min: 1, max: 50, default: 25 },
  logs: { min: 1, max: 200, default: 100 },
  exports: { min: 1, max: 20, default: 10 },
} as const;

/** Get pagination limits for resource */
export function getPaginationLimits(resource?: string): {
  min: number;
  max: number;
  default: number;
} {
  const key = resource as keyof typeof PAGINATION_LIMITS;
  return PAGINATION_LIMITS[key] || PAGINATION_LIMITS.default;
}

/** Validate and normalize pagination params */
export function normalizePaginationParams(
  page?: number | string,
  limit?: number | string,
  resource?: string
): { page: number; limit: number; offset: number } {
  const limits = getPaginationLimits(resource);
  
  const normalizedPage = Math.max(1, Number(page) || PAGINATION_DEFAULTS.page);
  const normalizedLimit = Math.min(
    limits.max,
    Math.max(limits.min, Number(limit) || limits.default)
  );
  const offset = (normalizedPage - 1) * normalizedLimit;
  
  return {
    page: normalizedPage,
    limit: normalizedLimit,
    offset,
  };
}

// =============================================================================
// CORS CONFIGURATION
// =============================================================================

/** Allowed CORS origins */
export const CORS_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'https://app.progresstracker.com',
  'https://progresstracker.com',
  'https://api.progresstracker.com',
  ...(process.env.CORS_ALLOWED_ORIGINS?.split(',') || []),
].filter(Boolean);

/** CORS configuration */
export const CORS_CONFIG = {
  origins: CORS_ORIGINS,
  credentials: true,
  maxAge: 86400, // 24 hours
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-API-Key',
    'X-API-Version',
    'X-Client-Version',
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-API-Version',
  ],
} as const;

/** Check if origin is allowed */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  
  // Allow localhost in development
  if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
    return true;
  }
  
  return CORS_ORIGINS.includes(origin);
}

// =============================================================================
// REQUEST CONFIGURATION
// =============================================================================

/** Request timeout in milliseconds */
export const REQUEST_TIMEOUT = {
  default: 30000, // 30 seconds
  short: 10000, // 10 seconds
  medium: 30000, // 30 seconds
  long: 60000, // 60 seconds
  sync: 300000, // 5 minutes
  export: 600000, // 10 minutes
} as const;

/** Max request body size */
export const MAX_REQUEST_SIZE = {
  default: '10mb',
  json: '5mb',
  file: '50mb',
  image: '10mb',
  export: '100mb',
} as const;

/** Request headers */
export const REQUEST_HEADERS = {
  requestId: 'X-Request-ID',
  apiKey: 'X-API-Key',
  apiVersion: 'X-API-Version',
  clientVersion: 'X-Client-Version',
  userAgent: 'User-Agent',
  contentType: 'Content-Type',
  authorization: 'Authorization',
} as const;

// =============================================================================
// RESPONSE CONFIGURATION
// =============================================================================

/** Response cache configuration */
export const CACHE_CONFIG = {
  // Cache TTL in seconds
  ttl: {
    none: 0,
    short: 60, // 1 minute
    medium: 300, // 5 minutes
    long: 3600, // 1 hour
    day: 86400, // 24 hours
  },
  
  // Cache control headers
  headers: {
    public: 'public, max-age=300, s-maxage=600',
    private: 'private, max-age=0, must-revalidate',
    noCache: 'no-cache, no-store, must-revalidate',
    immutable: 'public, max-age=31536000, immutable',
  },
} as const;

/** Response compression */
export const COMPRESSION_CONFIG = {
  enabled: true,
  threshold: 1024, // 1KB
  level: 6, // 0-9, where 9 is maximum compression
} as const;

// =============================================================================
// ERROR CONFIGURATION
// =============================================================================

/** Error messages */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Client errors
  BAD_REQUEST: 'Invalid request parameters',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  METHOD_NOT_ALLOWED: 'Method not allowed',
  CONFLICT: 'Resource conflict',
  UNPROCESSABLE_ENTITY: 'Unprocessable entity',
  TOO_MANY_REQUESTS: 'Too many requests',
  VALIDATION_ERROR: 'Validation failed',
  
  // Server errors
  INTERNAL_ERROR: 'Internal server error',
  NOT_IMPLEMENTED: 'Feature not implemented',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  GATEWAY_TIMEOUT: 'Gateway timeout',
  
  // Custom errors
  DATABASE_ERROR: 'Database operation failed',
  AUTHENTICATION_ERROR: 'Authentication failed',
  AUTHORIZATION_ERROR: 'Authorization failed',
  SYNC_ERROR: 'Sync operation failed',
  PLATFORM_ERROR: 'Platform operation failed',
  RATE_LIMIT_ERROR: 'Rate limit exceeded',
  EXPORT_ERROR: 'Export operation failed',
} as const;

/** Get error message */
export function getErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] || 'An unexpected error occurred';
}

// =============================================================================
// SECURITY CONFIGURATION
// =============================================================================

/** Security headers */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
} as const;

/** API key configuration */
export const API_KEY_CONFIG = {
  prefix: 'pk_', // Prefix for API keys
  length: 32, // Length of random part
  hashAlgorithm: 'sha256',
  expirationDays: 365, // Default expiration
  maxKeysPerUser: 10,
} as const;

// =============================================================================
// MONITORING & LOGGING
// =============================================================================

/** Monitoring configuration */
export const MONITORING_CONFIG = {
  enabled: process.env.NODE_ENV === 'production',
  sampleRate: 0.1, // 10% sampling
  slowRequestThreshold: 3000, // 3 seconds
  errorTracking: true,
  performanceTracking: true,
  userTracking: false,
} as const;

/** Logging levels */
export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
} as const;

export type LogLevel = keyof typeof LOG_LEVELS;

/** Get current log level */
export function getLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL as LogLevel;
  return level || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
}

// =============================================================================
// ENVIRONMENT CONFIGURATION
// =============================================================================

/** API environment configuration */
export const ENV_CONFIG = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isStaging: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  
  // Feature flags
  features: {
    rateLimit: process.env.ENABLE_RATE_LIMIT !== 'false',
    cors: process.env.ENABLE_CORS !== 'false',
    compression: process.env.ENABLE_COMPRESSION !== 'false',
    caching: process.env.ENABLE_CACHING !== 'false',
    monitoring: process.env.ENABLE_MONITORING !== 'false',
    apiKeys: process.env.ENABLE_API_KEYS !== 'false',
    webhooks: process.env.ENABLE_WEBHOOKS !== 'false',
  },
  
  // URLs
  urls: {
    app: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    api: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    docs: process.env.DOCS_URL || 'https://docs.progresstracker.com',
  },
} as const;

// =============================================================================
// VALIDATION CONFIGURATION
// =============================================================================

/** Validation rules */
export const VALIDATION_RULES = {
  // String lengths
  username: { min: 3, max: 30 },
  password: { min: 8, max: 100 },
  email: { max: 255 },
  apiKey: { length: 32 },
  
  // Numbers
  pagination: {
    page: { min: 1, max: 10000 },
    limit: { min: 1, max: 100 },
  },
  
  // Patterns
  patterns: {
    username: /^[a-zA-Z0-9_-]+$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    apiKey: /^pk_[a-zA-Z0-9]{32}$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  },
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Generate API key */
export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = API_KEY_CONFIG.prefix;
  
  for (let i = 0; i < API_KEY_CONFIG.length; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return key;
}

/** Hash API key */
export async function hashApiKey(key: string): Promise<string> {
  const crypto = await import('crypto');
  return crypto
    .createHash(API_KEY_CONFIG.hashAlgorithm)
    .update(key)
    .digest('hex');
}

/** Validate API key format */
export function isValidApiKey(key: string): boolean {
  return VALIDATION_RULES.patterns.apiKey.test(key);
}

/** Get API endpoint URL */
export function getApiEndpoint(path: string, version: string = API_VERSION): string {
  const baseUrl = ENV_CONFIG.urls.api;
  const versionPath = `/api/${version}`;
  return `${baseUrl}${versionPath}${path}`;
}

/** Check if feature is enabled */
export function isFeatureEnabled(feature: keyof typeof ENV_CONFIG.features): boolean {
  return ENV_CONFIG.features[feature];
}

/** Get cache TTL for endpoint */
export function getCacheTTL(endpoint: string): number {
  // Define cache rules for specific endpoints
  const cacheRules: Record<string, number> = {
    '/api/v1/platforms': CACHE_CONFIG.ttl.long,
    '/api/v1/achievements': CACHE_CONFIG.ttl.medium,
    '/api/v1/leaderboard': CACHE_CONFIG.ttl.short,
    '/api/v1/stats': CACHE_CONFIG.ttl.short,
  };
  
  // Check for pattern matches
  for (const [pattern, ttl] of Object.entries(cacheRules)) {
    if (endpoint.includes(pattern)) {
      return ttl;
    }
  }
  
  return CACHE_CONFIG.ttl.none;
}

/** Build API response headers */
export function buildResponseHeaders(options: {
  requestId?: string;
  cacheControl?: string;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}): Record<string, string> {
  const headers: Record<string, string> = {
    'X-API-Version': API_VERSION,
    ...SECURITY_HEADERS,
  };
  
  if (options.requestId) {
    headers['X-Request-ID'] = options.requestId;
  }
  
  if (options.cacheControl) {
    headers['Cache-Control'] = options.cacheControl;
  }
  
  if (options.rateLimit) {
    headers['X-RateLimit-Limit'] = String(options.rateLimit.limit);
    headers['X-RateLimit-Remaining'] = String(options.rateLimit.remaining);
    headers['X-RateLimit-Reset'] = String(options.rateLimit.reset);
  }
  
  return headers;
}

// =============================================================================
// EXPORTS
// =============================================================================

const apiConfig = {
  // Version
  API_VERSION,
  API_VERSIONS,
  getApiBaseUrl,
  
  // Rate limiting
  RATE_LIMITS,
  RATE_LIMIT_WINDOW,
  getRateLimitForTier,
  
  // API keys
  API_KEY_SCOPES,
  DEFAULT_API_KEY_SCOPES,
  ADMIN_ONLY_SCOPES,
  getScopeDescription,
  isAdminScope,
  
  // Pagination
  PAGINATION_DEFAULTS,
  PAGINATION_LIMITS,
  getPaginationLimits,
  normalizePaginationParams,
  
  // CORS
  CORS_ORIGINS,
  CORS_CONFIG,
  isOriginAllowed,
  
  // Request/Response
  REQUEST_TIMEOUT,
  MAX_REQUEST_SIZE,
  REQUEST_HEADERS,
  CACHE_CONFIG,
  COMPRESSION_CONFIG,
  
  // Errors
  ERROR_MESSAGES,
  getErrorMessage,
  
  // Security
  SECURITY_HEADERS,
  API_KEY_CONFIG,
  
  // Monitoring
  MONITORING_CONFIG,
  LOG_LEVELS,
  getLogLevel,
  
  // Environment
  ENV_CONFIG,
  
  // Validation
  VALIDATION_RULES,
  
  // Helper functions
  generateApiKey,
  hashApiKey,
  isValidApiKey,
  getApiEndpoint,
  isFeatureEnabled,
  getCacheTTL,
  buildResponseHeaders,
};

export default apiConfig;