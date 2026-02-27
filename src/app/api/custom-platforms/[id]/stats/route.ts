// src/app/api/custom-platforms/[id]/stats/route.ts
/**
 * Custom Platform Stats Routes
 * 
 * GET /api/custom-platforms/[id]/stats - Get detailed platform statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, format } from 'date-fns';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  UnauthorizedError,
  
  NotFoundError,
  ValidationError,
  toApiError,
} from '@/lib/apiError';
import { rateLimiters, checkRateLimit } from '@/lib/rateLimiter';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/custom-platforms/[id]/stats' });

const ALLOWED_METHODS = ['GET', 'OPTIONS'];

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const idSchema = z.string().cuid({ message: 'Invalid platform ID format' });

const querySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y', 'all']).default('30d'),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
});

// =============================================================================
// TYPES
// =============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface DailyData {
  date: string;
  problemsSolved: number;
  timeSpent: number;
  entries: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getRequestContext(req: NextRequest) {
  return {
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
    requestId: req.headers.get('x-request-id') || crypto.randomUUID(),
  };
}

function errorResponse(error: unknown, requestId: string): NextResponse {
  const apiError = toApiError(error, requestId);
  apiError.log();

  return NextResponse.json(
    {
      success: false,
      error: apiError.message,
      code: apiError.code,
      details: apiError.details,
      timestamp: apiError.timestamp,
      requestId,
    },
    { 
      status: apiError.statusCode,
      headers: { 'X-Request-ID': requestId },
    }
  );
}

function successResponse<T>(
  data: T, 
  status: number = 200,
  headers: Record<string, string> = {}
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { 
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }
  );
}

function getDateRange(period: string): { start: Date; end: Date } {
  const end = endOfDay(new Date());
  let start: Date;

  switch (period) {
    case '7d':
      start = startOfDay(subDays(end, 7));
      break;
    case '30d':
      start = startOfDay(subDays(end, 30));
      break;
    case '90d':
      start = startOfDay(subDays(end, 90));
      break;
    case '1y':
      start = startOfDay(subDays(end, 365));
      break;
    case 'all':
    default:
      start = new Date(0); // Beginning of time
      break;
  }

  return { start, end };
}

// =============================================================================
// GET - Get Platform Statistics
// =============================================================================

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { requestId } = getRequestContext(req);
  const startTime = Date.now();

  try {
    // 1. Validate ID
    const { id } = await params;
    const validatedId = idSchema.safeParse(id);
    if (!validatedId.success) {
      throw new ValidationError('Invalid platform ID', [{ field: 'id', message: validatedId.error.errors[0].message }]);
    }

    // 2. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // 3. Rate limiting
    const rateLimitResult = await checkRateLimit(`custom-platforms:stats:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429, headers: { 'Retry-After': '60', 'X-Request-ID': requestId } }
      );
    }

    // 4. Validate query params
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const validatedQuery = querySchema.safeParse(searchParams);
    if (!validatedQuery.success) {
      throw new ValidationError(
        'Invalid query parameters',
        validatedQuery.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const { period, groupBy } = validatedQuery.data;

    // 5. Check platform ownership
    const platform = await prisma.customPlatform.findFirst({
      where: { id: validatedId.data, userId },
      select: { 
        id: true, 
        name: true, 
        category: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!platform) {
      throw new NotFoundError('Custom platform');
    }

    // 6. Get date range
    const { start, end } = getDateRange(period);

    // 7. Get aggregate stats
    const [
      totalStats,
      entriesCount,
      firstEntry,
      lastEntry,
      dailyData,
    ] = await Promise.all([
      // Total aggregates
      prisma.trackerEntry.aggregate({
        where: {
          customPlatformId: validatedId.data,
          date: { gte: start, lte: end },
        },
        _sum: {
          problemsSolved: true,
          problemsAttempted: true,
          timeSpent: true,
          commits: true,
          easyProblems: true,
          mediumProblems: true,
          hardProblems: true,
        },
        _avg: {
          problemsSolved: true,
          timeSpent: true,
        },
        _max: {
          problemsSolved: true,
          timeSpent: true,
        },
      }),

      // Total entries count
      prisma.trackerEntry.count({
        where: {
          customPlatformId: validatedId.data,
          date: { gte: start, lte: end },
        },
      }),

      // First entry
      prisma.trackerEntry.findFirst({
        where: { customPlatformId: validatedId.data },
        orderBy: { date: 'asc' },
        select: { date: true },
      }),

      // Last entry
      prisma.trackerEntry.findFirst({
        where: { customPlatformId: validatedId.data },
        orderBy: { date: 'desc' },
        select: { date: true },
      }),

      // Daily/Weekly/Monthly breakdown
      prisma.trackerEntry.groupBy({
        by: ['date'],
        where: {
          customPlatformId: validatedId.data,
          date: { gte: start, lte: end },
        },
        _sum: {
          problemsSolved: true,
          timeSpent: true,
        },
        _count: true,
        orderBy: { date: 'asc' },
      }),
    ]);

    // 8. Process daily data based on groupBy
    const processedData: DailyData[] = dailyData.map((d) => ({
      date: format(d.date, 'yyyy-MM-dd'),
      problemsSolved: d._sum.problemsSolved || 0,
      timeSpent: d._sum.timeSpent || 0,
      entries: d._count,
    }));

    // Group by week or month if needed
    let groupedData = processedData;
    if (groupBy === 'week' || groupBy === 'month') {
      const grouped = new Map<string, DailyData>();
      
      for (const item of processedData) {
        const date = new Date(item.date);
        const key = groupBy === 'week' 
          ? format(startOfWeek(date), 'yyyy-MM-dd')
          : format(startOfMonth(date), 'yyyy-MM');
        
        const existing = grouped.get(key);
        if (existing) {
          existing.problemsSolved += item.problemsSolved;
          existing.timeSpent += item.timeSpent;
          existing.entries += item.entries;
        } else {
          grouped.set(key, { ...item, date: key });
        }
      }
      
      groupedData = Array.from(grouped.values());
    }

    // 9. Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedDates = processedData.map(d => d.date).sort();
    
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      
      longestStreak = Math.max(longestStreak, tempStreak);
      
      // Check if current streak is still active (last entry was today or yesterday)
      if (i === sortedDates.length - 1) {
        const lastDate = new Date(sortedDates[i]);
        const today = new Date();
        const diffFromToday = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffFromToday <= 1) {
          currentStreak = tempStreak;
        }
      }
    }

    // 10. Build response
    const stats = {
      platform: {
        id: platform.id,
        name: platform.name,
        category: platform.category,
        isActive: platform.isActive,
        createdAt: platform.createdAt,
      },
      period: {
        type: period,
        start: start.toISOString(),
        end: end.toISOString(),
      },
      summary: {
        totalEntries: entriesCount,
        totalProblems: totalStats._sum.problemsSolved || 0,
        totalAttempted: totalStats._sum.problemsAttempted || 0,
        totalTimeSpent: totalStats._sum.timeSpent || 0, // in minutes
        totalCommits: totalStats._sum.commits || 0,
        avgProblemsPerDay: Math.round((totalStats._avg.problemsSolved || 0) * 100) / 100,
        avgTimePerDay: Math.round((totalStats._avg.timeSpent || 0) * 100) / 100,
        maxProblemsInDay: totalStats._max.problemsSolved || 0,
        maxTimeInDay: totalStats._max.timeSpent || 0,
      },
      difficulty: {
        easy: totalStats._sum.easyProblems || 0,
        medium: totalStats._sum.mediumProblems || 0,
        hard: totalStats._sum.hardProblems || 0,
      },
      streaks: {
        current: currentStreak,
        longest: longestStreak,
      },
      activity: {
        firstActivityDate: firstEntry?.date || null,
        lastActivityDate: lastEntry?.date || null,
        activeDays: processedData.length,
      },
      timeline: groupedData,
    };

    const duration = Date.now() - startTime;
    log.info('Platform stats fetched', { 
      platformId: validatedId.data, 
      userId, 
      period,
      duration,
    });

    return successResponse(stats, 200, {
      'X-Request-ID': requestId,
      'X-Response-Time': `${duration}ms`,
      'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
    });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// OPTIONS - Return allowed methods
// =============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': ALLOWED_METHODS.join(', '),
      'Access-Control-Allow-Methods': ALLOWED_METHODS.join(', '),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}