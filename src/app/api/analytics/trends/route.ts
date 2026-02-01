// src/app/api/analytics/trends/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import apiResponse from '@/lib/apiResponse';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { StatsService } from '@/services/statsService';
import { subDays, startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns';

const log = logger.child({ module: 'api.analytics.trends' });

const trendsSchema = z.object({
  days: z.coerce.number().min(7).max(365).optional().default(30),
  metric: z
    .enum(['problems', 'time', 'commits', 'points', 'all'])
    .optional()
    .default('problems'),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
  platformId: z.string().optional(),
  cumulative: z.boolean().optional().default(false),
});

interface TrendDataPoint {
  date: string;
  value: number;
}

interface TrendDataPointAll {
  date: string;
  problems: number;
  commits: number;
  time: number;
  points: number;
}

interface GroupedDataPoint {
  date: string;
  value?: number;
  problems?: number;
  commits?: number;
  time?: number;
  points?: number;
  count: number;
}

interface PlatformTrendItem {
  platformId: string;
  platformName?: string;
  total: number;
  data: TrendDataPoint[];
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      log.warn('Unauthorized trends request');
      return apiResponse.unauthorized('Authentication required');
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);

    // Extract params first - FIX
    const days = searchParams.get('days');
    const metric = searchParams.get('metric');
    const groupBy = searchParams.get('groupBy');
    const platformId = searchParams.get('platformId');
    const cumulative = searchParams.get('cumulative');

    const validationResult = trendsSchema.safeParse({
      days: days ?? undefined,
      metric: metric ?? undefined,
      groupBy: groupBy ?? undefined,
      platformId: platformId ?? undefined,
      cumulative: cumulative === 'true',
    });

    if (!validationResult.success) {
      log.warn('Invalid trends parameters', {
        userId,
        errors: validationResult.error.flatten(),
      });
      return apiResponse.validationError(
        'Invalid parameters',
        validationResult.error.issues
      );
    }

    const params = validationResult.data;
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, params.days));

    log.info('Fetching trend data', {
      userId,
      days: params.days,
      metric: params.metric,
    });

    let trendData: (TrendDataPoint | TrendDataPointAll)[] = [];

    if (params.metric === 'all') {
      const [problems, commits, time, points] = await Promise.all([
        StatsService.getTrendData(userId, startDate, endDate, 'problems'),
        StatsService.getTrendData(userId, startDate, endDate, 'commits'),
        StatsService.getTrendData(userId, startDate, endDate, 'time'),
        StatsService.getTrendData(userId, startDate, endDate, 'points'),
      ]);

      const allDates = eachDayOfInterval({ start: startDate, end: endDate });
      trendData = allDates.map((date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return {
          date: dateStr,
          problems: problems.find((p) => p.date === dateStr)?.value || 0,
          commits: commits.find((c) => c.date === dateStr)?.value || 0,
          time: time.find((t) => t.date === dateStr)?.value || 0,
          points: points.find((pt) => pt.date === dateStr)?.value || 0,
        };
      });
    } else {
      if (params.cumulative) {
        trendData = await StatsService.getCumulativeTrendData(
          userId,
          startDate,
          endDate,
          params.metric as 'problems' | 'time' | 'commits'
        );
      } else {
        trendData = await StatsService.getTrendData(
          userId,
          startDate,
          endDate,
          params.metric as 'problems' | 'time' | 'commits' | 'points'
        );
      }
    }

    if (params.groupBy !== 'day') {
      trendData = groupTrendData(trendData, params.groupBy, params.metric === 'all');
    }

    const values =
      params.metric === 'all'
        ? trendData.map((d) => {
            const point = d as TrendDataPointAll;
            return point.problems + point.commits + point.time + point.points;
          })
        : trendData.map((d) => (d as TrendDataPoint).value);

    const stats = {
      total: values.reduce((a, b) => a + b, 0),
      average: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      min: Math.min(...values),
      max: Math.max(...values),
      trend: calculateTrend(values),
    };

    let platformTrends: PlatformTrendItem[] | null = null;
    if (params.platformId) {
      const allPlatformTrends = await StatsService.getPlatformTrends(
        userId,
        params.days
      );
      platformTrends = allPlatformTrends.filter(
        (pt: PlatformTrendItem) => pt.platformId === params.platformId
      );
    }

    const response = {
      data: trendData,
      stats,
      metadata: {
        metric: params.metric,
        days: params.days,
        groupBy: params.groupBy,
        cumulative: params.cumulative,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dataPoints: trendData.length,
      },
      platformTrends,
    };

    const duration = Date.now() - startTime;
    log.info('Trend data fetched successfully', {
      userId,
      dataPoints: trendData.length,
      duration,
    });

    return apiResponse.success(response, {
      meta: {
        metric: params.metric,
        executionTime: duration,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Error fetching trend data', { duration }, error);
    return apiResponse.error(error);
  }
}

function groupTrendData(
  data: (TrendDataPoint | TrendDataPointAll)[],
  groupBy: 'week' | 'month',
  isAllMetrics: boolean
): (TrendDataPoint | TrendDataPointAll)[] {
  const grouped: Record<string, GroupedDataPoint> = {};

  data.forEach((point) => {
    let key: string;
    const date = new Date(point.date);

    if (groupBy === 'week') {
      const weekStart = startOfDay(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      key = format(weekStart, 'yyyy-MM-dd');
    } else {
      key = format(date, 'yyyy-MM');
    }

    if (!grouped[key]) {
      if (isAllMetrics) {
        grouped[key] = {
          date: key,
          problems: 0,
          commits: 0,
          time: 0,
          points: 0,
          count: 0,
        };
      } else {
        grouped[key] = {
          date: key,
          value: 0,
          count: 0,
        };
      }
    }

    if (isAllMetrics) {
      const allPoint = point as TrendDataPointAll;
      const groupedPoint = grouped[key];
      groupedPoint.problems = (groupedPoint.problems || 0) + (allPoint.problems || 0);
      groupedPoint.commits = (groupedPoint.commits || 0) + (allPoint.commits || 0);
      groupedPoint.time = (groupedPoint.time || 0) + (allPoint.time || 0);
      groupedPoint.points = (groupedPoint.points || 0) + (allPoint.points || 0);
    } else {
      grouped[key].value =
        (grouped[key].value || 0) + ((point as TrendDataPoint).value || 0);
    }
    grouped[key].count += 1;
  });

  return Object.values(grouped).map((group) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { count, ...rest } = group;
    return rest as TrendDataPoint | TrendDataPointAll;
  });
}

function calculateTrend(values: number[]): 'up' | 'down' | 'stable' {
  if (values.length < 2) return 'stable';

  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const percentChange = ((secondAvg - firstAvg) / firstAvg) * 100;

  if (percentChange > 10) return 'up';
  if (percentChange < -10) return 'down';
  return 'stable';
}