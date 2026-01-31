// src/app/api/stats/trends/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  format, 
  startOfDay, 
  endOfDay, 
  subDays,
  subWeeks,
  subMonths,
  eachDayOfInterval,
  eachWeekOfInterval,
  startOfWeek,
  endOfWeek,
  parseISO,
  isValid,
  differenceInDays,
} from 'date-fns';
import type { PlatformCategory } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

type MetricType = 'problems' | 'commits' | 'pullRequests' | 'time' | 'points';
type GranularityType = 'day' | 'week' | 'month';
type PeriodType = 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface TrendDataPoint {
  date: string;
  label: string;
  value: number;
  cumulativeValue?: number;
}

interface WeekSummary {
  weekStart: string;
  weekEnd: string;
  total: number;
  average: number;
  activeDays: number;
}

interface PeriodComparison {
  current: {
    label: string;
    startDate: string;
    endDate: string;
    value: number;
    activeDays: number;
    avgPerDay: number;
    totalDays: number;
  };
  previous: {
    label: string;
    startDate: string;
    endDate: string;
    value: number;
    activeDays: number;
    avgPerDay: number;
    totalDays: number;
  };
  change: {
    absolute: number;
    percent: number;
    trend: 'up' | 'down' | 'stable';
    activeDaysChange: number;
    avgPerDayChange: number;
  };
}

interface TrendResponse {
  success: boolean;
  data: {
    metric: MetricType;
    granularity: GranularityType;
    periodType: PeriodType;
    trend: TrendDataPoint[];
    comparison?: PeriodComparison;
    weekSummaries?: WeekSummary[];
    summary: {
      total: number;
      average: number;
      max: { value: number; date: string };
      min: { value: number; date: string };
      trend: 'increasing' | 'decreasing' | 'stable';
      growthRate: number;
    };
    movingAverage?: TrendDataPoint[];
    period: {
      startDate: string;
      endDate: string;
      days: number;
    };
  };
  meta: {
    generatedAt: string;
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function calculateMovingAverage(
  data: TrendDataPoint[], 
  window: number
): TrendDataPoint[] {
  if (data.length < window) return [];

  const result: TrendDataPoint[] = [];
  for (let i = window - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < window; j++) {
      sum += data[i - j].value;
    }
    result.push({
      date: data[i].date,
      label: data[i].label,
      value: Math.round(sum / window),
    });
  }
  return result;
}

function determineTrend(data: TrendDataPoint[]): 'increasing' | 'decreasing' | 'stable' {
  if (data.length < 2) return 'stable';

  // Use linear regression to determine trend
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  data.forEach((point, i) => {
    sumX += i;
    sumY += point.value;
    sumXY += i * point.value;
    sumX2 += i * i;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const avgY = sumY / n;

  // Determine if slope is significant relative to average
  const slopePercent = avgY > 0 ? (slope / avgY) * 100 : 0;

  if (slopePercent > 2) return 'increasing';
  if (slopePercent < -2) return 'decreasing';
  return 'stable';
}

function getMetricValue(
  entry: {
    problemsSolved: number;
    commits: number;
    pullRequests: number;
    timeSpent: number;
    points: number | null;
  },
  metric: MetricType
): number {
  switch (metric) {
    case 'problems':
      return entry.problemsSolved;
    case 'commits':
      return entry.commits;
    case 'pullRequests':
      return entry.pullRequests;
    case 'time':
      return entry.timeSpent;
    case 'points':
      return entry.points ?? 0;
    default:
      return entry.problemsSolved;
  }
}

function getPeriodLabel(period: PeriodType): string {
  switch (period) {
    case 'week':
      return 'Last 7 Days';
    case 'month':
      return 'Last 30 Days';
    case 'quarter':
      return 'Last 90 Days';
    case 'year':
      return 'Last 365 Days';
    case 'custom':
      return 'Custom Period';
    default:
      return 'Selected Period';
  }
}

function generateWeekSummaries(
  entries: Array<{
    date: Date;
    problemsSolved: number;
    commits: number;
    pullRequests: number;
    timeSpent: number;
    points: number | null;
  }>,
  metric: MetricType,
  startDate: Date,
  endDate: Date
): WeekSummary[] {
  const weeks = eachWeekOfInterval({ start: startDate, end: endDate });
  
  return weeks.map((weekStart) => {
    const weekEnd = endOfWeek(weekStart);
    const weekEntries = entries.filter(
      (e) => e.date >= weekStart && e.date <= weekEnd
    );
    
    const values = weekEntries.map((e) => getMetricValue(e, metric));
    const total = values.reduce((a, b) => a + b, 0);
    const activeDays = new Set(
      weekEntries.map((e) => format(e.date, 'yyyy-MM-dd'))
    ).size;
    
    return {
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
      total,
      average: activeDays > 0 ? Math.round(total / activeDays) : 0,
      activeDays,
    };
  });
}

// =============================================================================
// GET - Trend Analysis
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized',
          message: 'You must be logged in to view trends' 
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    // Parse parameters
    const metricParam = searchParams.get('metric') ?? 'problems';
    const granularityParam = searchParams.get('granularity') ?? 'day';
    const periodParam = searchParams.get('period') ?? 'month';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const compareParam = searchParams.get('compare') === 'true';
    const cumulativeParam = searchParams.get('cumulative') === 'true';
    const movingAvgParam = searchParams.get('movingAverage');
    const includeWeekSummaries = searchParams.get('weekSummaries') === 'true';
    const platformId = searchParams.get('platformId');
    const category = searchParams.get('category');

    // Validate metric
    const validMetrics: MetricType[] = ['problems', 'commits', 'pullRequests', 'time', 'points'];
    if (!validMetrics.includes(metricParam as MetricType)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid metric',
          message: `Valid metrics: ${validMetrics.join(', ')}` 
        },
        { status: 400 }
      );
    }
    const metric = metricParam as MetricType;

    // Validate granularity
    const validGranularities: GranularityType[] = ['day', 'week', 'month'];
    if (!validGranularities.includes(granularityParam as GranularityType)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid granularity',
          message: `Valid granularities: ${validGranularities.join(', ')}` 
        },
        { status: 400 }
      );
    }
    const granularity = granularityParam as GranularityType;

    // Validate period type
    const validPeriods: PeriodType[] = ['week', 'month', 'quarter', 'year', 'custom'];
    const periodType: PeriodType = validPeriods.includes(periodParam as PeriodType) 
      ? (periodParam as PeriodType) 
      : 'month';

    // Determine date range
    const now = new Date();
    let startDate: Date;
    let endDate: Date = endOfDay(now);
    let previousStartDate: Date | null = null;
    let previousEndDate: Date | null = null;

    if (startDateParam && endDateParam) {
      const parsedStart = parseISO(startDateParam);
      const parsedEnd = parseISO(endDateParam);
      
      if (!isValid(parsedStart) || !isValid(parsedEnd)) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid date format' 
          },
          { status: 400 }
        );
      }
      
      startDate = startOfDay(parsedStart);
      endDate = endOfDay(parsedEnd);
    } else {
      // Use period parameter
      switch (periodType) {
        case 'week':
          startDate = subWeeks(now, 1);
          if (compareParam) {
            previousStartDate = subWeeks(startDate, 1);
            previousEndDate = subDays(startDate, 1);
          }
          break;
        case 'month':
          startDate = subMonths(now, 1);
          if (compareParam) {
            previousStartDate = subMonths(startDate, 1);
            previousEndDate = subDays(startDate, 1);
          }
          break;
        case 'quarter':
          startDate = subMonths(now, 3);
          if (compareParam) {
            previousStartDate = subMonths(startDate, 3);
            previousEndDate = subDays(startDate, 1);
          }
          break;
        case 'year':
          startDate = subMonths(now, 12);
          if (compareParam) {
            previousStartDate = subMonths(startDate, 12);
            previousEndDate = subDays(startDate, 1);
          }
          break;
        default:
          startDate = subMonths(now, 1);
      }
      startDate = startOfDay(startDate);
    }

    // Validate date range
    const daysDiff = differenceInDays(endDate, startDate);
    if (daysDiff > 730) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Date range too large' 
        },
        { status: 400 }
      );
    }

    // Validate category if provided
    let categoryFilter: PlatformCategory | undefined;
    if (category) {
      const validCategories: PlatformCategory[] = [
        'DSA', 'JOB', 'GIT', 'LEARNING', 'HACKATHON',
        'OPENSOURCE', 'COMPANY', 'DESIGN', 'DATA_SCIENCE', 'OTHER'
      ];
      if (!validCategories.includes(category as PlatformCategory)) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid category' 
          },
          { status: 400 }
        );
      }
      categoryFilter = category as PlatformCategory;
    }

    // Build query
    const whereClause: {
      userId: string;
      date: { gte: Date; lte: Date };
      platformId?: string;
      category?: PlatformCategory;
    } = {
      userId,
      date: { gte: startDate, lte: endDate },
    };

    if (platformId) {
      whereClause.platformId = platformId;
    }
    if (categoryFilter) {
      whereClause.category = categoryFilter;
    }

    // Fetch entries
    const entries = await prisma.trackerEntry.findMany({
      where: whereClause,
      select: {
        date: true,
        problemsSolved: true,
        commits: true,
        pullRequests: true,
        timeSpent: true,
        points: true,
      },
      orderBy: { date: 'asc' },
    });

    // Aggregate by granularity
    const aggregatedData = new Map<string, { value: number; count: number }>();

    entries.forEach((entry) => {
      let key: string;
      switch (granularity) {
        case 'week':
          key = format(startOfWeek(entry.date), 'yyyy-MM-dd');
          break;
        case 'month':
          key = format(entry.date, 'yyyy-MM');
          break;
        case 'day':
        default:
          key = format(entry.date, 'yyyy-MM-dd');
      }

      const existing = aggregatedData.get(key) ?? { value: 0, count: 0 };
      existing.value += getMetricValue(entry, metric);
      existing.count += 1;
      aggregatedData.set(key, existing);
    });

    // Generate trend data points
    let trend: TrendDataPoint[] = [];

    if (granularity === 'day') {
      const allDays = eachDayOfInterval({ start: startDate, end: endDate });
      trend = allDays.map((day) => {
        const key = format(day, 'yyyy-MM-dd');
        const data = aggregatedData.get(key);
        return {
          date: key,
          label: format(day, 'MMM d'),
          value: data?.value ?? 0,
        };
      });
    } else if (granularity === 'week') {
      const allWeeks = eachWeekOfInterval({ start: startDate, end: endDate });
      trend = allWeeks.map((week) => {
        const weekStartDate = startOfWeek(week);
        const weekEndDate = endOfWeek(week);
        const key = format(weekStartDate, 'yyyy-MM-dd');
        const data = aggregatedData.get(key);
        return {
          date: key,
          label: `${format(weekStartDate, 'MMM d')} - ${format(weekEndDate, 'MMM d')}`,
          value: data?.value ?? 0,
        };
      });
    } else {
      // Month granularity
      const months: string[] = [];
      const current = new Date(startDate);
      while (current <= endDate) {
        months.push(format(current, 'yyyy-MM'));
        current.setMonth(current.getMonth() + 1);
      }
      trend = months.map((month) => {
        const data = aggregatedData.get(month);
        return {
          date: month,
          label: format(parseISO(month + '-01'), 'MMM yyyy'),
          value: data?.value ?? 0,
        };
      });
    }

    // Add cumulative values if requested
    if (cumulativeParam) {
      let cumulative = 0;
      trend = trend.map((point) => {
        cumulative += point.value;
        return { ...point, cumulativeValue: cumulative };
      });
    }

    // Calculate moving average if requested
    let movingAverage: TrendDataPoint[] | undefined;
    if (movingAvgParam) {
      const window = parseInt(movingAvgParam, 10);
      if (!isNaN(window) && window >= 2 && window <= 14) {
        movingAverage = calculateMovingAverage(trend, window);
      }
    }

    // Generate week summaries if requested
    let weekSummaries: WeekSummary[] | undefined;
    if (includeWeekSummaries) {
      weekSummaries = generateWeekSummaries(entries, metric, startDate, endDate);
    }

    // Calculate summary
    const values = trend.map((p) => p.value);
    const total = values.reduce((a, b) => a + b, 0);
    const average = values.length > 0 ? Math.round(total / values.length) : 0;
    
    const maxPoint = trend.reduce((max, p) => p.value > max.value ? p : max, trend[0] ?? { value: 0, date: '' });
    const minPoint = trend.filter((p) => p.value > 0).reduce(
      (min, p) => p.value < min.value ? p : min, 
      trend.find((p) => p.value > 0) ?? { value: 0, date: '' }
    );

    const trendDirection = determineTrend(trend);

    // Calculate growth rate (last value vs first non-zero value)
    const firstNonZero = trend.find((p) => p.value > 0);
    const lastValue = trend[trend.length - 1];
    let growthRate = 0;
    if (firstNonZero && lastValue && firstNonZero.value > 0) {
      growthRate = Math.round(((lastValue.value - firstNonZero.value) / firstNonZero.value) * 100);
    }

    // Period comparison if requested
    let comparison: PeriodComparison | undefined;
    if (compareParam && previousStartDate && previousEndDate) {
      const previousEntries = await prisma.trackerEntry.findMany({
        where: {
          userId,
          date: { gte: previousStartDate, lte: previousEndDate },
          ...(platformId && { platformId }),
          ...(categoryFilter && { category: categoryFilter }),
        },
        select: {
          date: true,
          problemsSolved: true,
          commits: true,
          pullRequests: true,
          timeSpent: true,
          points: true,
        },
      });

      const currentValue = total;
      const previousValue = previousEntries.reduce(
        (s, e) => s + getMetricValue(e, metric), 
        0
      );

      const currentActiveDays = new Set(
        entries.map((e) => format(e.date, 'yyyy-MM-dd'))
      ).size;
      const previousActiveDays = new Set(
        previousEntries.map((e) => format(e.date, 'yyyy-MM-dd'))
      ).size;

      const currentTotalDays = differenceInDays(endDate, startDate) + 1;
      const previousTotalDays = differenceInDays(previousEndDate, previousStartDate) + 1;

      const currentAvgPerDay = currentActiveDays > 0 
        ? Math.round(currentValue / currentActiveDays) 
        : 0;
      const previousAvgPerDay = previousActiveDays > 0 
        ? Math.round(previousValue / previousActiveDays) 
        : 0;

      const changeValue = currentValue - previousValue;
      const changePercent = previousValue > 0 
        ? Math.round((changeValue / previousValue) * 100) 
        : currentValue > 0 ? 100 : 0;

      let changeTrend: 'up' | 'down' | 'stable' = 'stable';
      if (changePercent > 5) changeTrend = 'up';
      else if (changePercent < -5) changeTrend = 'down';

      comparison = {
        current: {
          label: getPeriodLabel(periodType),
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          value: currentValue,
          activeDays: currentActiveDays,
          avgPerDay: currentAvgPerDay,
          totalDays: currentTotalDays,
        },
        previous: {
          label: `Previous ${getPeriodLabel(periodType)}`,
          startDate: previousStartDate.toISOString(),
          endDate: previousEndDate.toISOString(),
          value: previousValue,
          activeDays: previousActiveDays,
          avgPerDay: previousAvgPerDay,
          totalDays: previousTotalDays,
        },
        change: {
          absolute: changeValue,
          percent: changePercent,
          trend: changeTrend,
          activeDaysChange: currentActiveDays - previousActiveDays,
          avgPerDayChange: currentAvgPerDay - previousAvgPerDay,
        },
      };
    }

    // Build response
    const response: TrendResponse = {
      success: true,
      data: {
        metric,
        granularity,
        periodType,
        trend,
        comparison,
        weekSummaries,
        summary: {
          total,
          average,
          max: { value: maxPoint?.value ?? 0, date: maxPoint?.date ?? '' },
          min: { value: minPoint?.value ?? 0, date: minPoint?.date ?? '' },
          trend: trendDirection,
          growthRate,
        },
        movingAverage,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days: daysDiff + 1,
        },
      },
      meta: {
        generatedAt: new Date().toISOString(),
      },
    };

    // Cache headers
    const headers = new Headers();
    headers.set('Cache-Control', 'private, max-age=120'); // 2 minutes

    return NextResponse.json(response, { headers });

  } catch (error) {
    console.error('Error fetching trends:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to fetch trends' 
      },
      { status: 500 }
    );
  }
}