// =============================================================================
// FILE: app/api/stats/yearly/route.ts
// PURPOSE: Yearly statistics overview
// Methods: GET
// Auth Required: True
// Rate Limit: 20 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { getClientIp, generateRequestId } from '@/lib/utils';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 20;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=300',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2030).optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function addHeaders(
  response: NextResponse,
  requestId: string,
  rateLimitResult?: { limit: number; remaining: number }
): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);

  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }

  return response;
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

/**
 * GET - Yearly statistics
 *
 * Query: year (optional, defaults to current year)
 * Returns: monthly breakdown, totals, comparisons, heatmap data
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stats-yearly:${ip}`);
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const userId = session.user.id;

    // Parse query
    const searchParams = request.nextUrl.searchParams;
    const queryValidation = querySchema.safeParse({
      year: searchParams.get('year') || undefined,
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const year = queryValidation.data.year || new Date().getFullYear();
    const startDate = new Date(Date.UTC(year, 0, 1));
    const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    // Fetch yearly aggregated data
    const [yearlyAgg, monthlyEntries, activeDays] = await Promise.all([
      prisma.trackerEntry.aggregate({
        where: {
          userId,
          date: { gte: startDate, lte: endDate },
        },
        _sum: {
          problemsSolved: true,
          commits: true,
          timeSpent: true,
          points: true,
          easyProblems: true,
          mediumProblems: true,
          hardProblems: true,
          coursesCompleted: true,
          certificationsEarned: true,
          projectsCompleted: true,
        },
        _count: { _all: true },
      }),
      prisma.trackerEntry.groupBy({
        by: ['date'],
        where: {
          userId,
          date: { gte: startDate, lte: endDate },
        },
        _sum: {
          problemsSolved: true,
          commits: true,
          timeSpent: true,
          points: true,
        },
      }),
      prisma.trackerEntry.groupBy({
        by: ['date'],
        where: {
          userId,
          date: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    // Build monthly breakdown
    const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: new Date(year, i, 1).toLocaleString('en-US', { month: 'long' }),
      problems: 0,
      commits: 0,
      timeSpent: 0,
      points: 0,
      activeDays: 0,
    }));

    monthlyEntries.forEach((entry) => {
      const month = entry.date.getUTCMonth();
      monthlyStats[month].problems += entry._sum.problemsSolved || 0;
      monthlyStats[month].commits += entry._sum.commits || 0;
      monthlyStats[month].timeSpent += entry._sum.timeSpent || 0;
      monthlyStats[month].points += entry._sum.points || 0;
    });

    // Count active days per month
    activeDays.forEach((entry) => {
      const month = entry.date.getUTCMonth();
      monthlyStats[month].activeDays++;
    });

    // Build heatmap data (date -> count)
    const heatmapData: Record<string, number> = {};
    monthlyEntries.forEach((entry) => {
      const dateKey = entry.date.toISOString().split('T')[0];
      heatmapData[dateKey] = (entry._sum.problemsSolved || 0) + (entry._sum.commits || 0);
    });

    const data = {
      year,
      totals: {
        totalEntries: yearlyAgg._count._all,
        totalProblems: yearlyAgg._sum.problemsSolved || 0,
        totalCommits: yearlyAgg._sum.commits || 0,
        totalTimeSpent: yearlyAgg._sum.timeSpent || 0,
        totalPoints: yearlyAgg._sum.points || 0,
        totalActiveDays: activeDays.length,
        coursesCompleted: yearlyAgg._sum.coursesCompleted || 0,
        certificationsEarned: yearlyAgg._sum.certificationsEarned || 0,
        projectsCompleted: yearlyAgg._sum.projectsCompleted || 0,
        difficulty: {
          easy: yearlyAgg._sum.easyProblems || 0,
          medium: yearlyAgg._sum.mediumProblems || 0,
          hard: yearlyAgg._sum.hardProblems || 0,
        },
      },
      monthly: monthlyStats,
      heatmap: heatmapData,
    };

    logger.info('GET /stats/yearly completed', {
      userId,
      year,
      totalEntries: data.totals.totalEntries,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(data, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /stats/yearly failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch yearly stats', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
