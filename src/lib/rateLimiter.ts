// src/lib/rateLimiter.ts

import { cache } from './redis';

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

/**
 * Rate limiter using Redis
 */
export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if request is allowed
   */
  async check(identifier: string): Promise<{ allowed: boolean; remaining: number }> {
    const key = `ratelimit:${identifier}`;

    try {
      const current = await cache.incr(key);

      if (current === 1) {
        // First request, set expiration
        await cache.expire(key, this.config.windowSeconds);
      }

      const allowed = current <= this.config.maxRequests;
      const remaining = Math.max(0, this.config.maxRequests - current);

      return { allowed, remaining };
    } catch (error) {
      console.error('Rate limiter error:', error);
      // On error, allow the request
      return { allowed: true, remaining: this.config.maxRequests };
    }
  }

  /**
   * Reset rate limit for identifier
   */
  async reset(identifier: string): Promise<void> {
    const key = `ratelimit:${identifier}`;
    await cache.del(key);
  }
}

// Pre-configured rate limiters
export const rateLimiters = {
  api: new RateLimiter({ maxRequests: 100, windowSeconds: 60 }), // 100 req/min
  auth: new RateLimiter({ maxRequests: 5, windowSeconds: 300 }), // 5 req/5min
  sync: new RateLimiter({ maxRequests: 10, windowSeconds: 3600 }), // 10 req/hour
};

/**
 * Middleware helper for rate limiting
 */
export async function checkRateLimit(
  identifier: string,
  limiter: RateLimiter = rateLimiters.api
): Promise<{ allowed: boolean; remaining: number; error?: string }> {
  const result = await limiter.check(identifier);

  if (!result.allowed) {
    return {
      ...result,
      error: 'Rate limit exceeded. Please try again later.',
    };
  }

  return result;
}