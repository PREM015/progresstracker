// src/services/cacheService.ts
import { cache } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { performanceTracking } from '@/lib/performanceTracking';

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
        log.debug('User cache hit', { userId });
        performanceTracking.trackCacheAccess(true);
      } else {
        performanceTracking.trackCacheAccess(false);
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
        log.debug('Stats cache hit', { userId });
        performanceTracking.trackCacheAccess(true);
      } else {
        performanceTracking.trackCacheAccess(false);
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
   * Invalidate stats cache entries for a user.
   *
   * Supports targeted invalidation to reduce cache churn:
   *  - 'daily'  → only today/dashboard/summary keys (tracker entry create)
   *  - 'entry'  → daily + overview/weekly keys (bulk update/delete)
   *  - 'goal'   → goal-specific keys only
   *  - 'all'    → everything (default, backward compatible)
   */
  static async invalidateStats(userId: string, scope: 'daily' | 'entry' | 'goal' | 'all' = 'all') {
    try {
      // Hierarchical key groups
      const dailyKeys = [
        `stats:summary:${userId}`,
        `stats:dashboard:data:${userId}`,
        this.generateKey('stats', userId),
      ];

      const entryKeys = [
        ...dailyKeys,
        `stats:overview:${userId}`,
        `stats:weekly:data:${userId}`,
        `stats:platforms:${userId}`,
        `tracker:entries:${userId}:dashboard`,
      ];

      const goalKeys = [
        `goals:stats:${userId}`,
        `goals:default:${userId}`,
      ];

      const allKeys = [
        ...entryKeys,
        ...goalKeys,
        `stats:overall:${userId}:7`,
        `stats:overall:${userId}:14`,
        `stats:overall:${userId}:30`,
        `stats:overall:${userId}:60`,
        `stats:overall:${userId}:90`,
        `stats:heatmap:${userId}`,
      ];

      const keyMap = {
        daily: dailyKeys,
        entry: entryKeys,
        goal: goalKeys,
        all: allKeys,
      };

      const keysToDelete = keyMap[scope];
      await Promise.all(keysToDelete.map(key => cache.del(key)));
      log.info('Stats cache invalidated', { userId, scope, keysDeleted: keysToDelete.length });
    } catch (error) {
      log.error('Error invalidating stats cache', { userId, scope }, error);
    }
  }

  /**
   * Cache any data with custom key
   */
  static async set(key: string, data: unknown, ttl: number = 3600) {
    try {
      await cache.set(key, data, ttl);
      log.debug('Data cached', { key, ttl });
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
        log.debug('Cache hit', { key });
        performanceTracking.trackCacheAccess(true);
      } else {
        performanceTracking.trackCacheAccess(false);
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
   * Alias for delete (to match Redis API)
   */
  static async del(key: string) {
    return this.delete(key);
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