// src/lib/session-cache.ts
// In-memory cache with TTL + max-size eviction
// Used primarily for NextAuth session and user profile caching

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class InMemoryCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTTL: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options?: {
    maxSize?: number;
    ttlMs?: number;
    cleanupIntervalMs?: number;
  }) {
    this.maxSize = options?.maxSize ?? 1000;
    this.defaultTTL = options?.ttlMs ?? 60 * 1000; // 1 minute default

    const cleanupInterval = options?.cleanupIntervalMs ?? 2 * 60 * 1000;
    if (typeof setInterval !== 'undefined') {
      this.cleanupTimer = setInterval(() => this.cleanup(), cleanupInterval);
      // Don't block Node.js from exiting
      if (
        this.cleanupTimer &&
        typeof this.cleanupTimer === 'object' &&
        'unref' in this.cleanupTimer
      ) {
        (this.cleanupTimer as NodeJS.Timeout).unref();
      }
    }
  }

  /** Get a cached value. Returns null if not found or expired. */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /** Set a cached value with optional custom TTL (ms). */
  set(key: string, data: T, ttlMs?: number): void {
    // Evict oldest entry if at max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttlMs ?? this.defaultTTL),
    });
  }

  /**
   * Get-or-set pattern: returns cached value if exists,
   * otherwise calls factory, caches result, and returns it.
   */
  async getOrSet(
    key: string,
    factory: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) return cached;

    const data = await factory();
    this.set(key, data, ttlMs);
    return data;
  }

  /** Invalidate a specific key. Returns true if key existed. */
  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  /** Invalidate all keys matching a prefix. Returns count deleted. */
  invalidateByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /** Invalidate all keys containing a substring. Returns count deleted. */
  invalidateByPattern(pattern: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /** Check if a key exists and is not expired. */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /** Clear all entries. */
  clear(): void {
    this.cache.clear();
  }

  /** Cache statistics. */
  stats(): { size: number; maxSize: number } {
    return { size: this.cache.size, maxSize: this.maxSize };
  }

  /** Remove all expired entries. */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        this.cache.delete(key);
      }
    }
  }

  /** Destroy cache and clear cleanup interval. */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton Cache Instances
// ─────────────────────────────────────────────────────────────

/** Auth session cache — 1 min TTL, 500 entries max */
export const sessionCache = new InMemoryCache({
  maxSize: 500,
  ttlMs: 60 * 1000, // 1 minute
});

/** User profile cache — 5 min TTL, 200 entries max */
export const userCache = new InMemoryCache({
  maxSize: 200,
  ttlMs: 5 * 60 * 1000, // 5 minutes
});

/** General purpose cache — 10 min TTL, 1000 entries max */
export const appCache = new InMemoryCache({
  maxSize: 1000,
  ttlMs: 10 * 60 * 1000, // 10 minutes
});

export { InMemoryCache };
export default sessionCache;
