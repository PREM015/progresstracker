// src/app/api/analytics/time-spent/route.ts
// =============================================================================
// Time Tracking Analytics
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
import { subDays, startOfDay, endOfDay, format, getDay, eachDayOfInterval } from 'date-fns';

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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  groupBy: z.enum(['day', 'week', 'month', 'platform', 'category']).default('day'),
  platformId: z.string().optional(),
  includeBreakdown: z.enum(['true', 'false']).optional().transform(v => v !== 'false'),
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
  const rateLimitKey = `analytics-time-spent:${ip}`;
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

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
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
    const { error, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(new NextResponse(null, { status: 401 }), requestId, rateLimitResult);
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Metric-Type', 'time');

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD analytics/time-spent failed', { requestId }, error);
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
      groupBy: searchParams.get('groupBy') || 'day',
      platformId: searchParams.get('platformId'),
      includeBreakdown: searchParams.get('includeBreakdown'),
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

    // Build where clause
    const where: {
      userId: string;
      date: { gte: Date; lte: Date };
      platformId?: string;
    } = {
      userId,
      date: { gte: startDate, lte: endDate },
    };

    if (params.platformId) {
      where.platformId = params.platformId;
    }

    // Fetch entries
    const entries = await prisma.trackerEntry.findMany({
      where,
      select: {
        date: true,
        timeSpent: true,
        focusTime: true,
        category: true,
        platformId: true,
        platform: { select: { name: true, icon: true, color: true } },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate totals
    const totalTime = entries.reduce((sum, e) => sum + e.timeSpent, 0);
    const totalFocusTime = entries.reduce((sum, e) => sum + (e.focusTime || 0), 0);
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    const activeDays = new Set(entries.filter(e => e.timeSpent > 0).map(e => e.date.toDateString())).size;

    // Group data based on groupBy parameter
    let groupedData: Array<{ key: string; label: string; time: number; focusTime: number; count: number }> = [];

    if (params.groupBy === 'day') {
      const dayMap = new Map<string, { time: number; focusTime: number; count: number }>();

      allDays.forEach(day => {
        const key = format(day, 'yyyy-MM-dd');
        dayMap.set(key, { time: 0, focusTime: 0, count: 0 });
      });

      entries.forEach(entry => {
        const key = format(entry.date, 'yyyy-MM-dd');
        const existing = dayMap.get(key)!;
        existing.time += entry.timeSpent;
        existing.focusTime += entry.focusTime || 0;
        existing.count += 1;
      });

      groupedData = Array.from(dayMap.entries()).map(([key, data]) => ({
        key,
        label: format(new Date(key), 'MMM d'),
        time: data.time,
        focusTime: data.focusTime,
        count: data.count,
      }));

    } else if (params.groupBy === 'week') {
      const weekMap = new Map<string, { time: number; focusTime: number; count: number }>();

      entries.forEach(entry => {
        const key = format(entry.date, 'yyyy-ww');
        const existing = weekMap.get(key) || { time: 0, focusTime: 0, count: 0 };
        existing.time += entry.timeSpent;
        existing.focusTime += entry.focusTime || 0;
        existing.count += 1;
        weekMap.set(key, existing);
      });

      groupedData = Array.from(weekMap.entries())
        .map(([key, data]) => ({
          key,
          label: `Week ${key.split('-')[1]}`,
          time: data.time,
          focusTime: data.focusTime,
          count: data.count,
        }))
        .sort((a, b) => a.key.localeCompare(b.key));

    } else if (params.groupBy === 'platform') {
      const platformMap = new Map<string, { name: string; time: number; focusTime: number; count: number }>();

      entries.forEach(entry => {
        if (entry.platformId && entry.platform) {
          const existing = platformMap.get(entry.platformId) || {
            name: entry.platform.name,
            time: 0,
            focusTime: 0,
            count: 0,
          };
          existing.time += entry.timeSpent;
          existing.focusTime += entry.focusTime || 0;
          existing.count += 1;
          platformMap.set(entry.platformId, existing);
        }
      });

      groupedData = Array.from(platformMap.entries())
        .map(([key, data]) => ({
          key,
          label: data.name,
          time: data.time,
          focusTime: data.focusTime,
          count: data.count,
        }))
        .sort((a, b) => b.time - a.time);

    } else if (params.groupBy === 'category') {
      const categoryMap = new Map<string, { time: number; focusTime: number; count: number }>();

      entries.forEach(entry => {
        const cat = entry.category || 'OTHER';
        const existing = categoryMap.get(cat) || { time: 0, focusTime: 0, count: 0 };
        existing.time += entry.timeSpent;
        existing.focusTime += entry.focusTime || 0;
        existing.count += 1;
        categoryMap.set(cat, existing);
      });

      groupedData = Array.from(categoryMap.entries())
        .map(([key, data]) => ({
          key,
          label: key,
          time: data.time,
          focusTime: data.focusTime,
          count: data.count,
        }))
        .sort((a, b) => b.time - a.time);
    }

    // Day of week breakdown
    let dayOfWeekBreakdown = null;
    if (params.includeBreakdown) {
      const dowStats = DAY_NAMES.map((name, index) => ({
        day: name,
        dayIndex: index,
        time: 0,
        focusTime: 0,
        count: 0,
      }));

      entries.forEach(entry => {
        const dow = getDay(entry.date);
        dowStats[dow].time += entry.timeSpent;
        dowStats[dow].focusTime += entry.focusTime || 0;
        dowStats[dow].count += 1;
      });

      // Calculate averages
      const dowCounts = [0, 0, 0, 0, 0, 0, 0];
      allDays.forEach(day => {
        dowCounts[getDay(day)]++;
      });

      dayOfWeekBreakdown = dowStats.map((stat, i) => ({
        ...stat,
        avgTime: dowCounts[i] > 0 ? Math.round(stat.time / dowCounts[i]) : 0,
        avgFocusTime: dowCounts[i] > 0 ? Math.round(stat.focusTime / dowCounts[i]) : 0,
      }));
    }

    // Calculate statistics
    const avgTimePerDay = activeDays > 0 ? Math.round(totalTime / activeDays) : 0;
    const avgSessionTime = entries.length > 0 ? Math.round(totalTime / entries.length) : 0;
    const focusRatio = totalTime > 0 ? Math.round((totalFocusTime / totalTime) * 100) : 0;

    // Find longest session
    const longestSession = entries.reduce((max, e) => e.timeSpent > max ? e.timeSpent : max, 0);

    // Build response
    const response = {
      summary: {
        totalTime,
        totalTimeFormatted: formatDuration(totalTime),
        totalFocusTime,
        totalFocusTimeFormatted: formatDuration(totalFocusTime),
        activeDays,
        totalDays: allDays.length,
        avgTimePerDay,
        avgTimePerDayFormatted: formatDuration(avgTimePerDay),
        avgSessionTime,
        avgSessionTimeFormatted: formatDuration(avgSessionTime),
        focusRatio,
        longestSession,
        longestSessionFormatted: formatDuration(longestSession),
        totalSessions: entries.length,
      },
      data: groupedData.map(item => ({
        ...item,
        timeFormatted: formatDuration(item.time),
        focusTimeFormatted: formatDuration(item.focusTime),
        percentage: totalTime > 0 ? Math.round((item.time / totalTime) * 100) : 0,
      })),
      dayOfWeek: dayOfWeekBreakdown,
      period: {
        days: params.days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        groupBy: params.groupBy,
      },
    };

    logger.info('Time spent analytics fetched', {
      userId,
      days: params.days,
      groupBy: params.groupBy,
      totalTime,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(response, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('GET analytics/time-spent failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch time analytics', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';