// src/services/cacheService.ts
import { cache } from '@/lib/redis';
import { logger } from '@/lib/logger';

const log = logger.child({ service: 'CacheService' });

export class CacheService {
  /**
   * Generate cache key
   */
  private static generateKey(prefix: string, identifier: string): string {
    return `${prefix}:${identifier}`;
  }

  /**
   * Cache user data
   */
  static async cacheUser(userId: string, data: unknown, ttl: number = 3600) {
    try {
      const key = this.generateKey('user', userId);
      await cache.set(key, data, ttl);
      log.info('User cached', { userId, ttl });
    } catch (error) {
      log.error('Error caching user', { userId }, error);
    }
  }

  /**
   * Get cached user data
   */
  static async getCachedUser(userId: string) {
    try {
      const key = this.generateKey('user', userId);
      const data = await cache.get(key);
      if (data) {
        log.info('User cache hit', { userId });
      }
      return data;
    } catch (error) {
      log.error('Error getting cached user', { userId }, error);
      return null;
    }
  }

  /**
   * Cache stats
   */
  static async cacheStats(userId: string, data: unknown, ttl: number = 300) {
    try {
      const key = this.generateKey('stats', userId);
      await cache.set(key, data, ttl);
      log.info('Stats cached', { userId, ttl });
    } catch (error) {
      log.error('Error caching stats', { userId }, error);
    }
  }

  /**
   * Get cached stats
   */
  static async getCachedStats(userId: string) {
    try {
      const key = this.generateKey('stats', userId);
      const data = await cache.get(key);
      if (data) {
        log.info('Stats cache hit', { userId });
      }
      return data;
    } catch (error) {
      log.error('Error getting cached stats', { userId }, error);
      return null;
    }
  }

  /**
   * Invalidate user cache
   */
  static async invalidateUser(userId: string) {
    try {
      const key = this.generateKey('user', userId);
      await cache.del(key);
      log.info('User cache invalidated', { userId });
    } catch (error) {
      log.error('Error invalidating user cache', { userId }, error);
    }
  }

  /**
   * Invalidate stats cache
   */
  static async invalidateStats(userId: string) {
    try {
      const key = this.generateKey('stats', userId);
      await cache.del(key);
      log.info('Stats cache invalidated', { userId });
    } catch (error) {
      log.error('Error invalidating stats cache', { userId }, error);
    }
  }

  /**
   * Cache any data with custom key
   */
  static async set(key: string, data: unknown, ttl: number = 3600) {
    try {
      await cache.set(key, data, ttl);
      log.info('Data cached', { key, ttl });
    } catch (error) {
      log.error('Error caching data', { key }, error);
    }
  }

  /**
   * Get cached data by key
   */
  static async get(key: string) {
    try {
      const data = await cache.get(key);
      if (data) {
        log.info('Cache hit', { key });
      }
      return data;
    } catch (error) {
      log.error('Error getting cached data', { key }, error);
      return null;
    }
  }

  /**
   * Delete cached data
   */
  static async delete(key: string) {
    try {
      await cache.del(key);
      log.info('Cache deleted', { key });
    } catch (error) {
      log.error('Error deleting cache', { key }, error);
    }
  }

  /**
   * Clear all cache
   */
  static async clearAll() {
    try {
      await cache.flushAll();
      log.info('All cache cleared');
    } catch (error) {
      log.error('Error clearing all cache', {}, error);
    }
  }
}

export default CacheService;