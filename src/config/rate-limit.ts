// ============================================================================
// FILE: src/config/rate-limit.ts
// PURPOSE: Rate limiting configuration for API and actions
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

export interface RateLimitConfig {
  enabled: boolean;
  store: StoreConfig;
  defaults: DefaultLimits;
  routes: RouteRateLimits;
  actions: ActionRateLimits;
  tiers: TierRateLimits;
  bypass: BypassConfig;
  headers: HeaderConfig;
  penalties: PenaltyConfig;
}

export interface StoreConfig {
  type: 'memory' | 'redis';
  prefix: string;
  cleanupInterval: number;
}

export interface RateLimitRule {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: 'ip' | 'user' | 'apiKey' | 'combined';
}

export interface DefaultLimits {
  anonymous: RateLimitRule;
  authenticated: RateLimitRule;
  api: RateLimitRule;
}

export interface RouteRateLimits {
  [route: string]: RateLimitRule;
}

export interface ActionRateLimits {
  [action: string]: RateLimitRule;
}

export interface TierRateLimits {
  free: TierLimits;
  starter: TierLimits;
  pro: TierLimits;
  team: TierLimits;
  enterprise: TierLimits;
}

export interface TierLimits {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
  apiCallsPerDay: number;
  syncPerHour: number;
  exportsPerDay: number;
}

export interface BypassConfig {
  enabled: boolean;
  ips: string[];
  userIds: string[];
  apiKeys: string[];
  adminBypass: boolean;
}

export interface HeaderConfig {
  enabled: boolean;
  remaining: string;
  limit: string;
  reset: string;
  retryAfter: string;
  policy: string;
}

export interface PenaltyConfig {
  enabled: boolean;
  violationThreshold: number;
  penaltyMultiplier: number;
  penaltyDurationMs: number;
  maxPenaltyLevel: number;
  decayMs: number;
}

// =============================================================================
// STORE CONFIGURATION
// =============================================================================

export const STORE_CONFIG: StoreConfig = {
  /** Storage type for rate limit data */
  type: process.env.RATE_LIMIT_STORE === 'redis' ? 'redis' : 'memory',

  /** Key prefix for rate limit entries */
  prefix: 'rl',

  /** Cleanup interval for expired entries (ms) */
  cleanupInterval: 60000, // 1 minute
};

// =============================================================================
// DEFAULT LIMITS
// =============================================================================

export const DEFAULT_LIMITS: DefaultLimits = {
  /** Anonymous (unauthenticated) users */
  anonymous: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests, please try again later',
    keyGenerator: 'ip',
  },

  /** Authenticated users */
  authenticated: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    message: 'Rate limit exceeded, please slow down',
    keyGenerator: 'user',
  },

  /** API requests (with API key) */
  api: {
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    message: 'API rate limit exceeded',
    keyGenerator: 'apiKey',
  },
};

// =============================================================================
// ROUTE-SPECIFIC RATE LIMITS
// =============================================================================

export const ROUTE_RATE_LIMITS: RouteRateLimits = {
  // ==================== AUTH ROUTES ====================
  '/api/auth/login': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: 'Too many login attempts, please try again later',
    skipSuccessfulRequests: false,
    keyGenerator: 'ip',
  },
  '/api/auth/register': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: 'Too many registration attempts',
    keyGenerator: 'ip',
  },
  '/api/auth/forgot-password': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: 'Too many password reset requests',
    keyGenerator: 'ip',
  },
  '/api/auth/magic-link': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many magic link requests',
    keyGenerator: 'ip',
  },
  '/api/auth/2fa/verify': {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5,
    message: 'Too many 2FA attempts',
    keyGenerator: 'combined',
  },

  // ==================== SYNC ROUTES ====================
  '/api/sync': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: 'Sync rate limit exceeded',
    keyGenerator: 'user',
  },
  '/api/sync/trigger-all': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: 'Too many full sync requests',
    keyGenerator: 'user',
  },

  // ==================== EXPORT ROUTES ====================
  '/api/export': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'Export rate limit exceeded',
    keyGenerator: 'user',
  },

  // ==================== TRACKER ROUTES ====================
  '/api/tracker': {
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    message: 'Too many tracker requests',
    keyGenerator: 'user',
  },
  '/api/tracker/bulk': {
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: 'Too many bulk operations',
    keyGenerator: 'user',
  },

  // ==================== UPLOAD ROUTES ====================
  '/api/upload': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50,
    message: 'Upload rate limit exceeded',
    keyGenerator: 'user',
  },
  '/api/upload/avatar': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'Too many avatar uploads',
    keyGenerator: 'user',
  },

  // ==================== WEBHOOK ROUTES ====================
  '/api/webhooks': {
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: 'Webhook rate limit exceeded',
    keyGenerator: 'ip',
  },

  // ==================== SEARCH ROUTES ====================
  '/api/search': {
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: 'Search rate limit exceeded',
    keyGenerator: 'user',
  },

  // ==================== EMAIL ROUTES ====================
  '/api/email/test': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: 'Too many test emails',
    keyGenerator: 'user',
  },

  // ==================== FEEDBACK ROUTES ====================
  '/api/feedback': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'Too many feedback submissions',
    keyGenerator: 'user',
  },

  // ==================== CONTACT ROUTES ====================
  '/api/contact': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: 'Too many contact form submissions',
    keyGenerator: 'ip',
  },

  // ==================== WAITLIST ROUTES ====================
  '/api/waitlist/join': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: 'Too many waitlist requests',
    keyGenerator: 'ip',
  },

  // ==================== NEWSLETTER ROUTES ====================
  '/api/newsletter/subscribe': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: 'Too many subscription attempts',
    keyGenerator: 'ip',
  },

  // ==================== SHARE ROUTES ====================
  '/api/share': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30,
    message: 'Too many share links created',
    keyGenerator: 'user',
  },
};

// =============================================================================
// ACTION-SPECIFIC RATE LIMITS
// =============================================================================

export const ACTION_RATE_LIMITS: ActionRateLimits = {
  // Authentication actions
  'auth:login': {
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyGenerator: 'ip',
  },
  'auth:register': {
    windowMs: 60 * 60 * 1000,
    max: 5,
    keyGenerator: 'ip',
  },
  'auth:password-reset': {
    windowMs: 60 * 60 * 1000,
    max: 3,
    keyGenerator: 'ip',
  },

  // Data operations
  'data:create': {
    windowMs: 60 * 1000,
    max: 100,
    keyGenerator: 'user',
  },
  'data:update': {
    windowMs: 60 * 1000,
    max: 100,
    keyGenerator: 'user',
  },
  'data:delete': {
    windowMs: 60 * 1000,
    max: 50,
    keyGenerator: 'user',
  },

  // Sync operations
  'sync:platform': {
    windowMs: 60 * 60 * 1000,
    max: 10,
    keyGenerator: 'user',
  },
  'sync:all': {
    windowMs: 60 * 60 * 1000,
    max: 3,
    keyGenerator: 'user',
  },

  // Export operations
  'export:create': {
    windowMs: 60 * 60 * 1000,
    max: 10,
    keyGenerator: 'user',
  },
  'export:download': {
    windowMs: 60 * 60 * 1000,
    max: 50,
    keyGenerator: 'user',
  },

  // Email operations
  'email:send': {
    windowMs: 60 * 60 * 1000,
    max: 20,
    keyGenerator: 'user',
  },
  'email:verify': {
    windowMs: 60 * 60 * 1000,
    max: 5,
    keyGenerator: 'user',
  },

  // API key operations
  'apikey:create': {
    windowMs: 24 * 60 * 60 * 1000,
    max: 10,
    keyGenerator: 'user',
  },
  'apikey:regenerate': {
    windowMs: 60 * 60 * 1000,
    max: 5,
    keyGenerator: 'user',
  },
};

// =============================================================================
// TIER-BASED RATE LIMITS
// =============================================================================

export const TIER_RATE_LIMITS: TierRateLimits = {
  free: {
    requestsPerMinute: 30,
    requestsPerHour: 500,
    requestsPerDay: 5000,
    burstLimit: 10,
    apiCallsPerDay: 100,
    syncPerHour: 2,
    exportsPerDay: 3,
  },
  starter: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    burstLimit: 20,
    apiCallsPerDay: 500,
    syncPerHour: 5,
    exportsPerDay: 10,
  },
  pro: {
    requestsPerMinute: 120,
    requestsPerHour: 3000,
    requestsPerDay: 30000,
    burstLimit: 50,
    apiCallsPerDay: 2000,
    syncPerHour: 20,
    exportsPerDay: 50,
  },
  team: {
    requestsPerMinute: 300,
    requestsPerHour: 10000,
    requestsPerDay: 100000,
    burstLimit: 100,
    apiCallsPerDay: 10000,
    syncPerHour: 50,
    exportsPerDay: 100,
  },
  enterprise: {
    requestsPerMinute: 1000,
    requestsPerHour: 50000,
    requestsPerDay: 500000,
    burstLimit: 200,
    apiCallsPerDay: 100000,
    syncPerHour: 200,
    exportsPerDay: 500,
  },
};

// =============================================================================
// BYPASS CONFIGURATION
// =============================================================================

export const BYPASS_CONFIG: BypassConfig = {
  /** Enable bypass functionality */
  enabled: !IS_PRODUCTION || process.env.RATE_LIMIT_BYPASS_ENABLED === 'true',

  /** IPs that bypass rate limiting */
  ips: (process.env.RATE_LIMIT_BYPASS_IPS || '').split(',').filter(Boolean),

  /** User IDs that bypass rate limiting */
  userIds: (process.env.RATE_LIMIT_BYPASS_USERS || '').split(',').filter(Boolean),

  /** API keys that bypass rate limiting */
  apiKeys: (process.env.RATE_LIMIT_BYPASS_KEYS || '').split(',').filter(Boolean),

  /** Admins bypass rate limiting */
  adminBypass: process.env.RATE_LIMIT_ADMIN_BYPASS !== 'false',
};

// =============================================================================
// HEADER CONFIGURATION
// =============================================================================

export const HEADER_CONFIG: HeaderConfig = {
  /** Include rate limit headers in response */
  enabled: true,

  /** Header for remaining requests */
  remaining: 'X-RateLimit-Remaining',

  /** Header for rate limit */
  limit: 'X-RateLimit-Limit',

  /** Header for reset time */
  reset: 'X-RateLimit-Reset',

  /** Header for retry after (when limited) */
  retryAfter: 'Retry-After',

  /** Header for rate limit policy */
  policy: 'X-RateLimit-Policy',
};

// =============================================================================
// PENALTY CONFIGURATION
// =============================================================================

export const PENALTY_CONFIG: PenaltyConfig = {
  /** Enable penalty system for repeat offenders */
  enabled: IS_PRODUCTION,

  /** Number of violations before penalty */
  violationThreshold: 5,

  /** Penalty multiplier (reduces allowed requests) */
  penaltyMultiplier: 0.5,

  /** Penalty duration in ms (1 hour) */
  penaltyDurationMs: 60 * 60 * 1000,

  /** Maximum penalty level */
  maxPenaltyLevel: 3,

  /** Penalty decay time in ms (24 hours) */
  decayMs: 24 * 60 * 60 * 1000,
};

// =============================================================================
// ERROR MESSAGES
// =============================================================================

export const RATE_LIMIT_MESSAGES = {
  default: 'Too many requests, please try again later',
  auth: 'Too many authentication attempts, please wait before trying again',
  api: 'API rate limit exceeded. Please check your plan limits.',
  sync: 'Sync rate limit exceeded. Please wait before syncing again.',
  export: 'Export limit exceeded. Please try again later.',
  upload: 'Upload limit exceeded. Please try again later.',
  search: 'Search rate limit exceeded. Please slow down.',
  blocked: 'Your access has been temporarily restricted due to excessive requests.',
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get rate limit for route */
export function getRouteRateLimit(route: string): RateLimitRule | undefined {
  // Exact match
  if (ROUTE_RATE_LIMITS[route]) {
    return ROUTE_RATE_LIMITS[route];
  }

  // Pattern match (find most specific)
  const matchedRoutes = Object.keys(ROUTE_RATE_LIMITS)
    .filter(pattern => route.startsWith(pattern))
    .sort((a, b) => b.length - a.length);

  return matchedRoutes.length > 0 ? ROUTE_RATE_LIMITS[matchedRoutes[0]] : undefined;
}

/** Get rate limit for action */
export function getActionRateLimit(action: string): RateLimitRule | undefined {
  return ACTION_RATE_LIMITS[action];
}

/** Get tier limits */
export function getTierLimits(tier: keyof TierRateLimits): TierLimits {
  return TIER_RATE_LIMITS[tier] || TIER_RATE_LIMITS.free;
}

/** Check if identifier should bypass rate limiting */
export function shouldBypass(
  ip: string,
  userId?: string,
  apiKey?: string,
  isAdmin?: boolean
): boolean {
  if (!BYPASS_CONFIG.enabled) return false;

  if (BYPASS_CONFIG.ips.includes(ip)) return true;
  if (userId && BYPASS_CONFIG.userIds.includes(userId)) return true;
  if (apiKey && BYPASS_CONFIG.apiKeys.includes(apiKey)) return true;
  if (isAdmin && BYPASS_CONFIG.adminBypass) return true;

  return false;
}

/** Calculate penalty-adjusted limit */
export function calculatePenaltyAdjustedLimit(
  baseLimit: number,
  penaltyLevel: number
): number {
  if (!PENALTY_CONFIG.enabled || penaltyLevel === 0) {
    return baseLimit;
  }

  const effectiveLevel = Math.min(penaltyLevel, PENALTY_CONFIG.maxPenaltyLevel);
  const multiplier = Math.pow(PENALTY_CONFIG.penaltyMultiplier, effectiveLevel);
  return Math.max(1, Math.floor(baseLimit * multiplier));
}

/** Generate rate limit key */
export function generateRateLimitKey(
  prefix: string,
  identifier: string,
  action?: string
): string {
  const parts = [STORE_CONFIG.prefix, prefix, identifier];
  if (action) parts.push(action);
  return parts.join(':');
}

/** Format retry-after header value */
export function formatRetryAfter(resetTime: number): string {
  const seconds = Math.ceil((resetTime - Date.now()) / 1000);
  return Math.max(1, seconds).toString();
}

/** Calculate window end time */
export function calculateWindowEnd(windowMs: number): number {
  return Date.now() + windowMs;
}

/** Validate rate limit configuration */
export function validateRateLimitConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check store configuration
  if (STORE_CONFIG.type === 'redis' && !process.env.UPSTASH_REDIS_REST_URL) {
    warnings.push('Redis store configured but Redis URL not set, falling back to memory');
  }

  // Check for very permissive limits
  if (DEFAULT_LIMITS.anonymous.max > 1000) {
    warnings.push('Anonymous rate limit is very high');
  }

  // Check bypass configuration
  if (IS_PRODUCTION && BYPASS_CONFIG.enabled && BYPASS_CONFIG.ips.length > 10) {
    warnings.push('Large number of bypass IPs configured');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// COMBINED CONFIG EXPORT
// =============================================================================

export const RATE_LIMIT_CONFIG: RateLimitConfig = {
  enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
  store: STORE_CONFIG,
  defaults: DEFAULT_LIMITS,
  routes: ROUTE_RATE_LIMITS,
  actions: ACTION_RATE_LIMITS,
  tiers: TIER_RATE_LIMITS,
  bypass: BYPASS_CONFIG,
  headers: HEADER_CONFIG,
  penalties: PENALTY_CONFIG,
};

export default RATE_LIMIT_CONFIG;