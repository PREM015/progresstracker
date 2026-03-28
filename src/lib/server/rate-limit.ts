// src/lib/server/rate-limit.ts
// Server-side rate limiting using Redis or in-memory fallback

import { NextRequest, NextResponse } from 'next/server';

// =============================================================================
// TYPES
// =============================================================================

export interface RateLimitConfig {
  /** Max requests per window */
  limit: number;
  /** Window duration in seconds */
  window: number;
  /** Optional identifier for different limiters */
  identifier?: string;
  /** Whether to include standard rate limit headers */
  includeHeaders?: boolean;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

// =============================================================================
// IN-MEMORY FALLBACK STORE
// =============================================================================

const memoryStore = new Map<string, { count: number; resetAt: number }>();

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (entry.resetAt <= now) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

// =============================================================================
// RATE LIMITER
// =============================================================================

/**
 * Check rate limit for a given key using in-memory store.
 * For production use, replace with Redis-backed implementation.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = config.window * 1000;
  const resetAt = now + windowMs;

  const entry = memoryStore.get(key);

  if (!entry || entry.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: new Date(resetAt),
    };
  }

  entry.count++;

  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: new Date(entry.resetAt),
      retryAfter,
    };
  }

  memoryStore.set(key, entry);
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    reset: new Date(entry.resetAt),
  };
}

// =============================================================================
// PRESET CONFIGS
// =============================================================================

export const RATE_LIMITS = {
  /** General API: 100 req / minute */
  api: { limit: 100, window: 60 } as RateLimitConfig,
  /** Auth endpoints: 10 req / 15 minutes */
  auth: { limit: 10, window: 900 } as RateLimitConfig,
  /** Login: 5 attempts / 15 minutes */
  login: { limit: 5, window: 900 } as RateLimitConfig,
  /** Password reset: 3 req / hour */
  passwordReset: { limit: 3, window: 3600 } as RateLimitConfig,
  /** Email verification: 5 req / hour */
  emailVerification: { limit: 5, window: 3600 } as RateLimitConfig,
  /** Sync: 10 req / hour */
  sync: { limit: 10, window: 3600 } as RateLimitConfig,
  /** Webhooks: 60 req / minute */
  webhook: { limit: 60, window: 60 } as RateLimitConfig,
  /** Export: 5 req / hour */
  export: { limit: 5, window: 3600 } as RateLimitConfig,
} as const;

// =============================================================================
// MIDDLEWARE HELPER
// =============================================================================

/**
 * Apply rate limiting in a Next.js API route handler.
 * Returns null if allowed, or a 429 NextResponse if limited.
 */
export async function applyRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  keyFn?: (req: NextRequest) => string
): Promise<NextResponse | null> {
  const defaultKey = req.headers.get('x-real-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown';

  const key = keyFn ? keyFn(req) : `${config.identifier ?? 'api'}:${defaultKey}`;

  const result = await checkRateLimit(key, config);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: result.retryAfter },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.reset.toISOString(),
          'Retry-After': String(result.retryAfter ?? config.window),
        },
      }
    );
  }

  return null; // Allowed
}

/**
 * Build rate limit headers for a successful response.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': result.reset.toISOString(),
  };
}
