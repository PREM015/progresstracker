// src/services/scrapers/rateLimitManager.ts
import { logger } from '@/lib/logger';
import type { RateLimitConfig } from './types';
import { sleep } from './utils';

interface RateLimitState {
  tokens: number;
  lastRefill: number;
  queue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }>;
}

class RateLimitManager {
  private limits: Map<string, RateLimitConfig> = new Map();
  private state: Map<string, RateLimitState> = new Map();
  private processing: Set<string> = new Set();

  /**
   * Default rate limits by platform
   */
  private readonly defaults: Record<string, RateLimitConfig> = {
    github: { requests: 5000, windowMs: 3600000 }, // 5000/hour
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
   * Wait for rate limit token
   */
  async acquire(platform: string): Promise<void> {
    const key = platform.toLowerCase();
    const config = this.getConfig(key);
    
    // Initialize state if needed
    if (!this.state.has(key)) {
      this.state.set(key, {
        tokens: config.requests,
        lastRefill: Date.now(),
        queue: [],
      });
    }

    const state = this.state.get(key)!;

    // Refill tokens if window has passed
    const now = Date.now();
    const elapsed = now - state.lastRefill;
    
    if (elapsed >= config.windowMs) {
      state.tokens = config.requests;
      state.lastRefill = now;
    } else {
      // Partial refill based on time passed
      const refillRate = config.requests / config.windowMs;
      const refillAmount = Math.floor(elapsed * refillRate);
      state.tokens = Math.min(config.requests, state.tokens + refillAmount);
      if (refillAmount > 0) {
        state.lastRefill = now;
      }
    }

    // Check if token available
    if (state.tokens > 0) {
      state.tokens--;
      return;
    }

    // Queue request
    logger.debug(`Rate limit reached for ${platform}, queuing request`, {
      tokensRemaining: state.tokens,
      queueLength: state.queue.length,
    });

    return new Promise((resolve, reject) => {
      state.queue.push({ resolve, reject });
      this.processQueue(key);
    });
  }

  /**
   * Process queued requests
   */
  private async processQueue(key: string): Promise<void> {
    if (this.processing.has(key)) return;
    this.processing.add(key);

    const state = this.state.get(key);
    const config = this.getConfig(key);

    if (!state) {
      this.processing.delete(key);
      return;
    }

    while (state.queue.length > 0) {
      // Wait for refill
      const waitTime = Math.ceil(config.windowMs / config.requests);
      await sleep(waitTime);

      // Refill one token
      state.tokens = 1;

      // Process next in queue
      const next = state.queue.shift();
      if (next) {
        state.tokens--;
        next.resolve();
      }
    }

    this.processing.delete(key);
  }

  /**
   * Check remaining tokens
   */
  getRemaining(platform: string): number {
    const state = this.state.get(platform.toLowerCase());
    return state?.tokens || 0;
  }

  /**
   * Get time until next token
   */
  getNextTokenTime(platform: string): number {
    const key = platform.toLowerCase();
    const config = this.getConfig(key);
    const state = this.state.get(key);

    if (!state || state.tokens > 0) return 0;

    const elapsed = Date.now() - state.lastRefill;
    const timePerToken = config.windowMs / config.requests;
    return Math.max(0, timePerToken - elapsed);
  }

  /**
   * Reset rate limit for platform
   */
  reset(platform: string): void {
    const key = platform.toLowerCase();
    const state = this.state.get(key);
    
    if (state) {
      // Reject all queued requests
      state.queue.forEach(({ reject }) => {
        reject(new Error('Rate limit reset'));
      });
      state.queue = [];
    }

    this.state.delete(key);
    this.processing.delete(key);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    for (const key of this.state.keys()) {
      this.reset(key);
    }
  }

  /**
   * Get statistics
   */
  getStats(): Record<string, { tokens: number; queueLength: number }> {
    const stats: Record<string, { tokens: number; queueLength: number }> = {};
    
    for (const [key, state] of this.state) {
      stats[key] = {
        tokens: state.tokens,
        queueLength: state.queue.length,
      };
    }

    return stats;
  }
}

export const rateLimitManager = new RateLimitManager();
export default rateLimitManager;