// src/lib/withCache.ts
// ---------------------------------------------------------------------------
// Generic Read-Through Cache Wrapper with Stale-While-Revalidate (SWR)
//
// Cache flow:
//   1. Check Redis for cached data
//   2. If fresh (within TTL)       → return immediately, X-Cache: HIT
//   3. If stale (within stale TTL) → return stale data, revalidate in background
//   4. If missing                  → run handler, cache result, X-Cache: MISS
//
// The SWR strategy means users almost always get < 10ms responses.
// Background revalidation keeps the cache warm without blocking.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { CacheService } from '@/services/cacheService';
import { withTiming } from '@/lib/apiTiming';
import { logger } from '@/lib/logger';

type RouteHandler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse>;

interface CacheOptions {
    /** Cache TTL in seconds (default 300 = 5 min) */
    ttl?: number;
    /** Stale-while-revalidate window in seconds BEYOND ttl (default: same as ttl).
     *  Total max age before hard miss = ttl + staleTtl.
     *  E.g. ttl=300, staleTtl=300 → fresh for 5m, stale-but-served for 10m total. */
    staleTtl?: number;
    /** Custom cache key generator. Receives the incoming request. Return null to skip cache. */
    keyGenerator?: (req: NextRequest) => string | Promise<string | null> | null;
    /** Optional label for the withTiming wrapper. If provided, timing is applied. */
    timingLabel?: string;
}

/** Envelope stored in Redis alongside the data */
export interface CacheEnvelope<T = unknown> {
    data: T;
    cachedAt: number;   // epoch ms
    ttlMs: number;      // fresh window in ms
    staleTtlMs: number; // stale window in ms (beyond fresh)
}

/**
 * Wraps a Next.js App Router handler with read-through Redis caching + SWR.
 */
export function withCache(
    handler: RouteHandler,
    options?: CacheOptions,
): RouteHandler {
    const ttl = options?.ttl ?? 300;
    const staleTtl = options?.staleTtl ?? ttl; // defaults to same as ttl
    const keyGenerator =
        options?.keyGenerator ?? ((req: NextRequest) => `cache:${req.nextUrl.pathname}`);

    // Total Redis TTL = fresh + stale window (so Redis auto-evicts after both expire)
    const redisTtl = ttl + staleTtl;

    const wrapped: RouteHandler = async (req: NextRequest, ctx?: unknown) => {
        const cacheKey = await keyGenerator(req);

        // If no key generated (e.g. unauthenticated), skip cache
        if (!cacheKey) {
            return handler(req, ctx);
        }

        // ---- Check Redis ----
        try {
            const envelope = await CacheService.get(cacheKey) as CacheEnvelope | null;

            if (envelope?.data != null && envelope.cachedAt) {
                const age = Date.now() - envelope.cachedAt;
                const isFresh = age < envelope.ttlMs;
                const isStale = !isFresh && age < envelope.ttlMs + envelope.staleTtlMs;

                if (isFresh) {
                    // ---- FRESH HIT → return immediately ----
                    const responseData = typeof envelope.data === 'object' && envelope.data !== null
                        ? { ...envelope.data, cached: true, source: 'cache' }
                        : envelope.data;

                    const res = NextResponse.json(responseData);
                    res.headers.set('X-Cache', 'HIT');
                    res.headers.set('Age', String(Math.round(age / 1000)));
                    return res;
                }

                if (isStale) {
                    // ---- STALE HIT → return stale + revalidate in background ----
                    const responseData = typeof envelope.data === 'object' && envelope.data !== null
                        ? { ...envelope.data, cached: true, source: 'cache-stale' }
                        : envelope.data;

                    const res = NextResponse.json(responseData);
                    res.headers.set('X-Cache', 'STALE');
                    res.headers.set('Age', String(Math.round(age / 1000)));

                    // Fire-and-forget background revalidation
                    revalidateInBackground(handler, req, ctx, cacheKey, ttl, staleTtl, redisTtl);

                    return res;
                }
                // else: beyond stale window → treat as MISS and fall through
            }
        } catch (err) {
            logger.warn('[withCache] Redis read failed, falling through to handler', {
                cacheKey,
                err,
            });
        }

        // ---- MISS → Check/Set Lock to prevent Stampede ----
        const lockKey = `lock:${cacheKey}`;
        const LOCK_TTL_MS = 10000; // 10s max lock time
        const WAIT_STEP_MS = 100;
        const MAX_WAIT_MS = 3000;

        let attempts = 0;
        while (attempts * WAIT_STEP_MS < MAX_WAIT_MS) {
            // Try to acquire lock
            const isLocked = await CacheService.get(lockKey);

            if (!isLocked) {
                // Acquired lock! Set it and proceed to compute
                await CacheService.set(lockKey, '1', LOCK_TTL_MS / 1000);
                break;
            }

            // Lock exists, wait and retry
            await new Promise(resolve => setTimeout(resolve, WAIT_STEP_MS));
            attempts++;

            // Re-check cache in case leader finished
            const freshEnvelope = await CacheService.get(cacheKey) as CacheEnvelope | null;
            if (freshEnvelope?.data) {
                const responseData = typeof freshEnvelope.data === 'object' && freshEnvelope.data !== null
                    ? { ...freshEnvelope.data, cached: true, source: 'cache-waiting' }
                    : freshEnvelope.data;

                const res = NextResponse.json(responseData);
                res.headers.set('X-Cache', 'HIT-AFTER-WAIT');
                return res;
            }
        }

        try {
            // Run handler
            const response = await handler(req, ctx);

            // Only cache 2xx JSON responses
            if (response.status >= 200 && response.status < 300) {
                try {
                    const cloned = response.clone();
                    const json = await cloned.json();
                    const envelope: CacheEnvelope = {
                        data: json,
                        cachedAt: Date.now(),
                        ttlMs: ttl * 1000,
                        staleTtlMs: staleTtl * 1000,
                    };
                    await CacheService.set(cacheKey, envelope, redisTtl);
                } catch (err) {
                    logger.warn('[withCache] Failed to cache response', { cacheKey, err });
                }
            }

            response.headers.set('X-Cache', 'MISS');
            return response;
        } finally {
            // Always release lock
            await CacheService.del(lockKey).catch(err => logger.warn('[withCache] Failed to release lock', { lockKey, err }));
        }
    };

    // Optionally compose with timing
    if (options?.timingLabel) {
        return withTiming(options.timingLabel, wrapped);
    }

    return wrapped;
}

// ---------------------------------------------------------------------------
// Background revalidation (fire-and-forget)
// ---------------------------------------------------------------------------
function revalidateInBackground(
    handler: RouteHandler,
    req: NextRequest,
    ctx: unknown,
    cacheKey: string,
    ttl: number,
    staleTtl: number,
    redisTtl: number,
) {
    // Don't await — this runs after the response is sent
    (async () => {
        try {
            const response = await handler(req, ctx);
            if (response.status >= 200 && response.status < 300) {
                const json = await response.json();
                const envelope: CacheEnvelope = {
                    data: json,
                    cachedAt: Date.now(),
                    ttlMs: ttl * 1000,
                    staleTtlMs: staleTtl * 1000,
                };
                await CacheService.set(cacheKey, envelope, redisTtl);
                logger.debug('[withCache] Background revalidation succeeded', { cacheKey });
            }
        } catch (err) {
            logger.warn('[withCache] Background revalidation failed', { cacheKey, err });
        }
    })();
}
