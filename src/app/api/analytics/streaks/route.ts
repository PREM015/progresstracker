// src/app/api/analytics/streaks/route.ts
// =============================================================================
// Streak Analytics
// =============================================================================
// Methods: GET, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 50 requests/minute
// =============================================================================
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { subDays, differenceInDays, format, eachDayOfInterval, startOfDay } from 'date-fns';

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
  'Cache-Control': 'private, max-age=60',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  includeHistory: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  includeCalendar: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  days: z.coerce.number().int().min(30).max(365).default(90),
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
  const rateLimitKey = `analytics-streaks:${ip}`;
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, longestStreak: true },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Current-Streak', String(user?.currentStreak || 0));
    response.headers.set('X-Longest-Streak', String(user?.longestStreak || 0));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD analytics/streaks failed', { requestId }, error);
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
      includeHistory: searchParams.get('includeHistory'),
      includeCalendar: searchParams.get('includeCalendar'),
      days: searchParams.get('days') || '90',
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const params = queryValidation.data;

    // Get user streak data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        streakStartDate: true,
        lastActivityDate: true,
        streakFreezeCount: true,
        streakFreezeUsedAt: true,
      },
    });

    // Get entries for calendar/analysis
    const endDate = new Date();
    const startDate = subDays(endDate, params.days);

    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      select: { date: true, problemsSolved: true, commits: true },
      orderBy: { date: 'asc' },
    });

    // Build activity map
    const activityMap = new Set<string>();
    entries.forEach(entry => {
      if (entry.problemsSolved > 0 || entry.commits > 0) {
        activityMap.add(format(entry.date, 'yyyy-MM-dd'));
      }
    });

    // Calculate streak stats
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const isActiveToday = activityMap.has(today);
    const wasActiveYesterday = activityMap.has(yesterday);

    const streakAtRisk = !isActiveToday && user?.currentStreak && user.currentStreak > 0;
    const canUseFreeze = (user?.streakFreezeCount || 0) > 0;

    // Get streak history
    let history = null;
    if (params.includeHistory) {
      const streakHistory = await prisma.streakHistory.findMany({
        where: { userId },
        orderBy: { startDate: 'desc' },
        take: 10,
      });

      history = streakHistory.map(sh => ({
        id: sh.id,
        startDate: sh.startDate.toISOString(),
        endDate: sh.endDate.toISOString(),
        length: sh.length,
        isActive: sh.isActive,
        isCurrent: sh.isCurrent,
        endReason: sh.endReason,
        totalProblems: sh.totalProblems,
        totalCommits: sh.totalCommits,
      }));
    }

    // Build calendar data
    let calendar = null;
    if (params.includeCalendar) {
      const allDays = eachDayOfInterval({ start: startDate, end: endDate });

      calendar = allDays.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const hasActivity = activityMap.has(dateStr);
        const dayEntries = entries.filter(e => format(e.date, 'yyyy-MM-dd') === dateStr);

        return {
          date: dateStr,
          hasActivity,
          problems: dayEntries.reduce((sum, e) => sum + e.problemsSolved, 0),
          commits: dayEntries.reduce((sum, e) => sum + e.commits, 0),
        };
      });
    }

    // Calculate milestones
    const currentStreak = user?.currentStreak || 0;
    const nextMilestones = [7, 14, 30, 60, 90, 100, 180, 365].filter(m => m > currentStreak);
    const nextMilestone = nextMilestones[0] || null;
    const daysToMilestone = nextMilestone ? nextMilestone - currentStreak : null;

    // Calculate consistency metrics
    const totalDays = params.days;
    const activeDays = activityMap.size;
    const consistencyRate = Math.round((activeDays / totalDays) * 100);

    // Build response
    const response = {
      current: {
        streak: currentStreak,
        startDate: user?.streakStartDate?.toISOString() || null,
        lastActivity: user?.lastActivityDate?.toISOString() || null,
        isActiveToday,
        streakAtRisk,
      },
      longest: {
        streak: user?.longestStreak || 0,
        isCurrentLongest: currentStreak >= (user?.longestStreak || 0),
      },
      freezes: {
        available: user?.streakFreezeCount || 0,
        lastUsed: user?.streakFreezeUsedAt?.toISOString() || null,
        canUse: canUseFreeze && streakAtRisk,
      },
      milestones: {
        nextMilestone,
        daysToMilestone,
        achieved: [7, 14, 30, 60, 90, 100, 180, 365].filter(m => currentStreak >= m),
      },
      consistency: {
        rate: consistencyRate,
        activeDays,
        totalDays,
        period: `${params.days} days`,
      },
      history,
      calendar,
    };

    logger.info('Streak analytics fetched', {
      userId,
      currentStreak,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(response, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('GET analytics/streaks failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch streak analytics', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';