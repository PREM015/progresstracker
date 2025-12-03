// src/services/cacheService.ts

import { cache } from '@/lib/redis';

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
  static async cacheUser(userId: string, data: any, ttl: number = 3600) {
    const key = this.generateKey('user', userId);
    await cache.set(key, data, ttl);
  }

  /**
   * Get cached user data
   */
  static async getCachedUser(userId: string) {
    const key = this.generateKey('user', userId);
    return await cache.get(key);
  }

  /**
   * Cache stats
   */
  static async cacheStats(userId: string, data: any, ttl: number = 300) {
    const key = this.generateKey('stats', userId);
    await cache.set(key, data, ttl);
  }

  /**
   * Get cached stats
   */
  static async getCachedStats(userId: string) {
    const key = this.generateKey('stats', userId);
    return await cache.get(key);
  }

  /**
   * Invalidate user cache
   */
  static async invalidateUser(userId: string) {
    const key = this.generateKey('user', userId);
    await cache.del(key);
  }

  /**
   * Invalidate stats cache
   */
  static async invalidateStats(userId: string) {
    const key = this.generateKey('stats', userId);
    await cache.del(key);
  }
}