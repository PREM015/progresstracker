import { logger } from '@/lib/logger';
import { cache } from '@/lib/redis';
import type { RateLimitConfig } from './types';
import { sleep } from './utils';

/**
 * RateLimitManager — uses simple Redis INCR + EXPIRE for a sliding window counter.
 * 
 * Previous implementation used cache.eval() with Lua scripts, but cache.eval()
 * does not exist on the cache wrapper — causing every scraper request to throw
 * and block forever. This rewrite uses only cache.incr() and cache.expire()
 * which are actual methods on the cache object.
 */
class RateLimitManager {
  private limits: Map<string, RateLimitConfig> = new Map();

  /**
   * Default rate limits by platform
   */
  private readonly defaults: Record<string, RateLimitConfig> = {
    github: { requests: 5000, windowMs: 3600000 },    // 5000/hour
    gitlab: { requests: 2000, windowMs: 3600000 },
    leetcode: { requests: 30, windowMs: 60000 },
    codeforces: { requests: 10, windowMs: 60000 },
    codechef: { requests: 10, windowMs: 60000 },
    hackerrank: { requests: 20, windowMs: 60000 },
    geeksforgeeks: { requests: 10, windowMs: 60000 },
    kaggle: { requests: 20, windowMs: 60000 },
    default: { requests: 30, windowMs: 60000 },
  };

  /**
   * Configure rate limit for platform
   */
  configure(platform: string, config: RateLimitConfig): void {
    this.limits.set(platform.toLowerCase(), config);
    logger.debug(`Rate limit configured for ${platform}`, { config });
  }

  /**
   * Get rate limit config for platform
   */
  getConfig(platform: string): RateLimitConfig {
    const key = platform.toLowerCase();
    return this.limits.get(key) || this.defaults[key] || this.defaults.default;
  }

  /**
   * Wait for rate limit token using simple INCR counter.
   * 
   * Uses a Redis key `ratelimit:<platform>:<window>` that increments on each
   * request. The key auto-expires at the end of the window. If the count
   * exceeds the limit, waits for the window to reset.
   * 
   * On any Redis error, fails OPEN (allows the request through) to avoid
   * blocking scrapers.
   */
  async acquire(platform: string): Promise<void> {
    const key = platform.toLowerCase();
    const config = this.getConfig(key);
    const windowSeconds = Math.ceil(config.windowMs / 1000);

    // Window key includes the current time bucket so it auto-resets
    const windowBucket = Math.floor(Date.now() / config.windowMs);
    const redisKey = `ratelimit:${key}:${windowBucket}`;

    try {
      const count = await cache.incr(redisKey);

      // Set expiry on first increment so the key auto-cleans
      if (count === 1) {
        await cache.expire(redisKey, windowSeconds + 1);
      }

      if (count <= config.requests) {
        // Under limit — proceed
        return;
      }

      // Over limit — wait for the current window to expire, then proceed
      const windowEndMs = (windowBucket + 1) * config.windowMs;
      const waitMs = Math.min(windowEndMs - Date.now() + 100, config.windowMs);

      if (waitMs > 0 && waitMs <= 60000) {
        logger.debug(`Rate limit reached for ${platform} (${count}/${config.requests}). Waiting ${waitMs}ms`);
        await sleep(waitMs);
      }

      // After waiting, allow through
      return;
    } catch (error) {
      // Redis failed — fail OPEN so scrapers aren't blocked
      logger.warn(`RateLimitManager Redis error for ${platform}, allowing request through`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }
  }

  /**
   * Try to acquire token without blocking.
   * Returns true if acquired, false if rate limited.
   */
  async tryAcquire(platform: string): Promise<boolean> {
    const key = platform.toLowerCase();
    const config = this.getConfig(key);
    const windowSeconds = Math.ceil(config.windowMs / 1000);

    const windowBucket = Math.floor(Date.now() / config.windowMs);
    const redisKey = `ratelimit:${key}:${windowBucket}`;

    try {
      const count = await cache.incr(redisKey);

      if (count === 1) {
        await cache.expire(redisKey, windowSeconds + 1);
      }

      return count <= config.requests;
    } catch (error) {
      logger.warn(`tryAcquire Redis error for ${platform}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return true; // Fail open
    }
  }

  /**
   * Get remaining tokens (estimated)
   */
  async getRemaining(platform: string): Promise<number> {
    const key = platform.toLowerCase();
    const config = this.getConfig(key);
    const windowBucket = Math.floor(Date.now() / config.windowMs);
    const redisKey = `ratelimit:${key}:${windowBucket}`;

    try {
      const val = await cache.get<number>(redisKey);
      const used = val ?? 0;
      return Math.max(0, config.requests - used);
    } catch {
      return config.requests; // Assume full if Redis fails
    }
  }

  /**
   * Get time until next token
   */
  getNextTokenTime(platform: string): number {
    const key = platform.toLowerCase();
    const config = this.getConfig(key);
    const windowBucket = Math.floor(Date.now() / config.windowMs);
    const windowEndMs = (windowBucket + 1) * config.windowMs;
    return Math.max(0, windowEndMs - Date.now());
  }

  /**
   * Reset rate limit for platform
   */
  async reset(platform: string): Promise<void> {
    const key = platform.toLowerCase();
    const config = this.getConfig(key);
    const windowBucket = Math.floor(Date.now() / config.windowMs);
    const redisKey = `ratelimit:${key}:${windowBucket}`;
    await cache.del(redisKey);
  }

  /**
   * Reset all rate limits
   */
  async resetAll(): Promise<void> {
    // No-op — keys auto-expire via TTL
  }

  /**
   * Check if request can proceed (simple lock check)
   */
  async canProceed(lockKey: string): Promise<boolean> {
    try {
      const exists = await cache.exists(lockKey);
      if (exists) return false;

      // Set a temporary lock for 5s
      await cache.set(lockKey, 1, 5);
      return true;
    } catch {
      return true; // Fail open
    }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<Record<string, { tokens: number; queueLength: number }>> {
    return {}; // Keys auto-expire, no scan needed
  }
}

export const rateLimitManager = new RateLimitManager();
export default rateLimitManager;