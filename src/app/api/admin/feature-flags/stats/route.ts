// =============================================================================
// api/admin/feature-flags/stats/route.ts
// =============================================================================
// Description: Get comprehensive feature flag statistics
// Methods: GET, OPTIONS
// Auth Required: Yes (Admin only)
// Rate Limit: 20 requests/minute
// Security: Admin verification, data aggregation, performance optimization
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { cache } from '@/lib/redis';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const statsQuerySchema = z.object({
  period: z.enum(['1h', '24h', '7d', '30d', '90d']).default('30d'),
  includeUsage: z.coerce.boolean().default(true),
  includeHistory: z.coerce.boolean().default(false),
  includeUserBreakdown: z.coerce.boolean().default(false),
  refresh: z.coerce.boolean().default(false), // Force refresh cache
});

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

const CACHE_KEYS = {
  BASIC_STATS: 'feature_flags:stats:basic',
  USAGE_STATS: 'feature_flags:stats:usage',
  HISTORY_STATS: 'feature_flags:stats:history',
  USER_BREAKDOWN: 'feature_flags:stats:users',
};

const CACHE_TTL = {
  BASIC: 300, // 5 minutes
  USAGE: 600, // 10 minutes
  HISTORY: 1800, // 30 minutes
  USER_BREAKDOWN: 900, // 15 minutes
};

// =============================================================================
// SECURITY HELPERS
// =============================================================================

async function checkAdminStatsAuth(request: NextRequest, requestId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { error: apiResponse.unauthorized('Authentication required', requestId) };
  }

  if (!session.user.isAdmin) {
    logger.warn('Non-admin attempted to access stats', {
      userId: session.user.id,
      requestId
    });
    return { error: apiResponse.forbidden('Admin access required', requestId) };
  }

  return { session };
}

// =============================================================================
// STATS CALCULATION FUNCTIONS
// =============================================================================

async function getBasicStats(refresh = false) {
  const cacheKey = CACHE_KEYS.BASIC_STATS;
  
  if (!refresh) {
    const cached = await cache.get(cacheKey);
    if (cached) return cached;
  }

  const [
    totalFlags,
    enabledFlags,
    flagsWithUsers,
    flagsWithTiers,
    flagsWithPercentage,
    recentFlags,
    flagsByTier
  ] = await Promise.all([
    // Total flags
    prisma.featureFlag.count(),
    
    // Enabled flags
    prisma.featureFlag.count({
      where: { isEnabled: true }
    }),
    
    // Flags with specific users
    prisma.featureFlag.count({
      where: {
        enabledUserIds: {
          not: { equals: [] }
        }
      }
    }),
    
    // Flags with tier restrictions
    prisma.featureFlag.count({
      where: {
        enabledTiers: {
          not: { equals: [] }
        }
      }
    }),
    
    // Flags with percentage rollout
    prisma.featureFlag.count({
      where: {
        enabledPercentage: {
          gt: 0
        }
      }
    }),
    
    // Recent flags (last 7 days)
    prisma.featureFlag.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    }),
    
    // Flags by tier usage
    prisma.featureFlag.findMany({
      where: {
        enabledTiers: {
          not: { equals: [] }
        }
      },
      select: {
        enabledTiers: true
      }
    })
  ]);

  // Process tier distribution
  const tierDistribution: Record<string, number> = {};
  flagsByTier.forEach(flag => {
    flag.enabledTiers.forEach(tier => {
      tierDistribution[tier] = (tierDistribution[tier] || 0) + 1;
    });
  });

  const stats = {
    overview: {
      totalFlags,
      enabledFlags,
      disabledFlags: totalFlags - enabledFlags,
      enabledPercentage: totalFlags > 0 ? Math.round((enabledFlags / totalFlags) * 100) : 0,
    },
    targeting: {
      flagsWithUsers,
      flagsWithTiers,
      flagsWithPercentage,
      globalFlags: enabledFlags - flagsWithUsers - flagsWithTiers - flagsWithPercentage,
    },
    recent: {
      newFlagsLast7Days: recentFlags,
    },
    distribution: {
      byTier: tierDistribution,
    },
    calculatedAt: new Date().toISOString(),
  };

  await cache.set(cacheKey, stats, CACHE_TTL.BASIC);
  return stats;
}

async function getUsageStats(period: string, refresh = false) {
  const cacheKey = `${CACHE_KEYS.USAGE_STATS}:${period}`;
  
  if (!refresh) {
    const cached = await cache.get(cacheKey);
    if (cached) return cached;
  }

  // Calculate date range based on period
  const now = new Date();
  let startDate: Date;
  
  switch (period) {
    case '1h':
      startDate = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const [
    auditLogs,
    flagChanges,
    topModifiedFlags
  ] = await Promise.all([
    // Get audit logs for feature flag operations
    prisma.auditLog.findMany({
      where: {
        category: 'feature_flags',
        createdAt: {
          gte: startDate
        }
      },
      select: {
        action: true,
        createdAt: true,
        entityId: true,
        userId: true,
      }
    }),
    
    // Get flags that were modified
    prisma.featureFlag.findMany({
      where: {
        updatedAt: {
          gte: startDate
        }
      },
      select: {
        id: true,
        key: true,
        name: true,
        updatedAt: true,
        isEnabled: true,
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10
    }),
    
    // Get most frequently modified flags
    prisma.auditLog.groupBy({
      by: ['entityId'],
      where: {
        category: 'feature_flags',
        entityId: { not: null },
        createdAt: {
          gte: startDate
        }
      },
      _count: {
        entityId: true
      },
      orderBy: {
        _count: {
          entityId: 'desc'
        }
      },
      take: 5
    })
  ]);

  // Process audit logs
  const actionCounts: Record<string, number> = {};
  const dailyActivity: Record<string, number> = {};
  const adminActivity: Record<string, number> = {};

  auditLogs.forEach(log => {
    // Count actions
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    
    // Daily activity
    const date = log.createdAt.toISOString().split('T')[0];
    dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    
    // Admin activity
    if (log.userId) {
      adminActivity[log.userId] = (adminActivity[log.userId] || 0) + 1;
    }
  });

  // Get flag details for top modified flags
  const topModifiedFlagIds = topModifiedFlags.map(f => f.entityId).filter(Boolean) as string[];
  const topModifiedFlagDetails = await prisma.featureFlag.findMany({
    where: { id: { in: topModifiedFlagIds } },
    select: { id: true, key: true, name: true }
  });

  const topModified = topModifiedFlags.map(stat => {
    const flag = topModifiedFlagDetails.find(f => f.id === stat.entityId);
    return {
      flagId: stat.entityId,
      key: flag?.key || 'Unknown',
      name: flag?.name || 'Unknown',
      modifications: stat._count.entityId
    };
  });

  const stats = {
    period: {
      start: startDate.toISOString(),
      end: now.toISOString(),
      duration: period,
    },
    activity: {
      totalOperations: auditLogs.length,
      actionBreakdown: actionCounts,
      dailyActivity,
      adminActivity: Object.keys(adminActivity).length,
    },
    modifications: {
      flagsModified: flagChanges.length,
      recentChanges: flagChanges,
      topModifiedFlags: topModified,
    },
    calculatedAt: new Date().toISOString(),
  };

  await cache.set(cacheKey, stats, CACHE_TTL.USAGE);
  return stats;
}

async function getHistoryStats(refresh = false) {
  const cacheKey = CACHE_KEYS.HISTORY_STATS;
  
  if (!refresh) {
    const cached = await cache.get(cacheKey);
    if (cached) return cached;
  }

  // Get monthly flag creation trend (last 12 months)
  const monthlyCreation = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', "createdAt") as month,
      COUNT(*) as count
    FROM "FeatureFlag"
    WHERE "createdAt" >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY month DESC
  ` as Array<{ month: Date; count: bigint }>;

  // Get flag lifecycle stats
  const lifecycleStats = await prisma.$queryRaw`
    SELECT 
      AVG(EXTRACT(DAY FROM (COALESCE("updatedAt", NOW()) - "createdAt"))) as avg_lifespan_days,
      COUNT(CASE WHEN "isEnabled" = true THEN 1 END) as currently_enabled,
      COUNT(CASE WHEN "isEnabled" = false THEN 1 END) as currently_disabled
    FROM "FeatureFlag"
  ` as Array<{ avg_lifespan_days: number; currently_enabled: bigint; currently_disabled: bigint }>;

  const stats = {
    trends: {
      monthlyCreation: monthlyCreation.map(m => ({
        month: m.month.toISOString().substring(0, 7),
        count: Number(m.count)
      }))
    },
    lifecycle: {
      averageLifespanDays: Number(lifecycleStats[0]?.avg_lifespan_days || 0),
      currentlyEnabled: Number(lifecycleStats[0]?.currently_enabled || 0),
      currentlyDisabled: Number(lifecycleStats[0]?.currently_disabled || 0),
    },
    calculatedAt: new Date().toISOString(),
  };

  await cache.set(cacheKey, stats, CACHE_TTL.HISTORY);
  return stats;
}

async function getUserBreakdownStats(refresh = false) {
  const cacheKey = CACHE_KEYS.USER_BREAKDOWN;
  
  if (!refresh) {
    const cached = await cache.get(cacheKey);
    if (cached) return cached;
  }

  // Get subscription tier distribution
  const subscriptionStats = await prisma.subscription.groupBy({
    by: ['tier'],
    _count: {
      tier: true
    }
  });

  // Get flags by tier targeting
  const tierTargeting = await prisma.featureFlag.findMany({
    where: {
      enabledTiers: {
        not: { equals: [] }
      }
    },
    select: {
      key: true,
      enabledTiers: true
    }
  });

  // Process tier targeting
  const tierUsage: Record<string, { flags: number; users: number }> = {};
  
  subscriptionStats.forEach(stat => {
    tierUsage[stat.tier] = {
      flags: 0,
      users: Number(stat._count.tier)
    };
  });

  tierTargeting.forEach(flag => {
    flag.enabledTiers.forEach(tier => {
      if (tierUsage[tier]) {
        tierUsage[tier].flags += 1;
      }
    });
  });

  // Calculate user-specific flag stats
  const userSpecificStats = await prisma.featureFlag.aggregate({
    _avg: {
      enabledPercentage: true
    },
    _sum: {
      enabledPercentage: true
    },
    where: {
      enabledUserIds: {
        not: { equals: [] }
      }
    }
  });

  const totalUserTargetedFlags = await prisma.featureFlag.count({
    where: {
      enabledUserIds: {
        not: { equals: [] }
      }
    }
  });

  const stats = {
    tiers: {
      distribution: subscriptionStats.map(s => ({
        tier: s.tier,
        users: Number(s._count.tier)
      })),
      targeting: Object.entries(tierUsage).map(([tier, data]) => ({
        tier,
        flagsTargeting: data.flags,
        totalUsers: data.users
      }))
    },
    userTargeting: {
      flagsWithUserTargeting: totalUserTargetedFlags,
      averagePercentageRollout: Number(userSpecificStats._avg.enabledPercentage || 0),
    },
    calculatedAt: new Date().toISOString(),
  };

  await cache.set(cacheKey, stats, CACHE_TTL.USER_BREAKDOWN);
  return stats;
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Auth check
    const { error, session } = await checkAdminStatsAuth(request, requestId);
    if (error) return error;

    // Rate limiting
    const rateLimitResult = await checkLimit(
      apiRateLimiter,
      20,
      `admin-stats:${session!.user.id}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = statsQuerySchema.safeParse({
      period: searchParams.get('period'),
      includeUsage: searchParams.get('includeUsage'),
      includeHistory: searchParams.get('includeHistory'),
      includeUserBreakdown: searchParams.get('includeUserBreakdown'),
      refresh: searchParams.get('refresh'),
    });

    if (!queryValidation.success) {
      return apiResponse.validationError(
        'Invalid query parameters',
        queryValidation.error.errors,
        requestId
      );
    }

    const { period, includeUsage, includeHistory, includeUserBreakdown, refresh } = queryValidation.data;

    // Gather statistics based on requested data
    const statsPromises: Promise<any>[] = [
      getBasicStats(refresh)
    ];

    if (includeUsage) {
      statsPromises.push(getUsageStats(period, refresh));
    }

    if (includeHistory) {
      statsPromises.push(getHistoryStats(refresh));
    }

    if (includeUserBreakdown) {
      statsPromises.push(getUserBreakdownStats(refresh));
    }

    const results = await Promise.all(statsPromises);

    // Compile final response
    const response: any = {
      basic: results[0],
    };

    let index = 1;
    if (includeUsage) {
      response.usage = results[index++];
    }
    if (includeHistory) {
      response.history = results[index++];
    }
    if (includeUserBreakdown) {
      response.userBreakdown = results[index++];
    }

    // Add metadata
    response.metadata = {
      requestedAt: new Date().toISOString(),
      requestId,
      period,
      includedSections: {
        basic: true,
        usage: includeUsage,
        history: includeHistory,
        userBreakdown: includeUserBreakdown,
      },
      cached: !refresh,
    };

    logger.info('Feature flag stats retrieved', {
      requestId,
      adminId: session!.user.id,
      sections: Object.keys(response).filter(k => k !== 'metadata'),
      duration: Date.now() - startTime
    });

    return apiResponse.success(response, {
      meta: { requestId },
      headers: {
        'Cache-Control': 'private, max-age=300', // 5 minute cache
      }
    });

  } catch (error) {
    logger.error('GET admin/feature-flags/stats failed', { requestId }, error);
    return apiResponse.internalError('Failed to retrieve statistics', requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';