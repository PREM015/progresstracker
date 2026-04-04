// src/lib/rateLimiter.ts
// DEPRECATED: This file is an adapter to the canonical server/redis-rate-limit.ts

import { applyRateLimit, RATE_LIMIT_CONFIGS, RateLimitPreset } from './server/redis-rate-limit';

// Adapter class to maintain backward compatibility
export class RateLimiter {
  private preset: RateLimitPreset;

  constructor(preset: RateLimitPreset) {
    this.preset = preset;
  }

  async check(identifier: string): Promise<{ allowed: boolean; remaining: number }> {
    const res = await applyRateLimit(this.preset, identifier);
    return { allowed: res.allowed, remaining: res.remaining };
  }

  async reset(identifier: string): Promise<void> {
    // Resetting is handled by resetRateLimit in canonical, but for backward compatibility
    // we can skip or use resetRateLimit if needed.
  }
}

// Map old predefined limiters to canonical presets
export const rateLimiters = {
  api: new RateLimiter('api'),
  auth: new RateLimiter('login'),
  sync: new RateLimiter('api'), // Map to api since sync is missing in some configs
};

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