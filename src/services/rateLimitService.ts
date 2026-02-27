/* eslint-disable @typescript-eslint/no-unused-vars */
// ============================================================================
// FILE: services/rateLimitService.ts
// PURPOSE: Rate limiting logic and tracking
// ============================================================================

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { SubscriptionTier } from '@/types/billing';

const log = logger.child({ service: 'RateLimitService' });

// =============================================================================
// TYPES
// =============================================================================

export interface RateLimitResult {
    allowed: boolean;
    limit: number;
    remaining: number;
    reset: number;
    retryAfter?: number;
}

export interface RateLimitStatus {
    identifier: string;
    limit: number;
    remaining: number;
    reset: Date;
    windowStart: Date;
    windowEnd: Date;
}

export interface RateLimitConfig {
    limit: number;
    window: number; // in seconds
    burstLimit?: number;
}

export interface UsageStats {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    averagePerDay: number;
}

// =============================================================================
// IN-MEMORY RATE LIMIT STORE
// =============================================================================
// NOTE: In production, use Redis for distributed rate limiting

interface RateLimitEntry {
    count: number;
    resetAt: number;
    windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const usageTracker = new Map<string, number[]>();

// Cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt < now) {
            rateLimitStore.delete(key);
        }
    }

    // Cleanup usage tracker (keep last 30 days)
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    for (const [key, timestamps] of usageTracker.entries()) {
        const filtered = timestamps.filter(ts => ts > thirtyDaysAgo);
        if (filtered.length === 0) {
            usageTracker.delete(key);
        } else {
            usageTracker.set(key, filtered);
        }
    }
}, 5 * 60 * 1000);

// =============================================================================
// TIER-BASED RATE LIMITS
// =============================================================================

const TIER_RATE_LIMITS: Record<SubscriptionTier, RateLimitConfig> = {
    free: {
        limit: 100,
        window: 3600, // 1 hour
        burstLimit: 20,
    },
    starter: {
        limit: 500,
        window: 3600,
        burstLimit: 50,
    },
    pro: {
        limit: 1000,
        window: 3600,
        burstLimit: 100,
    },
    team: {
        limit: 5000,
        window: 3600,
        burstLimit: 500,
    },
    enterprise: {
        limit: 10000,
        window: 3600,
        burstLimit: 1000,
    },
};

// =============================================================================
// SERVICE METHODS
// =============================================================================

export const rateLimitService = {
    /**
     * Check rate limit for a given identifier
     */
    async checkRateLimit(
        identifier: string,
        limit: number,
        window: number
    ): Promise<RateLimitResult> {
        try {
            const now = Date.now();
            const windowMs = window * 1000;
            const key = `ratelimit:${identifier}`;

            let entry = rateLimitStore.get(key);

            // Initialize or reset if window expired
            if (!entry || entry.resetAt < now) {
                entry = {
                    count: 0,
                    resetAt: now + windowMs,
                    windowStart: now,
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
                log.warn('Rate limit exceeded', {
                    identifier,
                    limit,
                    count: entry.count,
                    retryAfter: result.retryAfter,
                });
            }

            return result;
        } catch (error) {
            log.error('Error checking rate limit', { identifier }, error);
            // Fail open - allow request on error
            return {
                allowed: true,
                limit,
                remaining: limit,
                reset: Math.ceil((Date.now() + window * 1000) / 1000),
            };
        }
    },

    /**
     * Get current rate limit status
     */
    async getRateLimitStatus(identifier: string): Promise<RateLimitStatus | null> {
        try {
            const key = `ratelimit:${identifier}`;
            const entry = rateLimitStore.get(key);

            if (!entry) {
                return null;
            }

            const now = Date.now();
            const limit = 100; // Default limit

            return {
                identifier,
                limit,
                remaining: Math.max(0, limit - entry.count),
                reset: new Date(entry.resetAt),
                windowStart: new Date(entry.windowStart),
                windowEnd: new Date(entry.resetAt),
            };
        } catch (error) {
            log.error('Error getting rate limit status', { identifier }, error);
            return null;
        }
    },

    /**
     * Increment request count and track usage
     */
    async incrementRequestCount(identifier: string): Promise<number> {
        try {
            // Track in usage tracker
            const timestamps = usageTracker.get(identifier) || [];
            timestamps.push(Date.now());
            usageTracker.set(identifier, timestamps);

            return timestamps.length;
        } catch (error) {
            log.error('Error incrementing request count', { identifier }, error);
            return 0;
        }
    },

    /**
     * Reset rate limit for an identifier
     */
    async resetRateLimit(identifier: string): Promise<void> {
        try {
            const key = `ratelimit:${identifier}`;
            rateLimitStore.delete(key);
            log.info('Rate limit reset', { identifier });
        } catch (error) {
            log.error('Error resetting rate limit', { identifier }, error);
        }
    },

    /**
     * Get remaining requests for identifier
     */
    async getRemainingRequests(identifier: string, limit: number): Promise<number> {
        try {
            const key = `ratelimit:${identifier}`;
            const entry = rateLimitStore.get(key);

            if (!entry) {
                return limit;
            }

            const now = Date.now();
            if (entry.resetAt < now) {
                return limit;
            }

            return Math.max(0, limit - entry.count);
        } catch (error) {
            log.error('Error getting remaining requests', { identifier }, error);
            return limit;
        }
    },

    /**
     * Check if identifier is currently rate limited
     */
    async isRateLimited(identifier: string): Promise<boolean> {
        try {
            const key = `ratelimit:${identifier}`;
            const entry = rateLimitStore.get(key);

            if (!entry) {
                return false;
            }

            const now = Date.now();
            if (entry.resetAt < now) {
                return false;
            }

            // Assume default limit of 100
            return entry.count > 100;
        } catch (error) {
            log.error('Error checking if rate limited', { identifier }, error);
            return false;
        }
    },

    /**
     * Get API key specific rate limit configuration
     */
    async getApiKeyRateLimit(apiKeyId: string): Promise<RateLimitConfig> {
        try {
            const apiKey = await prisma.apiKey.findUnique({
                where: { id: apiKeyId },
                select: {
                    rateLimit: true,
                    rateLimitWindow: true,
                },
            });

            if (!apiKey) {
                log.warn('API key not found', { apiKeyId });
                return TIER_RATE_LIMITS.free;
            }

            return {
                limit: apiKey.rateLimit,
                window: apiKey.rateLimitWindow,
            };
        } catch (error) {
            log.error('Error getting API key rate limit', { apiKeyId }, error);
            return TIER_RATE_LIMITS.free;
        }
    },

    /**
     * Get user-specific rate limit based on subscription tier
     */
    async getUserRateLimit(userId: string): Promise<RateLimitConfig> {
        try {
            const subscription = await prisma.subscription.findFirst({
                where: {
                    userId,
                    status: {
                        in: ['ACTIVE', 'TRIALING'],
                    },
                },
                select: {
                    tier: true,
                    apiRequestsDaily: true,
                },
            });

            if (!subscription) {
                return TIER_RATE_LIMITS.free;
            }

            const tierConfig = TIER_RATE_LIMITS[subscription.tier as SubscriptionTier];

            // Override with custom limits if set
            if (subscription.apiRequestsDaily > 0) {
                return {
                    limit: Math.ceil(subscription.apiRequestsDaily / 24), // per hour
                    window: 3600,
                    burstLimit: tierConfig.burstLimit,
                };
            }

            return tierConfig;
        } catch (error) {
            log.error('Error getting user rate limit', { userId }, error);
            return TIER_RATE_LIMITS.free;
        }
    },

    /**
     * Get tier-based rate limit configuration
     */
    getTierRateLimit(tier: SubscriptionTier): RateLimitConfig {
        return TIER_RATE_LIMITS[tier] || TIER_RATE_LIMITS.free;
    },

    /**
     * Track API key usage (increment usage counter)
     */
    async trackApiUsage(apiKeyId: string): Promise<void> {
        try {
            await prisma.apiKey.update({
                where: { id: apiKeyId },
                data: {
                    lastUsedAt: new Date(),
                    usageCount: {
                        increment: 1,
                    },
                    usageCountDaily: {
                        increment: 1,
                    },
                },
            });

            log.debug('API usage tracked', { apiKeyId });
        } catch (error) {
            log.error('Error tracking API usage', { apiKeyId }, error);
        }
    },

    /**
     * Get usage statistics for an identifier
     */
    async getUsageStats(identifier: string, period: string = '30d'): Promise<UsageStats> {
        try {
            const timestamps = usageTracker.get(identifier) || [];
            const now = Date.now();

            const oneDayAgo = now - (24 * 60 * 60 * 1000);
            const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
            const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

            const today = timestamps.filter(ts => ts > oneDayAgo).length;
            const thisWeek = timestamps.filter(ts => ts > oneWeekAgo).length;
            const thisMonth = timestamps.filter(ts => ts > oneMonthAgo).length;

            const daysTracked = Math.min(30, timestamps.length > 0
                ? Math.ceil((now - timestamps[0]) / (24 * 60 * 60 * 1000))
                : 1);

            return {
                total: timestamps.length,
                today,
                thisWeek,
                thisMonth,
                averagePerDay: thisMonth / daysTracked,
            };
        } catch (error) {
            log.error('Error getting usage stats', { identifier }, error);
            return {
                total: 0,
                today: 0,
                thisWeek: 0,
                thisMonth: 0,
                averagePerDay: 0,
            };
        }
    },

    /**
     * Reset daily usage counters (for API keys)
     * Should be called by a cron job daily
     */
    async resetDailyUsageCounters(): Promise<void> {
        try {
            await prisma.apiKey.updateMany({
                data: {
                    usageCountDaily: 0,
                    usageResetAt: new Date(),
                },
            });

            log.info('Daily usage counters reset');
        } catch (error) {
            log.error('Error resetting daily usage counters', {}, error);
        }
    },

    /**
     * Get all rate limited identifiers
     */
    async getRateLimitedIdentifiers(): Promise<string[]> {
        const identifiers: string[] = [];
        const now = Date.now();

        for (const [key, entry] of rateLimitStore.entries()) {
            if (entry.resetAt > now && entry.count > 100) {
                identifiers.push(key.replace('ratelimit:', ''));
            }
        }

        return identifiers;
    },

    /**
     * Clear all rate limit data (for testing)
     */
    clearAll(): void {
        rateLimitStore.clear();
        usageTracker.clear();
        log.info('All rate limit data cleared');
    },
};

export default rateLimitService;
