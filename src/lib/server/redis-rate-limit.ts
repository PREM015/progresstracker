// ============================================================================
// FILE: src/lib/server/redis-rate-limit.ts
// PURPOSE: Canonical Redis-backed rate limiter (replaces all 3 fragmented files)
// SECURITY: 🔴 CRITICAL — in-memory limiters reset on restart and can't be shared
//           across pods/instances. Redis-backed limiters are persistent and shared.
//
// Uses Upstash Redis (HTTP client) with sliding window algorithm via INCR + EXPIRE.
// Falls back to in-memory LRU if Redis is unavailable (with WARNING log).
//
// DEPRECATION NOTICE:
//   - src/lib/rateLimit.ts → re-exports from this file
//   - src/lib/rateLimiter.ts → re-exports from this file
//   - src/lib/server/rate-limit.ts → upgraded to use this file
// ============================================================================

import { redis } from "@/lib/redis";
import { LRUCache } from "lru-cache";

// ============================================================================
// TYPES
// ============================================================================

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  window: number;
  /** Key prefix for namespacing (e.g. 'login', 'api', 'export') */
  prefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Unix timestamp (seconds) when the window resets */
  reset: number;
  /** Seconds to wait before retry (only when !allowed) */
  retryAfter?: number;
}

// ============================================================================
// IN-MEMORY FALLBACK (used when Redis is unavailable)
// ============================================================================

interface MemEntry {
  count: number;
  resetAt: number;
}

const memFallback = new LRUCache<string, MemEntry>({
  max: 10_000,
  ttl: 3_600_000, // 1 hour max TTL
});

// Redis health state: 'unknown' | 'up' | 'down'
let redisState: "unknown" | "up" | "down" = "unknown";

function checkInMemory(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowMs = config.window * 1000;

  let entry = memFallback.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
  }

  entry.count++;
  memFallback.set(key, entry);

  const allowed = entry.count <= config.limit;
  const remaining = Math.max(0, config.limit - entry.count);
  const reset = Math.ceil(entry.resetAt / 1000);
  const retryAfter = allowed ? undefined : Math.ceil((entry.resetAt - now) / 1000);

  return { allowed, limit: config.limit, remaining, reset, retryAfter };
}

// ============================================================================
// REDIS RATE LIMITER
// ============================================================================

/**
 * Check rate limit using Redis INCR + EXPIRE (sliding fixed-window).
 * Falls back to in-memory LRU if Redis is unavailable.
 *
 * @param identifier - Unique string key for this rate limit window
 *                     (e.g., `ip:1.2.3.4`, `user:clxyz123`, `login:user@example.com`)
 * @param config     - Rate limit config (limit, window, prefix)
 */
export async function checkRedisRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `rl:${config.prefix}:${identifier}`;

  // Try Redis first (if it was available or we haven't checked yet)
  if (redisState !== "down") {
    try {
      // Atomic increment
      const count = await redis.incr(key);

      // Set TTL only on first request in window
      if (count === 1) {
        await redis.expire(key, config.window);
      }

      // Mark Redis as available
      redisState = "up";

      // Approximate reset time — TTL may be slightly different
      const now = Math.floor(Date.now() / 1000);
      const reset = now + config.window;
      const remaining = Math.max(0, config.limit - count);
      const allowed = count <= config.limit;
      const retryAfter = allowed ? undefined : config.window;

      return { allowed, limit: config.limit, remaining, reset, retryAfter };
    } catch (err) {
      // Redis failed — switch to fallback mode
      console.warn(
        "[RateLimit] Redis unavailable — falling back to in-memory rate limiting.",
        err
      );
      redisState = "down";
      // Retry Redis after 30s to allow recovery without restart
      setTimeout(() => {
        redisState = "unknown";
      }, 30_000);
    }
  }

  // In-memory fallback
  return checkInMemory(key, config);
}

// ============================================================================
// RESET / ADMIN HELPERS
// ============================================================================

/**
 * Reset rate limit for a given identifier (e.g., after successful login).
 */
export async function resetRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<void> {
  const key = `rl:${config.prefix}:${identifier}`;
  try {
    await redis.del(key);
  } catch {
    memFallback.delete(key);
  }
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Build standard rate-limit HTTP headers from a RateLimitResult.
 */
export function buildRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };
  if (result.retryAfter !== undefined) {
    headers["Retry-After"] = String(result.retryAfter);
  }
  return headers;
}

// ============================================================================
// PRESET CONFIGS
// Named presets match the attack surface of each endpoint.
// ============================================================================

export const RATE_LIMIT_CONFIGS = {
  /**
   * Login: 5 per minute per identifier (email or IP).
   * Prevents brute-force attacks against credentials.
   */
  login: { prefix: "login", limit: 5, window: 60 } as RateLimitConfig,

  /**
   * Login hourly: 20 per hour per identifier.
   * Secondary limit to prevent slow brute-force.
   */
  loginHourly: { prefix: "login_h", limit: 20, window: 3600 } as RateLimitConfig,

  /**
   * Registration: 3 per minute per IP.
   * Prevents mass account creation.
   */
  register: { prefix: "register", limit: 3, window: 60 } as RateLimitConfig,

  /**
   * Forgot-password: 3 per hour per email/IP.
   * Prevents email flooding and user enumeration via timing.
   */
  forgotPassword: { prefix: "forgot_pw", limit: 3, window: 3600 } as RateLimitConfig,

  /**
   * 2FA verification: 5 per minute per user.
   * After 5 failures, a lockout key is set separately.
   */
  twoFa: { prefix: "2fa", limit: 5, window: 60 } as RateLimitConfig,

  /**
   * General authenticated API: 100 per minute per user.
   */
  api: { prefix: "api", limit: 100, window: 60 } as RateLimitConfig,

  /**
   * Data exports: 5 per hour per user.
   * Prevents data scraping via bulk exports.
   */
  export: { prefix: "export", limit: 5, window: 3600 } as RateLimitConfig,

  /**
   * Admin destructive operations: 30 per minute per user.
   * Rate limits POST, PUT, PATCH, DELETE operations for admins.
   */
  adminDestructive: { prefix: "admin_dest", limit: 30, window: 60 } as RateLimitConfig,

  /**
   * Incoming webhooks: 1000 per hour per endpoint.
   * High limit for legitimate webhook traffic.
   */
  webhook: { prefix: "webhook", limit: 1000, window: 3600 } as RateLimitConfig,

  /**
   * Stripe checkout creation: 3 per minute per user.
   * Prevents card testing / carding attacks.
   */
  checkout: { prefix: "checkout", limit: 3, window: 60 } as RateLimitConfig,

  /**
   * Cron jobs: 1 per minute per job name.
   * Prevents double-execution if cron fires twice.
   */
  cron: { prefix: "cron", limit: 1, window: 60 } as RateLimitConfig,

  /**
   * Search / autocomplete: 30 per minute per user.
   * Prevents data harvesting via repeated searches.
   */
  search: { prefix: "search", limit: 30, window: 60 } as RateLimitConfig,

  /**
   * Email check / username check: 10 per minute per IP.
   * Prevents enumeration of registered emails/usernames.
   */
  enumeration: { prefix: "enum", limit: 10, window: 60 } as RateLimitConfig,

  /**
   * Password change / email change: 3 per hour per user.
   */
  accountChange: { prefix: "acct_change", limit: 3, window: 3600 } as RateLimitConfig,

  /**
   * SSE reconnections: 10 per minute per user.
   * Prevents reconnect storms after server restart.
   */
  sseReconnect: { prefix: "sse_rc", limit: 10, window: 60 } as RateLimitConfig,

  /**
   * Upload endpoints: 20 per hour per user.
   */
  upload: { prefix: "upload", limit: 20, window: 3600 } as RateLimitConfig,
} as const;

export type RateLimitPreset = keyof typeof RATE_LIMIT_CONFIGS;

// ============================================================================
// HIGH-LEVEL HELPER
// ============================================================================

/**
 * Apply a named preset rate limit.
 *
 * @param preset  One of the RATE_LIMIT_CONFIGS keys
 * @param identifier  User ID, IP address, email, etc.
 * @returns RateLimitResult with allowed/remaining/reset
 *
 * @example
 * const result = await applyRateLimit('login', `ip:${clientIP}`);
 * if (!result.allowed) return tooManyRequests(result);
 */
export async function applyRateLimit(
  preset: RateLimitPreset,
  identifier: string
): Promise<RateLimitResult> {
  return checkRedisRateLimit(identifier, RATE_LIMIT_CONFIGS[preset]);
}

/**
 * Apply TWO rate limits simultaneously (e.g., per-minute AND per-hour).
 * Returns the more restrictive result.
 */
export async function applyDualRateLimit(
  preset1: RateLimitPreset,
  preset2: RateLimitPreset,
  identifier: string
): Promise<RateLimitResult> {
  const [r1, r2] = await Promise.all([
    applyRateLimit(preset1, identifier),
    applyRateLimit(preset2, identifier),
  ]);
  // Return the more restrictive result
  if (!r1.allowed) return r1;
  if (!r2.allowed) return r2;
  // Both allowed — return whichever has fewer remaining
  return r1.remaining <= r2.remaining ? r1 : r2;
}

// ============================================================================
// 2FA LOCKOUT HELPER
// ============================================================================

/**
 * Check if a user is locked out due to repeated 2FA failures.
 * Lockout is stored separately from the rate limit counter.
 */
export async function check2FALockout(userId: string): Promise<{
  locked: boolean;
  unlockAt?: number;
}> {
  const key = `rl:2fa_lock:${userId}`;
  try {
    const val = await redis.get(key) as string | null;
    if (val) {
      return { locked: true, unlockAt: parseInt(val, 10) };
    }
    return { locked: false };
  } catch {
    return { locked: false }; // Fail open on Redis error
  }
}

/**
 * Set a 2FA lockout after repeated failures.
 * 15-minute lockout window.
 */
export async function set2FALockout(userId: string): Promise<void> {
  const key = `rl:2fa_lock:${userId}`;
  const lockoutSeconds = 15 * 60; // 15 minutes
  const unlockAt = Math.floor(Date.now() / 1000) + lockoutSeconds;
  try {
    await redis.setex(key, lockoutSeconds, String(unlockAt));
  } catch {
    // Best-effort; in-memory not practical for lockouts across pods
  }
}

/**
 * Clear 2FA lockout after successful verification.
 */
export async function clear2FALockout(userId: string): Promise<void> {
  const key = `rl:2fa_lock:${userId}`;
  try {
    await redis.del(key);
  } catch {
    // Best-effort
  }
}
