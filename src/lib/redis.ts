// src/lib/redis.ts

import { Redis } from '@upstash/redis';

// Initialize Redis client (using Upstash for serverless)
// export const redis = new Redis({
//   url: process.env.UPSTASH_REDIS_REST_URL || '',
//   token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
// });

// Use a mock or no-op if keys are missing to prevent crash during build/dev if not using Redis
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = (redisUrl && redisToken && !redisUrl.includes('your-upstash'))
  ? new Redis({ url: redisUrl, token: redisToken })
  : {
    get: async () => null,
    set: async () => { },
    setex: async () => { },
    del: async () => { },
    flushall: async () => { },
    exists: async () => 0,
    incr: async () => 0,
    expire: async () => { },
    ping: async () => 'PONG',
  } as unknown as Redis;

// Basic health check on startup
if (redis.ping) {
  redis.ping().then(() => {
    console.log('Redis connection established');
  }).catch((err) => {
    console.warn("Redis unavailable — running in fallback mode", err);
  });
}

/**
 * Cache utilities
 */
export const cache = {
  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value as T | null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  },

  /**
   * Set cached value with optional expiration
   */
  async set<T>(key: string, value: T, expirationSeconds?: number): Promise<void> {
    try {
      if (expirationSeconds) {
        await redis.setex(key, expirationSeconds, JSON.stringify(value));
      } else {
        await redis.set(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error('Redis set error:', error);
    }
  },

  /**
   * Delete cached value
   */
  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
    }
  },

  /**
   * Clear all keys in Redis
   */
  async flushAll(): Promise<void> {
    try {
      await redis.flushall();
    } catch (error) {
      console.error('Redis flushAll error:', error);
    }
  },
  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  },

  /**
   * Increment counter
   */
  async incr(key: string): Promise<number> {
    try {
      return await redis.incr(key);
    } catch (error) {
      console.error('Redis incr error:', error);
      return 0;
    }
  },

  /**
   * Set expiration time
   */
  async expire(key: string, seconds: number): Promise<void> {
    try {
      await redis.expire(key, seconds);
    } catch (error) {
      console.error('Redis expire error:', error);
    }
  },
};