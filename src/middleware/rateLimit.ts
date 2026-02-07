// ============================================================================
// FILE: middleware/rateLimit.ts
// PURPOSE: Rate limiting middleware for API routes
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. lib/rateLimit.ts - Rate limit utilities
// 2. lib/rateLimiter.ts - Rate limiter implementation
// 3. lib/redis.ts - Redis for rate limit storage
// 4. services/rateLimitService.ts - Rate limit service
// 5. app/api/rate-limit/route.ts - Rate limit status endpoint
// 6. middleware/auth.ts - Auth middleware pattern
// 7. middleware/adminAuth.ts - Middleware pattern
// 8. types/api.ts - API types
// 9. config/api.ts - API configuration
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { ERROR_CODES, HTTP_STATUS, type APIError, type RateLimitInfo } from '@/types/api';

// =============================================================================
// TYPES
// =============================================================================

export interface RateLimitOptions {
    /** Maximum number of requests allowed in the window */
    limit: number;
    /** Time window in seconds */
    window: number;
    /** Function to generate unique identifier for rate limiting */
    keyGenerator?: (req: NextRequest) => string;
    /** Function to determine if request should skip rate limiting */
    skip?: (req: NextRequest) => boolean | Promise<boolean>;
    /** Custom error message */
    message?: string;
}

export interface RateLimitResult {
    allowed: boolean;
    limit: number;
    remaining: number;
    reset: number;
    retryAfter?: number;
}

// =============================================================================
// IN-MEMORY RATE LIMIT STORE
// =============================================================================
// Note: In production, use Redis or a distributed cache

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt < now) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Get client identifier from request
 * Uses IP address, forwarded IP, or user ID if authenticated
 * 
 * @param request NextRequest object
 * @returns Unique identifier string
 */
export function getClientIdentifier(request: NextRequest): string {
    // Try to get IP from various headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';

    // You can combine with user ID if available
    // const userId = request.headers.get('x-user-id');
    // return userId ? `user:${userId}` : `ip:${ip}`;

    return `ip:${ip}`;
}

/**
 * Check rate limit for a given identifier
 * 
 * @param identifier Unique identifier (e.g., IP address, user ID)
 * @param limit Maximum requests allowed
 * @param window Time window in seconds
 * @returns RateLimitResult with current status
 */
export function checkRateLimit(
    identifier: string,
    limit: number,
    window: number
): RateLimitResult {
    const now = Date.now();
    const windowMs = window * 1000;
    const key = `ratelimit:${identifier}`;

    let entry = rateLimitStore.get(key);

    // Initialize or reset if window expired
    if (!entry || entry.resetAt < now) {
        entry = {
            count: 0,
            resetAt: now + windowMs,
        };
        rateLimitStore.set(key, entry);
    }

    // Increment request count
    entry.count++;

    const remaining = Math.max(0, limit - entry.count);
    const reset = Math.ceil(entry.resetAt / 1000);
    const allowed = entry.count <= limit;

    const result: RateLimitResult = {
        allowed,
        limit,
        remaining,
        reset,
    };

    if (!allowed) {
        result.retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    }

    return result;
}

/**
 * Get rate limit headers for response
 * 
 * @param result RateLimitResult
 * @returns Headers object
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.reset.toString(),
    };

    if (result.retryAfter) {
        headers['Retry-After'] = result.retryAfter.toString();
    }

    return headers;
}

/**
 * Create rate limit error response
 * 
 * @param result RateLimitResult
 * @param message Custom error message
 * @returns NextResponse with error and rate limit headers
 */
function createRateLimitErrorResponse(
    result: RateLimitResult,
    message?: string
): NextResponse {
    const errorResponse: APIError = {
        success: false,
        error: message || 'Too many requests',
        message: message || `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
        code: ERROR_CODES.TOO_MANY_REQUESTS,
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
        timestamp: new Date().toISOString(),
    };

    const headers = getRateLimitHeaders(result);

    return NextResponse.json(errorResponse, {
        status: HTTP_STATUS.TOO_MANY_REQUESTS,
        headers,
    });
}

// =============================================================================
// MIDDLEWARE WRAPPER
// =============================================================================

/**
 * Wrap API handler with rate limiting
 * 
 * @param handler API handler function
 * @param options Rate limit options
 * @returns Wrapped handler with rate limiting
 * 
 * @example
 * export const GET = withRateLimit(
 *   async (req) => {
 *     return NextResponse.json({ data: 'success' });
 *   },
 *   { limit: 100, window: 60 }
 * );
 */
export function withRateLimit(
    handler: (request: NextRequest) => Promise<Response> | Response,
    options: RateLimitOptions
) {
    return async (request: NextRequest) => {
        // Check if should skip rate limiting
        if (options.skip) {
            const shouldSkip = await options.skip(request);
            if (shouldSkip) {
                return handler(request);
            }
        }

        // Get identifier
        const identifier = options.keyGenerator
            ? options.keyGenerator(request)
            : getClientIdentifier(request);

        // Check rate limit
        const result = checkRateLimit(identifier, options.limit, options.window);

        // Return error if rate limited
        if (!result.allowed) {
            return createRateLimitErrorResponse(result, options.message);
        }

        // Call handler
        const response = await handler(request);

        // Add rate limit headers to successful response
        const headers = getRateLimitHeaders(result);
        Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
        });

        return response;
    };
}

/**
 * Create a rate limiter instance with preset options
 * Useful for reusing the same rate limit config across multiple endpoints
 * 
 * @param options Rate limit options
 * @returns Function that wraps handlers with these rate limit options
 * 
 * @example
 * const apiLimiter = createRateLimiter({ limit: 100, window: 60 });
 * export const GET = apiLimiter(async (req) => { ... });
 */
export function createRateLimiter(options: RateLimitOptions) {
    return (handler: (request: NextRequest) => Promise<Response> | Response) => {
        return withRateLimit(handler, options);
    };
}

// =============================================================================
// PRESET RATE LIMITERS
// =============================================================================

/**
 * Standard API rate limiter
 * 100 requests per minute
 */
export const apiRateLimit = createRateLimiter({
    limit: 100,
    window: 60,
    message: 'API rate limit exceeded',
});

/**
 * Strict rate limiter for sensitive operations
 * 10 requests per minute
 */
export const strictRateLimit = createRateLimiter({
    limit: 10,
    window: 60,
    message: 'Too many attempts. Please try again later.',
});

/**
 * Auth rate limiter for login/signup
 * 5 requests per 5 minutes
 */
export const authRateLimit = createRateLimiter({
    limit: 5,
    window: 300,
    message: 'Too many authentication attempts. Please try again in 5 minutes.',
});

/**
 * Public API rate limiter
 * 1000 requests per hour
 */
export const publicApiRateLimit = createRateLimiter({
    limit: 1000,
    window: 3600,
    message: 'Hourly rate limit exceeded',
});

/**
 * Export rate limiter
 * 3 exports per hour
 */
export const exportRateLimit = createRateLimiter({
    limit: 3,
    window: 3600,
    message: 'You can only generate 3 exports per hour',
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get current rate limit status for an identifier
 * Useful for displaying rate limit info to users
 * 
 * @param identifier Unique identifier
 * @param limit Maximum requests
 * @param window Time window in seconds
 * @returns RateLimitInfo with current status
 */
export function getRateLimitStatus(
    identifier: string,
    limit: number,
    window: number
): RateLimitInfo {
    const result = checkRateLimit(identifier, limit, window);

    // Decrement count since we just checked (don't count this check)
    const key = `ratelimit:${identifier}`;
    const entry = rateLimitStore.get(key);
    if (entry) {
        entry.count--;
    }

    return {
        limit: result.limit,
        remaining: result.remaining + 1,
        reset: result.reset,
        retryAfter: result.retryAfter,
    };
}

/**
 * Reset rate limit for an identifier
 * Useful for testing or admin operations
 * 
 * @param identifier Unique identifier
 */
export function resetRateLimit(identifier: string): void {
    const key = `ratelimit:${identifier}`;
    rateLimitStore.delete(key);
}

/**
 * Clear all rate limit data
 * Useful for testing
 */
export function clearAllRateLimits(): void {
    rateLimitStore.clear();
}

// =============================================================================
// EXPORTS
// =============================================================================

export default withRateLimit;
