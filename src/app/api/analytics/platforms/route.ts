// src/app/api/analytics/platforms/route.ts
// =============================================================================
// Platform Analytics
// =============================================================================
// Methods: GET, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 50 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { subDays, startOfDay, endOfDay, format, eachDayOfInterval } from 'date-fns';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 50;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Cache-Control': 'private, max-age=120',
};

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface PlatformStats {
  problems: number;
  commits: number;
  time: number;
  points: number;
  entries: number;
  activeDays: number;
  lastActivity: string | null;
}

type NumericSortKey = 'problems' | 'commits' | 'time' | 'entries';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(3650).default(30),
  platformId: z.string().optional(),
  sortBy: z.enum(['problems', 'commits', 'time', 'entries', 'name']).default('problems'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeTimeline: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  includeInactive: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  rateLimitResult?: { limit: number; remaining: number }
): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);

  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }

  return response;
}

async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `analytics-platforms:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return { error: apiResponse.rateLimited(60, requestId), session: null, rateLimitResult };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: apiResponse.unauthorized('Authentication required', requestId), session: null, rateLimitResult };
  }

  return { error: null, session, rateLimitResult };
}

/**
 * Type guard to check if sortBy is a numeric field
 */
function isNumericSortKey(sortBy: string): sortBy is NumericSortKey {
  return ['problems', 'commits', 'time', 'entries'].includes(sortBy);
}

/**
 * Get numeric stat value in a type-safe way
 */
function getStatValue(stats: PlatformStats, key: NumericSortKey): number {
  switch (key) {
    case 'problems':
      return stats.problems;
    case 'commits':
      return stats.commits;
    case 'time':
      return stats.time;
    case 'entries':
      return stats.entries;
    default:
      return 0;
  }
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(new NextResponse(null, { status: 401 }), requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    const connectedPlatforms = await prisma.userPlatform.count({
      where: { userId, isActive: true },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Connected-Platforms', String(connectedPlatforms));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD analytics/platforms failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const queryValidation = querySchema.safeParse({
      days: searchParams.get('days') || '30',
      platformId: searchParams.get('platformId') || undefined,
      sortBy: searchParams.get('sortBy') || 'problems',
      sortOrder: searchParams.get('sortOrder') || 'desc',
      includeTimeline: searchParams.get('includeTimeline') || undefined,
      includeInactive: searchParams.get('includeInactive') || undefined,
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const params = queryValidation.data;
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, params.days));

    // If specific platform requested
    if (params.platformId) {
      const platform = await prisma.platform.findUnique({
        where: { id: params.platformId },
        select: { id: true, name: true, slug: true, icon: true, color: true, category: true },
      });

      if (!platform) {
        return addHeaders(apiResponse.notFound('Platform', requestId), requestId, rateLimitResult);
      }

      const entries = await prisma.trackerEntry.findMany({
        where: {
          userId,
          platformId: params.platformId,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: 'desc' },
      });

      const stats = {
        problems: entries.reduce((sum, e) => sum + e.problemsSolved, 0),
        commits: entries.reduce((sum, e) => sum + e.commits, 0),
        time: entries.reduce((sum, e) => sum + e.timeSpent, 0),
        points: entries.reduce((sum, e) => sum + (e.pointsEarned || 0), 0),
        entries: entries.length,
        activeDays: new Set(entries.map(e => e.date.toDateString())).size,
      };

      // Timeline for single platform
      const timelineData = eachDayOfInterval({ start: startDate, end: endDate }).map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayEntries = entries.filter(e => format(e.date, 'yyyy-MM-dd') === dateStr);

        return {
          date: dateStr,
          problems: dayEntries.reduce((sum, e) => sum + e.problemsSolved, 0),
          commits: dayEntries.reduce((sum, e) => sum + e.commits, 0),
          time: dayEntries.reduce((sum, e) => sum + e.timeSpent, 0),
        };
      });

      return addHeaders(
        apiResponse.success({
          platform: {
            id: platform.id,
            name: platform.name,
            slug: platform.slug,
            icon: platform.icon,
            color: platform.color,
            category: platform.category,
          },
          stats,
          timeline: timelineData,
          period: { days: params.days, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        }, { meta: { requestId } }),
        requestId,
        rateLimitResult
      );
    }

    // Get all connected platforms
    const connectedPlatforms = await prisma.userPlatform.findMany({
      where: {
        userId,
        ...(params.includeInactive ? {} : { isActive: true }),
      },
      include: {
        platform: {
          select: { id: true, name: true, slug: true, icon: true, color: true, category: true },
        },
      },
    });

    // Get entries for all platforms
    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
        platformId: { not: null },
      },
      select: {
        platformId: true,
        date: true,
        problemsSolved: true,
        commits: true,
        timeSpent: true,
        pointsEarned: true,
      },
    });

    // Aggregate by platform
    const platformMap = new Map<string, {
      problems: number;
      commits: number;
      time: number;
      points: number;
      entries: number;
      days: Set<string>;
      lastActivity: Date | null;
    }>();

    entries.forEach(entry => {
      if (!entry.platformId) return;

      const existing = platformMap.get(entry.platformId) || {
        problems: 0,
        commits: 0,
        time: 0,
        points: 0,
        entries: 0,
        days: new Set<string>(),
        lastActivity: null,
      };

      existing.problems += entry.problemsSolved;
      existing.commits += entry.commits;
      existing.time += entry.timeSpent;
      existing.points += entry.pointsEarned || 0;
      existing.entries += 1;
      existing.days.add(entry.date.toDateString());

      if (!existing.lastActivity || entry.date > existing.lastActivity) {
        existing.lastActivity = entry.date;
      }

      platformMap.set(entry.platformId, existing);
    });

    // Calculate totals
    const totals = {
      problems: 0,
      commits: 0,
      time: 0,
      points: 0,
      entries: 0,
    };

    // Build platform stats array
    let platformStats = connectedPlatforms.map(up => {
      const data = platformMap.get(up.platformId) || {
        problems: 0,
        commits: 0,
        time: 0,
        points: 0,
        entries: 0,
        days: new Set<string>(),
        lastActivity: null,
      };

      totals.problems += data.problems;
      totals.commits += data.commits;
      totals.time += data.time;
      totals.points += data.points;
      totals.entries += data.entries;

      return {
        platformId: up.platform.id,
        name: up.platform.name,
        slug: up.platform.slug,
        icon: up.platform.icon,
        color: up.platform.color,
        category: up.platform.category,
        username: up.username,
        isActive: up.isActive,
        isVerified: up.isVerified,
        connectionStatus: up.connectionStatus,
        lastSyncedAt: up.lastSyncedAt?.toISOString() || null,
        stats: {
          problems: data.problems,
          commits: data.commits,
          time: data.time,
          points: data.points,
          entries: data.entries,
          activeDays: data.days.size,
          lastActivity: data.lastActivity?.toISOString() || null,
        } as PlatformStats,
        percentage: 0, // Will calculate after
      };
    });

    // Calculate percentages
    platformStats = platformStats.map(ps => ({
      ...ps,
      percentage: totals.problems > 0 ? Math.round((ps.stats.problems / totals.problems) * 100) : 0,
    }));

    // Sort - using type-safe approach
    const sortBy = params.sortBy;
    const sortOrder = params.sortOrder;

    platformStats.sort((a, b) => {
      if (sortBy === 'name') {
        // String comparison for name
        return sortOrder === 'desc'
          ? b.name.localeCompare(a.name)
          : a.name.localeCompare(b.name);
      }

      // Numeric comparison for stats fields
      if (isNumericSortKey(sortBy)) {
        const aVal = getStatValue(a.stats, sortBy);
        const bVal = getStatValue(b.stats, sortBy);
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      }

      return 0;
    });

    // Build timeline if requested
    let timeline = null;
    if (params.includeTimeline) {
      const timelineMap = new Map<string, Record<string, number>>();

      entries.forEach(entry => {
        if (!entry.platformId) return;
        const dateKey = format(entry.date, 'yyyy-MM-dd');

        if (!timelineMap.has(dateKey)) {
          timelineMap.set(dateKey, {});
        }

        const dayData = timelineMap.get(dateKey)!;
        dayData[entry.platformId] = (dayData[entry.platformId] || 0) + entry.problemsSolved;
      });

      timeline = Array.from(timelineMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    // Build response
    const response = {
      platforms: platformStats,
      totals,
      timeline,
      period: {
        days: params.days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalPlatforms: platformStats.length,
        activePlatforms: platformStats.filter(p => p.stats.entries > 0).length,
        topPlatform: platformStats[0]?.name || null,
      },
    };

    logger.info('Platform analytics fetched', {
      userId,
      platformCount: platformStats.length,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(response, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('GET analytics/platforms failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch platform analytics', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';