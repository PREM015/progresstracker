import { LRUCache } from 'lru-cache';

interface RateLimitOptions {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max number of unique tokens per interval
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export function rateLimit(options: RateLimitOptions) {
  const tokenCache = new LRUCache<string, number[]>({
    max: options.uniqueTokenPerInterval || 500,
    ttl: options.interval || 60000,
  });

  return {
    check: (limit: number, token: string): Promise<RateLimitResult> =>
      new Promise((resolve, reject) => {
        const tokenCount = tokenCache.get(token) || [0];
        const currentUsage = tokenCount[0];
        const isRateLimited = currentUsage >= limit;

        if (isRateLimited) {
          reject({
            success: false,
            limit,
            remaining: 0,
            reset: Date.now() + options.interval,
          });
          return;
        }

        tokenCache.set(token, [currentUsage + 1]);

        resolve({
          success: true,
          limit,
          remaining: limit - currentUsage - 1,
          reset: Date.now() + options.interval,
        });
      }),
  };
}

// Default rate limiter: 10 requests per minute
export const defaultRateLimiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});
