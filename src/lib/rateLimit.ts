// src/lib/rateLimit.ts
// DEPRECATED: This file is an adapter to the canonical server/redis-rate-limit.ts

import { applyRateLimit, RATE_LIMIT_CONFIGS, RateLimitPreset } from './server/redis-rate-limit';

export interface RateLimitOptions {
  interval: number;
  uniqueTokenPerInterval: number;
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

/**
 * Adapter from the old rate limiter signature to the new central Redis rate limiter presets.
 */
function createAdapterLimiter(preset: RateLimitPreset): RateLimiter {
  return {
    check: async (limit: number, token: string): Promise<RateLimitResult> => {
      const result = await applyRateLimit(preset, token);
      return {
        success: result.allowed,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset * 1000,
      };
    },
    reset: (token: string) => {
      // Legacy reset not strictly supported for arbitrary presets here
    }
  };
}

export function createRateLimiter(options: RateLimitOptions): RateLimiter {
  // Map arbitrary options to nearest preset or default to 'api'
  return createAdapterLimiter('api');
}

export function rateLimit(keyOrOptions: string | RateLimitOptions, maxRequests?: number, windowSeconds?: number, options?: RateLimitOptions): RateLimiter {
  return createAdapterLimiter('api');
}

export const defaultRateLimiter = createAdapterLimiter('api');
export const authRateLimiter = createAdapterLimiter('login');
export const apiRateLimiter = createAdapterLimiter('api');
export const syncRateLimiter = createAdapterLimiter('sync' as any); // fallback if sync preset not directly perfectly matching

export async function checkLimit(limiter: RateLimiter, limit: number, token: string): Promise<RateLimitResult> {
  return limiter.check(limit, token);
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