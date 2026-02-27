// src/lib/apiTiming.ts
// ---------------------------------------------------------------------------
// API Timing Middleware
// Wraps Next.js API route handlers to automatically:
//   1. Measure response time
//   2. Inject X-Response-Time header
//   3. Track via Sentry/performanceTracking for slow requests
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { performanceTracking } from './performanceTracking';
import { logger } from './logger';

type RouteHandler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse>;

const SLOW_THRESHOLD_MS = 500;

/**
 * Wraps a Next.js App Router handler with automatic timing.
 *
 * Usage:
 * ```ts
 * import { withTiming } from '@/lib/apiTiming';
 *
 * async function handler(req: NextRequest) { ... }
 * export const GET = withTiming('GET /api/stats/dashboard', handler);
 * ```
 */
export function withTiming(
    label: string,
    handler: RouteHandler
): RouteHandler {
    return async (req: NextRequest, ctx?: unknown) => {
        const startMs = performance.now();
        const timerName = `api:${label}:${Date.now()}`;

        performanceTracking.startTimer(timerName);

        let response: NextResponse;
        let status = 500;

        try {
            response = await handler(req, ctx);
            status = response.status;
        } catch (error) {
            // Re-throw after recording metrics
            const duration = performance.now() - startMs;
            performanceTracking.trackApiCall(label, req.method, duration, 500);
            logger.error(`[apiTiming] ${label} threw after ${duration.toFixed(0)}ms`, { error });
            throw error;
        }

        const duration = performance.now() - startMs;
        const durationMs = Math.round(duration);

        // Record metric
        performanceTracking.endTimer(timerName, {
            endpoint: label,
            method: req.method,
            status: String(status),
        });

        performanceTracking.trackApiCall(label, req.method, duration, status);

        // Inject header
        response.headers.set('X-Response-Time', `${durationMs}ms`);
        response.headers.set('Server-Timing', `total;dur=${durationMs}`);

        // Log slow requests
        if (duration > SLOW_THRESHOLD_MS) {
            logger.warn(`[apiTiming] Slow response: ${label} — ${durationMs}ms`, {
                endpoint: label,
                method: req.method,
                status,
                durationMs,
            });
        }

        return response;
    };
}

/**
 * Creates a timing wrapper pre-bound to a route prefix.
 * Useful for applying to multiple methods in the same file.
 *
 * Usage:
 * ```ts
 * const timed = createTimedRoute('/api/goals');
 *
 * export const GET = timed('GET', getHandler);
 * export const POST = timed('POST', postHandler);
 * ```
 */
export function createTimedRoute(routePath: string) {
    return (method: string, handler: RouteHandler): RouteHandler => {
        return withTiming(`${method} ${routePath}`, handler);
    };
}
