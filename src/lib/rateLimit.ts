// src/lib/rateLimit.ts
/**
 * Rate limiting utilities
 * In-memory rate limiter with LRU cache
 */

import { LRUCache } from 'lru-cache';
import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

export interface RateLimitOptions {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max number of unique tokens per interval
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export interface RateLimiter {
  check: (limit: number, token: string) => Promise<RateLimitResult>;
  reset: (token: string) => void;
}

// =============================================================================
// RATE LIMITER FACTORY
// =============================================================================

/**
 * Create a rate limiter instance
 */
export function createRateLimiter(options: RateLimitOptions): RateLimiter {
  const { interval, uniqueTokenPerInterval } = options;

  const tokenCache = new LRUCache<string, number[]>({
    max: uniqueTokenPerInterval,
    ttl: interval,
  });

  return {
    check: async (limit: number, token: string): Promise<RateLimitResult> => {
      const now = Date.now();
      const tokenCount = tokenCache.get(token) || [0];
      const currentUsage = tokenCount[0];

      if (currentUsage >= limit) {
        logger.debug('Rate limit exceeded', { token, limit, currentUsage });

        return {
          success: false,
          limit,
          remaining: 0,
          reset: now + interval,
        };
      }

      tokenCache.set(token, [currentUsage + 1]);

      return {
        success: true,
        limit,
        remaining: limit - currentUsage - 1,
        reset: now + interval,
      };
    },

    reset: (token: string): void => {
      tokenCache.delete(token);
    },
  };
}

// =============================================================================
// CONVENIENCE FUNCTION (for backward compatibility)
// =============================================================================

/**
 * Create rate limiter - overloaded function
 */
export function rateLimit(options: RateLimitOptions): RateLimiter;
export function rateLimit(
  _key: string,
  _maxRequests: number,
  _windowSeconds: number,
  options: RateLimitOptions
): RateLimiter;
export function rateLimit(
  keyOrOptions: string | RateLimitOptions,
  maxRequests?: number,
  windowSeconds?: number,
  options?: RateLimitOptions
): RateLimiter {
  // Handle the different call signatures
  if (typeof keyOrOptions === 'object') {
    return createRateLimiter(keyOrOptions);
  }
  
  // Legacy call with key, maxRequests, windowSeconds, options
  if (options) {
    return createRateLimiter(options);
  }

  // Fallback
  return createRateLimiter({
    interval: (windowSeconds || 60) * 1000,
    uniqueTokenPerInterval: maxRequests || 100,
  });
}

// =============================================================================
// PRE-CONFIGURED RATE LIMITERS
// =============================================================================

/**
 * Default rate limiter: 100 requests per minute
 */
export const defaultRateLimiter = createRateLimiter({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});

/**
 * Auth rate limiter: 5 requests per 5 minutes
 */
export const authRateLimiter = createRateLimiter({
  interval: 5 * 60 * 1000,
  uniqueTokenPerInterval: 100,
});

/**
 * API rate limiter: 100 requests per minute
 */
export const apiRateLimiter = createRateLimiter({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});

/**
 * Sync rate limiter: 10 requests per hour
 */
export const syncRateLimiter = createRateLimiter({
  interval: 60 * 60 * 1000,
  uniqueTokenPerInterval: 100,
});

// =============================================================================
// MIDDLEWARE HELPER
// =============================================================================

/**
 * Check rate limit with error handling
 */
export async function checkLimit(
  limiter: RateLimiter,
  limit: number,
  token: string
): Promise<RateLimitResult> {
  try {
    return await limiter.check(limit, token);
  } catch (error) {
    logger.error('Rate limit check failed', { token }, error);
    // On error, allow the request
    return {
      success: true,
      limit,
      remaining: limit,
      reset: Date.now() + 60000,
    };
  }
}

const rateLimithandle = {
  createRateLimiter,
  rateLimit,
  defaultRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  syncRateLimiter,
  checkLimit,
};
export default rateLimithandle;