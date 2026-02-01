// src/app/api/analytics/comparison/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import apiResponse from '@/lib/apiResponse';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { StatsService } from '@/services/statsService';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import type { ComparisonPeriod } from '@/types/analytics';

const log = logger.child({ module: 'api.analytics.comparison' });

// Validation schema
const comparisonSchema = z.object({
  period: z
    .enum(['previous', 'lastWeek', 'lastMonth', 'lastYear', 'custom'])
    .optional()
    .default('previous'),
  currentStart: z.string().datetime().optional(),
  currentEnd: z.string().datetime().optional(),
  previousStart: z.string().datetime().optional(),
  previousEnd: z.string().datetime().optional(),
  days: z.coerce.number().min(1).max(365).optional().default(30),
  metric: z
    .enum(['problems', 'commits', 'time', 'all'])
    .optional()
    .default('all'),
});

interface OverallStats {
  totalProblems: number;
  totalCommits: number;
  totalTimeSpent: number;
  totalPoints: number;
  activeDays: number;
  currentStreak: number;
  avgProblemsPerDay: number;
  avgTimePerDay: number;
}

interface Insight {
  type: string;
  category: string;
  message: string;
  priority: string;
}

/**
 * GET /api/analytics/comparison
 * Compare analytics between two periods
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      log.warn('Unauthorized comparison request');
      return apiResponse.unauthorized('Authentication required');
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);

    // Parse query params - FIX: Extract values first to handle null
    const period = searchParams.get('period');
    const currentStart = searchParams.get('currentStart');
    const currentEnd = searchParams.get('currentEnd');
    const previousStart = searchParams.get('previousStart');
    const previousEnd = searchParams.get('previousEnd');
    const days = searchParams.get('days');
    const metric = searchParams.get('metric');

    // Validate - now passing clean object
    const validationResult = comparisonSchema.safeParse({
      period: period ?? undefined,
      currentStart: currentStart ?? undefined,
      currentEnd: currentEnd ?? undefined,
      previousStart: previousStart ?? undefined,
      previousEnd: previousEnd ?? undefined,
      days: days ?? undefined,
      metric: metric ?? undefined,
    });

    if (!validationResult.success) {
      log.warn('Invalid comparison parameters', {
        userId,
        errors: validationResult.error.flatten(),
      });
      return apiResponse.validationError(
        'Invalid parameters',
        validationResult.error.issues
      );
    }

    const params = validationResult.data;

    // Calculate date ranges
    let currentStartDate: Date;
    let currentEndDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    if (
      params.currentStart &&
      params.currentEnd &&
      params.previousStart &&
      params.previousEnd
    ) {
      currentStartDate = new Date(params.currentStart);
      currentEndDate = new Date(params.currentEnd);
      previousStartDate = new Date(params.previousStart);
      previousEndDate = new Date(params.previousEnd);
    } else {
      currentEndDate = endOfDay(new Date());
      currentStartDate = startOfDay(subDays(currentEndDate, params.days));

      const periodLength =
        currentEndDate.getTime() - currentStartDate.getTime();

      switch (params.period as ComparisonPeriod) {
        case 'lastWeek':
          previousEndDate = subDays(currentEndDate, 7);
          previousStartDate = subDays(currentStartDate, 7);
          break;
        case 'lastMonth':
          previousEndDate = subDays(currentEndDate, 30);
          previousStartDate = subDays(currentStartDate, 30);
          break;
        case 'lastYear':
          previousEndDate = subDays(currentEndDate, 365);
          previousStartDate = subDays(currentStartDate, 365);
          break;
        case 'previous':
        default:
          previousEndDate = new Date(currentStartDate.getTime() - 1);
          previousStartDate = new Date(
            previousEndDate.getTime() - periodLength
          );
          break;
      }
    }

    log.info('Fetching comparison data', {
      userId,
      currentPeriod: { start: currentStartDate, end: currentEndDate },
      previousPeriod: { start: previousStartDate, end: previousEndDate },
      metric: params.metric,
    });

    // Fetch stats for both periods
    const [currentStats, previousStats] = await Promise.all([
      StatsService.getOverallStats(
        userId,
        Math.ceil(
          (currentEndDate.getTime() - currentStartDate.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      ),
      StatsService.getOverallStats(
        userId,
        Math.ceil(
          (previousEndDate.getTime() - previousStartDate.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      ),
    ]);

    // Calculate changes
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const calculateTrend = (
      changePercent: number
    ): 'up' | 'down' | 'stable' => {
      if (changePercent > 5) return 'up';
      if (changePercent < -5) return 'down';
      return 'stable';
    };

    // Build comparison response
    const comparison = {
      current: {
        period: {
          start: currentStartDate.toISOString(),
          end: currentEndDate.toISOString(),
          label: `Last ${params.days} days`,
        },
        stats: {
          totalProblems: currentStats.totalProblems,
          totalCommits: currentStats.totalCommits,
          totalTimeSpent: currentStats.totalTimeSpent,
          totalPoints: currentStats.totalPoints,
          activeDays: currentStats.activeDays,
          currentStreak: currentStats.currentStreak,
          avgProblemsPerDay: currentStats.avgProblemsPerDay,
          avgTimePerDay: currentStats.avgTimePerDay,
        },
      },
      previous: {
        period: {
          start: previousStartDate.toISOString(),
          end: previousEndDate.toISOString(),
          label: `Previous ${params.days} days`,
        },
        stats: {
          totalProblems: previousStats.totalProblems,
          totalCommits: previousStats.totalCommits,
          totalTimeSpent: previousStats.totalTimeSpent,
          totalPoints: previousStats.totalPoints,
          activeDays: previousStats.activeDays,
          currentStreak: previousStats.currentStreak,
          avgProblemsPerDay: previousStats.avgProblemsPerDay,
          avgTimePerDay: previousStats.avgTimePerDay,
        },
      },
      changes: {
        problems: {
          absolute: currentStats.totalProblems - previousStats.totalProblems,
          percentage: calculateChange(
            currentStats.totalProblems,
            previousStats.totalProblems
          ),
          trend: calculateTrend(
            calculateChange(
              currentStats.totalProblems,
              previousStats.totalProblems
            )
          ),
        },
        commits: {
          absolute: currentStats.totalCommits - previousStats.totalCommits,
          percentage: calculateChange(
            currentStats.totalCommits,
            previousStats.totalCommits
          ),
          trend: calculateTrend(
            calculateChange(
              currentStats.totalCommits,
              previousStats.totalCommits
            )
          ),
        },
        timeSpent: {
          absolute: currentStats.totalTimeSpent - previousStats.totalTimeSpent,
          percentage: calculateChange(
            currentStats.totalTimeSpent,
            previousStats.totalTimeSpent
          ),
          trend: calculateTrend(
            calculateChange(
              currentStats.totalTimeSpent,
              previousStats.totalTimeSpent
            )
          ),
        },
        points: {
          absolute: currentStats.totalPoints - previousStats.totalPoints,
          percentage: calculateChange(
            currentStats.totalPoints,
            previousStats.totalPoints
          ),
          trend: calculateTrend(
            calculateChange(currentStats.totalPoints, previousStats.totalPoints)
          ),
        },
        activeDays: {
          absolute: currentStats.activeDays - previousStats.activeDays,
          percentage: calculateChange(
            currentStats.activeDays,
            previousStats.activeDays
          ),
          trend: calculateTrend(
            calculateChange(currentStats.activeDays, previousStats.activeDays)
          ),
        },
        streak: {
          absolute: currentStats.currentStreak - previousStats.currentStreak,
          percentage: calculateChange(
            currentStats.currentStreak,
            previousStats.currentStreak
          ),
          trend: calculateTrend(
            calculateChange(
              currentStats.currentStreak,
              previousStats.currentStreak
            )
          ),
        },
      },
      insights: generateComparisonInsights(currentStats, previousStats),
    };

    // Filter by specific metric if requested
    if (params.metric !== 'all') {
      const metricKey = params.metric as keyof typeof comparison.changes;
      const metricData = {
        current: comparison.current,
        previous: comparison.previous,
        changes: {
          [params.metric]: comparison.changes[metricKey],
        },
        insights: comparison.insights.filter(
          (i) => i.category === params.metric
        ),
      };

      const duration = Date.now() - startTime;
      log.info('Comparison data fetched successfully', {
        userId,
        metric: params.metric,
        duration,
      });

      return apiResponse.success(metricData, {
        meta: {
          metric: params.metric,
          period: params.period,
          days: params.days,
          executionTime: duration,
        },
      });
    }

    const duration = Date.now() - startTime;
    log.info('Comparison data fetched successfully', { userId, duration });

    return apiResponse.success(comparison, {
      meta: {
        period: params.period,
        days: params.days,
        executionTime: duration,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Error fetching comparison data', { duration }, error);
    return apiResponse.error(error);
  }
}

function generateComparisonInsights(
  current: OverallStats,
  previous: OverallStats
): Insight[] {
  const insights: Insight[] = [];

  if (current.totalProblems > previous.totalProblems * 1.5) {
    insights.push({
      type: 'positive',
      category: 'problems',
      message: `Excellent! You solved ${Math.round(
        (current.totalProblems / previous.totalProblems - 1) * 100
      )}% more problems than the previous period!`,
      priority: 'high',
    });
  } else if (
    current.totalProblems < previous.totalProblems * 0.5 &&
    previous.totalProblems > 0
  ) {
    insights.push({
      type: 'negative',
      category: 'problems',
      message: `Your problem-solving decreased by ${Math.round(
        (1 - current.totalProblems / previous.totalProblems) * 100
      )}%. Try to increase your daily practice!`,
      priority: 'high',
    });
  }

  if (current.activeDays > previous.activeDays) {
    insights.push({
      type: 'positive',
      category: 'consistency',
      message: `Great consistency! You were active ${
        current.activeDays - previous.activeDays
      } more days than the previous period.`,
      priority: 'medium',
    });
  }

  if (
    current.currentStreak >= 7 &&
    current.currentStreak > previous.currentStreak
  ) {
    insights.push({
      type: 'positive',
      category: 'streak',
      message: `Your streak improved from ${previous.currentStreak} to ${current.currentStreak} days!`,
      priority: 'high',
    });
  }

  if (
    current.avgTimePerDay > 120 &&
    current.avgTimePerDay > previous.avgTimePerDay * 1.2
  ) {
    insights.push({
      type: 'positive',
      category: 'time',
      message: `You're dedicating more time to practice - ${Math.round(
        current.avgTimePerDay
      )} minutes per day on average!`,
      priority: 'medium',
    });
  }

  return insights;
}