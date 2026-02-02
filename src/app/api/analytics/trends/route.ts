// src/app/api/analytics/trends/route.ts
// =============================================================================
// Trend Analysis
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
import { subDays, startOfDay, endOfDay, format, eachDayOfInterval, startOfWeek, startOfMonth } from 'date-fns';

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
  'Cache-Control': 'private, max-age=300',
};

type TrendDirection = 'up' | 'down' | 'stable';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface TrackerEntryData {
  date: Date;
  problemsSolved: number;
  commits: number;
  timeSpent: number;
  pointsEarned: number | null;
}

type SingleMetric = 'problems' | 'commits' | 'time' | 'points';
type MetricType = SingleMetric | 'all';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  days: z.coerce.number().int().min(7).max(365).default(30),
  metric: z.enum(['problems', 'commits', 'time', 'points', 'all']).default('problems'),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
  platformId: z.string().optional(),
  cumulative: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  includeMovingAverage: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  movingAverageWindow: z.coerce.number().int().min(3).max(14).default(7),
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
  const rateLimitKey = `analytics-trends:${ip}`;
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

function calculateTrend(values: number[]): TrendDirection {
  if (values.length < 2) return 'stable';

  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const percentChange = firstAvg !== 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : (secondAvg > 0 ? 100 : 0);

  if (percentChange > 10) return 'up';
  if (percentChange < -10) return 'down';
  return 'stable';
}

function calculateMovingAverage(values: number[], window: number): (number | null)[] {
  return values.map((_, index) => {
    if (index < window - 1) return null;

    const windowValues = values.slice(index - window + 1, index + 1);
    return Math.round((windowValues.reduce((a, b) => a + b, 0) / window) * 10) / 10;
  });
}

function calculateLinearRegression(values: number[]): { slope: number; intercept: number; r2: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0, r2: 0 };

  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  let ssRes = 0;
  let ssTot = 0;

  values.forEach((y, x) => {
    numerator += (x - xMean) * (y - yMean);
    denominator += (x - xMean) ** 2;
    ssTot += (y - yMean) ** 2;
  });

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  values.forEach((y, x) => {
    const predicted = slope * x + intercept;
    ssRes += (y - predicted) ** 2;
  });

  const r2 = ssTot !== 0 ? Math.max(0, 1 - (ssRes / ssTot)) : 0;

  return { slope: Math.round(slope * 100) / 100, intercept: Math.round(intercept * 100) / 100, r2: Math.round(r2 * 100) / 100 };
}

/**
 * Helper function to get metric value from entry in a type-safe way
 */
function getMetricValue(entry: TrackerEntryData, metric: SingleMetric): number {
  switch (metric) {
    case 'problems':
      return entry.problemsSolved;
    case 'commits':
      return entry.commits;
    case 'time':
      return entry.timeSpent;
    case 'points':
      return entry.pointsEarned || 0;
    default:
      return 0;
  }
}

/**
 * Type guard to check if metric is a single metric (not 'all')
 */
function isSingleMetric(metric: MetricType): metric is SingleMetric {
  return metric !== 'all';
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
    response.headers.set('X-Analysis-Type', 'trends');

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD analytics/trends failed', { requestId }, error);
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
      metric: searchParams.get('metric') || 'problems',
      groupBy: searchParams.get('groupBy') || 'day',
      platformId: searchParams.get('platformId'),
      cumulative: searchParams.get('cumulative'),
      includeMovingAverage: searchParams.get('includeMovingAverage'),
      movingAverageWindow: searchParams.get('movingAverageWindow') || '7',
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
    const entries: TrackerEntryData[] = await prisma.trackerEntry.findMany({
      where,
      select: {
        date: true,
        problemsSolved: true,
        commits: true,
        timeSpent: true,
        pointsEarned: true,
      },
      orderBy: { date: 'asc' },
    });

    // Generate date series
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Process data based on metric and groupBy
    interface DataPoint {
      date: string;
      label: string;
      problems?: number;
      commits?: number;
      time?: number;
      points?: number;
      value?: number;
    }

    let trendData: DataPoint[] = [];
    const metric = params.metric;

    if (params.groupBy === 'day') {
      trendData = allDays.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayEntries = entries.filter(e => format(e.date, 'yyyy-MM-dd') === dateStr);

        const point: DataPoint = {
          date: dateStr,
          label: format(day, 'MMM d'),
        };

        if (metric === 'all') {
          point.problems = dayEntries.reduce((sum, e) => sum + e.problemsSolved, 0);
          point.commits = dayEntries.reduce((sum, e) => sum + e.commits, 0);
          point.time = dayEntries.reduce((sum, e) => sum + e.timeSpent, 0);
          point.points = dayEntries.reduce((sum, e) => sum + (e.pointsEarned || 0), 0);
        } else if (isSingleMetric(metric)) {
          point.value = dayEntries.reduce((sum, e) => sum + getMetricValue(e, metric), 0);
        }

        return point;
      });

    } else if (params.groupBy === 'week') {
      const weekMap = new Map<string, DataPoint>();

      entries.forEach(entry => {
        const weekStart = startOfWeek(entry.date);
        const key = format(weekStart, 'yyyy-MM-dd');

        if (!weekMap.has(key)) {
          weekMap.set(key, {
            date: key,
            label: `Week of ${format(weekStart, 'MMM d')}`,
            problems: 0,
            commits: 0,
            time: 0,
            points: 0,
            value: 0,
          });
        }

        const point = weekMap.get(key)!;

        if (metric === 'all') {
          point.problems = (point.problems || 0) + entry.problemsSolved;
          point.commits = (point.commits || 0) + entry.commits;
          point.time = (point.time || 0) + entry.timeSpent;
          point.points = (point.points || 0) + (entry.pointsEarned || 0);
        } else if (isSingleMetric(metric)) {
          point.value = (point.value || 0) + getMetricValue(entry, metric);
        }
      });

      trendData = Array.from(weekMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    } else if (params.groupBy === 'month') {
      const monthMap = new Map<string, DataPoint>();

      entries.forEach(entry => {
        const monthStart = startOfMonth(entry.date);
        const key = format(monthStart, 'yyyy-MM');

        if (!monthMap.has(key)) {
          monthMap.set(key, {
            date: key,
            label: format(monthStart, 'MMM yyyy'),
            problems: 0,
            commits: 0,
            time: 0,
            points: 0,
            value: 0,
          });
        }

        const point = monthMap.get(key)!;

        if (metric === 'all') {
          point.problems = (point.problems || 0) + entry.problemsSolved;
          point.commits = (point.commits || 0) + entry.commits;
          point.time = (point.time || 0) + entry.timeSpent;
          point.points = (point.points || 0) + (entry.pointsEarned || 0);
        } else if (isSingleMetric(metric)) {
          point.value = (point.value || 0) + getMetricValue(entry, metric);
        }
      });

      trendData = Array.from(monthMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    }

    // Calculate cumulative if requested
    if (params.cumulative && metric !== 'all') {
      let cumSum = 0;
      trendData = trendData.map(point => {
        cumSum += point.value || 0;
        return { ...point, value: cumSum };
      });
    }

    // Calculate moving average if requested
    let movingAverages: (number | null)[] | null = null;
    if (params.includeMovingAverage && metric !== 'all') {
      const values = trendData.map(d => d.value || 0);
      movingAverages = calculateMovingAverage(values, params.movingAverageWindow);
    }

    // Calculate statistics
    const values = metric === 'all'
      ? trendData.map(d => (d.problems || 0) + (d.commits || 0))
      : trendData.map(d => d.value || 0);

    const total = values.reduce((a, b) => a + b, 0);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = values.length > 0 ? total / values.length : 0;

    const trend = calculateTrend(values);
    const regression = calculateLinearRegression(values);

    // Predict next value
    const predictedNext = Math.max(0, Math.round(regression.slope * values.length + regression.intercept));

    // Build response
    const response = {
      data: trendData.map((point, index) => ({
        ...point,
        movingAverage: movingAverages ? movingAverages[index] : undefined,
      })),
      stats: {
        total,
        max,
        min,
        avg: Math.round(avg * 10) / 10,
        trend,
        dataPoints: trendData.length,
      },
      analysis: {
        regression: {
          slope: regression.slope,
          intercept: regression.intercept,
          r2: regression.r2,
          interpretation: regression.slope > 0
            ? `Increasing by ~${Math.abs(regression.slope).toFixed(1)} per ${params.groupBy}`
            : regression.slope < 0
            ? `Decreasing by ~${Math.abs(regression.slope).toFixed(1)} per ${params.groupBy}`
            : 'Stable trend',
        },
        prediction: {
          nextValue: predictedNext,
          confidence: Math.round(regression.r2 * 100),
        },
        trend: {
          direction: trend,
          strength: Math.abs(regression.slope),
        },
      },
      metadata: {
        metric: params.metric,
        days: params.days,
        groupBy: params.groupBy,
        cumulative: params.cumulative,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };

    logger.info('Trend analysis fetched', {
      userId,
      metric: params.metric,
      days: params.days,
      dataPoints: trendData.length,
      trend,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(response, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('GET analytics/trends failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch trend analysis', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';