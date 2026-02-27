// ============================================================================
// FILE: middleware/subscription.ts
// PURPOSE: Subscription/feature access middleware
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. middleware/auth.ts - Auth middleware (prerequisite)
// 2. middleware/adminAuth.ts - Middleware pattern
// 3. services/stripeService.ts - Subscription service
// 4. lib/auth.ts - Auth utilities
// 5. types/billing.ts - Subscription types
// 6. prisma/schema.prisma - Subscription model
// 7. config/billing.ts - Billing configuration
// 8. app/api/stripe/subscription/route.ts - Subscription endpoint
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ERROR_CODES, HTTP_STATUS, type APIError } from '@/types/api';
import {
    type SubscriptionTier,
    type Subscription,
    getTierLimits,
    isSubscriptionActive,
} from '@/types/billing';
import { getSession, getUserFromToken, validateToken } from './auth';

// =============================================================================
// TYPES
// =============================================================================

export interface SubscriptionContext {
    userId: string;
    subscription: Subscription;
    tier: SubscriptionTier;
}

export type SubscriptionHandler = (
    request: NextRequest,
    context: SubscriptionContext
) => Promise<Response> | Response;

export interface SubscriptionOptions {
    /** Required subscription tier (or array of acceptable tiers) */
    requiredTier?: SubscriptionTier | SubscriptionTier[];
    /** Required feature flag */
    requiredFeature?: string;
    /** Allow free tier access */
    allowFreeTier?: boolean;
    /** Check usage limits */
    checkLimits?: {
        platforms?: boolean;
        exports?: boolean;
        apiRequests?: boolean;
    };
}

export interface UsageCheckResult {
    allowed: boolean;
    current: number;
    limit: number;
    percentage: number;
}

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Get user's active subscription
 * 
 * @param userId User ID
 * @returns Subscription object or null if not found
 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
    try {
        const subscription = await prisma.subscription.findFirst({
            where: {
                userId,
                status: {
                    in: ['ACTIVE', 'TRIALING'],
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (!subscription) {
            return null;
        }

        return subscription as unknown as Subscription;
    } catch (error) {
        console.error('Error fetching subscription:', error);
        return null;
    }
}

/**
 * Check if user has required subscription tier
 * 
 * @param userId User ID
 * @param requiredTier Required tier (or array of tiers)
 * @returns boolean indicating if tier requirement is met
 */
export async function checkSubscriptionTier(
    userId: string,
    requiredTier: SubscriptionTier | SubscriptionTier[]
): Promise<boolean> {
    const subscription = await getSubscription(userId);

    if (!subscription) {
        // No subscription = free tier
        const requiredTiers = Array.isArray(requiredTier) ? requiredTier : [requiredTier];
        return requiredTiers.includes('free');
    }

    const requiredTiers = Array.isArray(requiredTier) ? requiredTier : [requiredTier];
    return requiredTiers.includes(subscription.tier as SubscriptionTier);
}

/**
 * Check if user has access to a specific feature
 * 
 * @param userId User ID
 * @param feature Feature name
 * @returns boolean indicating if feature access is allowed
 */
export async function checkFeatureAccess(
    userId: string,
    feature: string
): Promise<boolean> {
    const subscription = await getSubscription(userId);

    if (!subscription) {
        // Free tier features
        const freeFeatures = ['basic_tracking', 'daily_sync', 'basic_analytics'];
        return freeFeatures.includes(feature);
    }

    // Check if feature is in subscription features
    return subscription.features.includes(feature);
}

/**
 * Check usage limit for a specific limit type
 * 
 * @param userId User ID
 * @param limitType Type of limit to check
 * @returns UsageCheckResult with current usage and limit
 */
export async function checkUsageLimit(
    userId: string,
    limitType: 'platforms' | 'exports' | 'apiRequests'
): Promise<UsageCheckResult> {
    const subscription = await getSubscription(userId);

    if (!subscription) {
        // Free tier limits
        const freeLimits = getTierLimits('free');

        switch (limitType) {
            case 'platforms':
                return {
                    allowed: true,
                    current: 0,
                    limit: freeLimits.platforms,
                    percentage: 0,
                };
            case 'exports':
                return {
                    allowed: true,
                    current: 0,
                    limit: freeLimits.exportsPerMonth,
                    percentage: 0,
                };
            case 'apiRequests':
                return {
                    allowed: false,
                    current: 0,
                    limit: 0,
                    percentage: 0,
                };
        }
    }

    let current = 0;
    let limit = 0;

    switch (limitType) {
        case 'platforms':
            current = subscription.currentPlatformCount;
            limit = subscription.platformLimit;
            break;
        case 'exports':
            current = subscription.currentExportCount;
            limit = subscription.exportLimitMonthly;
            break;
        case 'apiRequests':
            // This would need to fetch from a separate tracking system
            current = 0;
            limit = subscription.apiRequestsDaily;
            break;
    }

    const percentage = limit > 0 ? Math.round((current / limit) * 100) : 0;
    const allowed = current < limit;

    return {
        allowed,
        current,
        limit,
        percentage,
    };
}

/**
 * Get tier hierarchy for comparison
 */
const TIER_HIERARCHY: SubscriptionTier[] = ['free', 'starter', 'pro', 'team', 'enterprise'];

/**
 * Check if user's tier is at least the required tier
 * 
 * @param userTier User's current tier
 * @param requiredTier Required minimum tier
 * @returns boolean indicating if tier is sufficient
 */
function meetsMinimumTier(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
    const userIndex = TIER_HIERARCHY.indexOf(userTier);
    const requiredIndex = TIER_HIERARCHY.indexOf(requiredTier);
    return userIndex >= requiredIndex;
}

/**
 * Create error response
 * 
 * @param error Error message
 * @param code Error code
 * @param status HTTP status code
 * @param details Additional details
 * @returns NextResponse with error
 */
function createErrorResponse(
    error: string,
    code: string,
    status: number,
    details?: Record<string, unknown>
): NextResponse {
    const errorResponse: APIError = {
        success: false,
        error,
        message: error,
        code,
        statusCode: status,
        details,
        timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, { status });
}

// =============================================================================
// MIDDLEWARE WRAPPER
// =============================================================================

/**
 * Wrap API handler with subscription check
 * Requires user to have an active subscription with sufficient tier
 * 
 * @param handler API handler function
 * @param options Subscription options
 * @returns Wrapped handler with subscription check
 * 
 * @example
 * export const GET = withSubscription(
 *   async (req, { subscription, userId }) => {
 *     return NextResponse.json({ tier: subscription.tier });
 *   },
 *   { requiredTier: 'pro' }
 * );
 */
export function withSubscription(
    handler: SubscriptionHandler,
    options: SubscriptionOptions = {}
) {
    return async (request: NextRequest) => {
        // First, check authentication
        const token = await getSession(request);

        if (!token || !validateToken(token)) {
            return createErrorResponse(
                'Authentication required',
                ERROR_CODES.UNAUTHORIZED,
                HTTP_STATUS.UNAUTHORIZED
            );
        }

        const user = getUserFromToken(token);
        const userId = user.id;

        // Get subscription
        const subscription = await getSubscription(userId);

        // Determine current tier
        const currentTier: SubscriptionTier = subscription?.tier as SubscriptionTier || 'free';

        // Check if free tier is allowed
        if (!subscription && !options.allowFreeTier) {
            return createErrorResponse(
                'Active subscription required',
                ERROR_CODES.FORBIDDEN,
                HTTP_STATUS.FORBIDDEN,
                {
                    currentTier: 'free',
                    upgradeUrl: '/pricing',
                }
            );
        }

        // Check subscription status
        if (subscription && !isSubscriptionActive(subscription)) {
            return createErrorResponse(
                'Active subscription required',
                ERROR_CODES.FORBIDDEN,
                HTTP_STATUS.FORBIDDEN,
                {
                    currentTier,
                    subscriptionStatus: subscription.status,
                    message: 'Your subscription is not active',
                }
            );
        }

        // Check tier requirement
        if (options.requiredTier) {
            const requiredTiers = Array.isArray(options.requiredTier)
                ? options.requiredTier
                : [options.requiredTier];

            const hasSufficientTier = requiredTiers.some(tier =>
                meetsMinimumTier(currentTier, tier)
            );

            if (!hasSufficientTier) {
                return createErrorResponse(
                    `This feature requires a ${options.requiredTier} subscription`,
                    ERROR_CODES.FORBIDDEN,
                    HTTP_STATUS.FORBIDDEN,
                    {
                        currentTier,
                        requiredTier: options.requiredTier,
                        upgradeUrl: '/pricing',
                    }
                );
            }
        }

        // Check feature access
        if (options.requiredFeature) {
            const hasFeature = await checkFeatureAccess(userId, options.requiredFeature);

            if (!hasFeature) {
                return createErrorResponse(
                    `This feature is not available on your current plan`,
                    ERROR_CODES.FORBIDDEN,
                    HTTP_STATUS.FORBIDDEN,
                    {
                        currentTier,
                        requiredFeature: options.requiredFeature,
                        upgradeUrl: '/pricing',
                    }
                );
            }
        }

        // Check usage limits
        if (options.checkLimits) {
            if (options.checkLimits.platforms) {
                const platformUsage = await checkUsageLimit(userId, 'platforms');
                if (!platformUsage.allowed) {
                    return createErrorResponse(
                        `Platform limit reached (${platformUsage.limit})`,
                        ERROR_CODES.FORBIDDEN,
                        HTTP_STATUS.FORBIDDEN,
                        {
                            current: platformUsage.current,
                            limit: platformUsage.limit,
                            upgradeUrl: '/pricing',
                        }
                    );
                }
            }

            if (options.checkLimits.exports) {
                const exportUsage = await checkUsageLimit(userId, 'exports');
                if (!exportUsage.allowed) {
                    return createErrorResponse(
                        `Export limit reached (${exportUsage.limit} per month)`,
                        ERROR_CODES.FORBIDDEN,
                        HTTP_STATUS.FORBIDDEN,
                        {
                            current: exportUsage.current,
                            limit: exportUsage.limit,
                            upgradeUrl: '/pricing',
                        }
                    );
                }
            }

            if (options.checkLimits.apiRequests) {
                const apiUsage = await checkUsageLimit(userId, 'apiRequests');
                if (!apiUsage.allowed) {
                    return createErrorResponse(
                        `API request limit reached (${apiUsage.limit} per day)`,
                        ERROR_CODES.TOO_MANY_REQUESTS,
                        HTTP_STATUS.TOO_MANY_REQUESTS,
                        {
                            current: apiUsage.current,
                            limit: apiUsage.limit,
                            upgradeUrl: '/pricing',
                        }
                    );
                }
            }
        }

        // Create context with subscription fallback
        const context: SubscriptionContext = {
            userId,
            subscription: subscription || {
                tier: 'free',
                status: 'active',
            } as Subscription,
            tier: currentTier,
        };

        return handler(request, context);
    };
}

/**
 * Check if user can perform an action based on subscription
 * Useful for conditional features in the UI
 * 
 * @param userId User ID
 * @param requiredTier Required tier
 * @returns boolean indicating if action is allowed
 */
export async function canPerformAction(
    userId: string,
    requiredTier: SubscriptionTier
): Promise<boolean> {
    const subscription = await getSubscription(userId);
    const currentTier: SubscriptionTier = subscription?.tier as SubscriptionTier || 'free';

    return meetsMinimumTier(currentTier, requiredTier);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default withSubscription;
