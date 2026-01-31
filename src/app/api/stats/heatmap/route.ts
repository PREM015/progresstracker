// src/app/api/stats/heatmap/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  format, 
  startOfDay, 
  endOfDay, 
  subDays, 
  eachDayOfInterval,
  getDay,
  startOfWeek,
  parseISO,
  isValid,
  differenceInDays,
} from 'date-fns';

// =============================================================================
// TYPES
// =============================================================================

interface HeatmapDataPoint {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  dayOfWeek: number;
  weekNumber: number;
  details?: {
    problems: number;
    commits: number;
    timeSpent: number;
  };
}

interface HeatmapWeek {
  weekNumber: number;
  weekStart: string;
  days: HeatmapDataPoint[];
  total: number;
}

interface DayOfWeekStats {
  dayOfWeek: number;
  dayName: string;
  totalActivity: number;
  avgActivity: number;
  activeDays: number;
}

interface HeatmapResponse {
  success: boolean;
  data: {
    points: HeatmapDataPoint[];
    weeks?: HeatmapWeek[];
    dayOfWeekStats?: DayOfWeekStats[];
    summary: {
      totalActiveDays: number;
      totalDays: number;
      activityRate: number;
      currentStreak: number;
      longestStreak: number;
      maxCount: number;
      avgCount: number;
      mostActiveDay: string | null;
      mostActiveDayOfWeek: string | null;
    };
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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function calculateLevel(count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (maxCount === 0) return 0;
  
  const ratio = count / maxCount;
  
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

function calculateStreakFromDates(dates: string[]): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 };

  const sortedDates = [...dates].sort((a, b) => b.localeCompare(a));
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  // Current streak
  let current = 0;
  if (sortedDates[0] === today || sortedDates[0] === yesterday) {
    current = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const expected = format(subDays(parseISO(sortedDates[i - 1]), 1), 'yyyy-MM-dd');
      if (sortedDates[i] === expected) {
        current++;
      } else {
        break;
      }
    }
  }

  // Longest streak
  let longest = 1;
  let temp = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const expected = format(subDays(parseISO(sortedDates[i - 1]), 1), 'yyyy-MM-dd');
    if (sortedDates[i] === expected) {
      temp++;
      longest = Math.max(longest, temp);
    } else {
      temp = 1;
    }
  }

  return { current, longest };
}

function calculateDayOfWeekStats(points: HeatmapDataPoint[]): DayOfWeekStats[] {
  const stats: Map<number, { total: number; count: number; activeDays: number }> = new Map();

  // Initialize all days
  for (let i = 0; i < 7; i++) {
    stats.set(i, { total: 0, count: 0, activeDays: 0 });
  }

  points.forEach((point) => {
    const existing = stats.get(point.dayOfWeek)!;
    existing.total += point.count;
    existing.count++;
    if (point.count > 0) {
      existing.activeDays++;
    }
  });

  return Array.from(stats.entries())
    .map(([dayOfWeek, data]) => ({
      dayOfWeek,
      dayName: DAY_NAMES[dayOfWeek],
      totalActivity: data.total,
      avgActivity: data.count > 0 ? Math.round(data.total / data.count) : 0,
      activeDays: data.activeDays,
    }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

// =============================================================================
// GET - Heatmap Data
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
          message: 'You must be logged in to view heatmap data' 
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    // Parse parameters
    const daysParam = searchParams.get('days');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const metric = searchParams.get('metric') ?? 'combined'; // combined, problems, commits, time
    const includeWeeks = searchParams.get('includeWeeks') === 'true';
    const includeDetails = searchParams.get('includeDetails') === 'true';
    const includeDayStats = searchParams.get('includeDayStats') === 'true';
    const platformId = searchParams.get('platformId');

    // Validate metric
    const validMetrics = ['combined', 'problems', 'commits', 'time'];
    if (!validMetrics.includes(metric)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid metric',
          message: 'Valid metrics: combined, problems, commits, time' 
        },
        { status: 400 }
      );
    }

    // Determine date range
    let startDate: Date;
    let endDate: Date = endOfDay(new Date());

    if (startDateParam) {
      const parsed = parseISO(startDateParam);
      if (!isValid(parsed)) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid startDate format' 
          },
          { status: 400 }
        );
      }
      startDate = startOfDay(parsed);
    } else {
      const days = daysParam ? parseInt(daysParam, 10) : 365;
      if (isNaN(days) || days < 1 || days > 730) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid days parameter',
            message: 'Days must be between 1 and 730' 
          },
          { status: 400 }
        );
      }
      startDate = startOfDay(subDays(new Date(), days - 1));
    }

    if (endDateParam) {
      const parsed = parseISO(endDateParam);
      if (!isValid(parsed)) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid endDate format' 
          },
          { status: 400 }
        );
      }
      endDate = endOfDay(parsed);
    }

    // Validate date range
    if (startDate > endDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid date range' 
        },
        { status: 400 }
      );
    }

    const daysDiff = differenceInDays(endDate, startDate) + 1;
    if (daysDiff > 730) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Date range too large',
          message: 'Maximum range is 730 days (2 years)' 
        },
        { status: 400 }
      );
    }

    // Build query
    const whereClause: {
      userId: string;
      date: { gte: Date; lte: Date };
      platformId?: string;
    } = {
      userId,
      date: { gte: startDate, lte: endDate },
    };

    if (platformId) {
      const platform = await prisma.platform.findUnique({
        where: { id: platformId },
        select: { id: true },
      });
      if (!platform) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Platform not found' 
          },
          { status: 404 }
        );
      }
      whereClause.platformId = platformId;
    }

    // Fetch entries
    const entries = await prisma.trackerEntry.findMany({
      where: whereClause,
      select: {
        date: true,
        problemsSolved: true,
        commits: true,
        timeSpent: true,
      },
    });

    // Aggregate by day
    const dailyData = new Map<string, {
      problems: number;
      commits: number;
      timeSpent: number;
    }>();

    entries.forEach((entry) => {
      const dateKey = format(entry.date, 'yyyy-MM-dd');
      const existing = dailyData.get(dateKey) ?? {
        problems: 0,
        commits: 0,
        timeSpent: 0,
      };
      existing.problems += entry.problemsSolved;
      existing.commits += entry.commits;
      existing.timeSpent += entry.timeSpent;
      dailyData.set(dateKey, existing);
    });

    // Calculate counts based on metric
    const countMap = new Map<string, number>();
    dailyData.forEach((data, date) => {
      let count = 0;
      switch (metric) {
        case 'problems':
          count = data.problems;
          break;
        case 'commits':
          count = data.commits;
          break;
        case 'time':
          count = Math.round(data.timeSpent / 30); // 30 min = 1 unit
          break;
        case 'combined':
        default:
          count = data.problems + data.commits;
          break;
      }
      countMap.set(date, count);
    });

    // Find max for level calculation
    const counts = Array.from(countMap.values());
    const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
    const avgCount = counts.length > 0 
      ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length) 
      : 0;

    // Generate all days with week info
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    let weekNumber = 0;
    let lastWeekStart = '';

    const points: HeatmapDataPoint[] = allDays.map((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const count = countMap.get(dateKey) ?? 0;
      const dayData = dailyData.get(dateKey);
      const dayOfWeek = getDay(day);
      const weekStart = format(startOfWeek(day), 'yyyy-MM-dd');

      // Increment week number when week changes
      if (weekStart !== lastWeekStart) {
        weekNumber++;
        lastWeekStart = weekStart;
      }

      const point: HeatmapDataPoint = {
        date: dateKey,
        count,
        level: calculateLevel(count, maxCount),
        dayOfWeek,
        weekNumber,
      };

      if (includeDetails && dayData) {
        point.details = {
          problems: dayData.problems,
          commits: dayData.commits,
          timeSpent: dayData.timeSpent,
        };
      }

      return point;
    });

    // Group by weeks if requested
    let weeks: HeatmapWeek[] | undefined;
    if (includeWeeks) {
      const weekMap = new Map<number, { days: HeatmapDataPoint[]; weekStart: string }>();
      
      points.forEach((point) => {
        const existing = weekMap.get(point.weekNumber) ?? { 
          days: [], 
          weekStart: format(startOfWeek(parseISO(point.date)), 'yyyy-MM-dd'),
        };
        existing.days.push(point);
        weekMap.set(point.weekNumber, existing);
      });

      weeks = Array.from(weekMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([wn, data]) => ({
          weekNumber: wn,
          weekStart: data.weekStart,
          days: data.days,
          total: data.days.reduce((sum, d) => sum + d.count, 0),
        }));
    }

    // Calculate day of week stats if requested
    let dayOfWeekStats: DayOfWeekStats[] | undefined;
    if (includeDayStats) {
      dayOfWeekStats = calculateDayOfWeekStats(points);
    }

    // Calculate streak from active dates
    const activeDates = Array.from(countMap.entries())
      .filter(([, count]) => count > 0)
      .map(([date]) => date);

    const streaks = calculateStreakFromDates(activeDates);

    // Find most active day
    let mostActiveDay: string | null = null;
    let maxDayCount = 0;
    countMap.forEach((count, date) => {
      if (count > maxDayCount) {
        maxDayCount = count;
        mostActiveDay = date;
      }
    });

    // Find most active day of week
    let mostActiveDayOfWeek: string | null = null;
    if (dayOfWeekStats || includeDayStats) {
      const stats = dayOfWeekStats ?? calculateDayOfWeekStats(points);
      const mostActive = stats.reduce((max, day) => 
        day.totalActivity > max.totalActivity ? day : max
      , stats[0]);
      mostActiveDayOfWeek = mostActive?.dayName ?? null;
    }

    // Build response
    const response: HeatmapResponse = {
      success: true,
      data: {
        points,
        weeks,
        dayOfWeekStats,
        summary: {
          totalActiveDays: activeDates.length,
          totalDays: daysDiff,
          activityRate: Math.round((activeDates.length / daysDiff) * 100),
          currentStreak: streaks.current,
          longestStreak: streaks.longest,
          maxCount,
          avgCount,
          mostActiveDay,
          mostActiveDayOfWeek,
        },
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days: daysDiff,
        },
      },
      meta: {
        generatedAt: new Date().toISOString(),
      },
    };

    // Cache headers
    const headers = new Headers();
    headers.set('Cache-Control', 'private, max-age=300'); // 5 minutes

    return NextResponse.json(response, { headers });

  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to fetch heatmap data' 
      },
      { status: 500 }
    );
  }
}