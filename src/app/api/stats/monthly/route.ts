// src/app/api/stats/monthly/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatsService } from '@/services/statsService';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  subMonths,
  eachDayOfInterval,
  parseISO,
  isValid,
} from 'date-fns';

// =============================================================================
// TYPES
// =============================================================================

interface MonthlyDataPoint {
  month: string;
  monthName: string;
  year: number;
  problems: number;
  commits: number;
  pullRequests: number;
  timeSpent: number;
  points: number;
  activeDays: number;
  totalDays: number;
  activityRate: number;
  avgProblemsPerDay: number;
  avgTimePerDay: number;
}

interface MonthlyComparisonData {
  current: MonthlyDataPoint;
  previous: MonthlyDataPoint;
  changes: {
    problems: { value: number; percent: number; trend: 'up' | 'down' | 'stable' };
    commits: { value: number; percent: number; trend: 'up' | 'down' | 'stable' };
    timeSpent: { value: number; percent: number; trend: 'up' | 'down' | 'stable' };
    activeDays: { value: number; percent: number; trend: 'up' | 'down' | 'stable' };
  };
}

interface MonthlyResponse {
  success: boolean;
  data: {
    months: MonthlyDataPoint[];
    summary: {
      totalProblems: number;
      totalCommits: number;
      totalTimeSpent: number;
      totalPoints: number;
      totalActiveDays: number;
      avgProblemsPerMonth: number;
      avgActiveDaysPerMonth: number;
      bestMonth: {
        month: string;
        monthName: string;
        problems: number;
      } | null;
      growthTrend: 'increasing' | 'decreasing' | 'stable';
      currentStreak: number;
      longestStreak: number;
    };
    comparison: MonthlyComparisonData | null;
    period: {
      startDate: string;
      endDate: string;
      monthsIncluded: number;
    };
  };
  meta: {
    generatedAt: string;
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function calculateChange(
  current: number, 
  previous: number
): { value: number; percent: number; trend: 'up' | 'down' | 'stable' } {
  const value = current - previous;
  let percent = 0;
  
  if (previous > 0) {
    percent = Math.round((value / previous) * 100);
  } else if (current > 0) {
    percent = 100;
  }

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (percent > 5) trend = 'up';
  else if (percent < -5) trend = 'down';

  return { value, percent, trend };
}

function getMonthData(
  entries: Array<{
    date: Date;
    problemsSolved: number;
    commits: number;
    pullRequests: number;
    timeSpent: number;
    points: number | null;
  }>,
  monthStart: Date,
  monthEnd: Date
): MonthlyDataPoint {
  const monthEntries = entries.filter(
    (e) => e.date >= monthStart && e.date <= monthEnd
  );

  const problems = monthEntries.reduce((s, e) => s + e.problemsSolved, 0);
  const commits = monthEntries.reduce((s, e) => s + e.commits, 0);
  const pullRequests = monthEntries.reduce((s, e) => s + e.pullRequests, 0);
  const timeSpent = monthEntries.reduce((s, e) => s + e.timeSpent, 0);
  const points = monthEntries.reduce((s, e) => s + (e.points ?? 0), 0);

  const uniqueDays = new Set(
    monthEntries.map((e) => format(e.date, 'yyyy-MM-dd'))
  );
  const activeDays = uniqueDays.size;

  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const totalDays = allDays.length;

  return {
    month: format(monthStart, 'yyyy-MM'),
    monthName: format(monthStart, 'MMMM'),
    year: monthStart.getFullYear(),
    problems,
    commits,
    pullRequests,
    timeSpent,
    points,
    activeDays,
    totalDays,
    activityRate: Math.round((activeDays / totalDays) * 100),
    avgProblemsPerDay: activeDays > 0 ? Math.round(problems / activeDays) : 0,
    avgTimePerDay: activeDays > 0 ? Math.round(timeSpent / activeDays) : 0,
  };
}

function validateYearMonth(yearStr: string | null, monthStr: string | null): {
  valid: boolean;
  year?: number;
  month?: number;
  error?: string;
} {
  if (!yearStr || !monthStr) {
    return { valid: true };
  }

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  if (isNaN(year) || year < 2000 || year > 2100) {
    return { valid: false, error: 'Year must be between 2000 and 2100' };
  }

  if (isNaN(month) || month < 1 || month > 12) {
    return { valid: false, error: 'Month must be between 1 and 12' };
  }

  // Validate the date is valid
  const testDate = new Date(year, month - 1, 1);
  if (!isValid(testDate)) {
    return { valid: false, error: 'Invalid date' };
  }

  return { valid: true, year, month };
}

// =============================================================================
// GET - Monthly Stats Breakdown
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
          message: 'You must be logged in to view monthly stats' 
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    // Parse parameters
    const monthsParam = searchParams.get('months');
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    const compareParam = searchParams.get('compare');
    const platformId = searchParams.get('platformId');
    const specificDateParam = searchParams.get('specificDate');

    // Validate months parameter
    let months = 6; // Default to 6 months
    if (monthsParam) {
      const parsed = parseInt(monthsParam, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 24) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid months parameter',
            message: 'Months must be between 1 and 24' 
          },
          { status: 400 }
        );
      }
      months = parsed;
    }

    // Validate year and month if provided
    const yearMonthValidation = validateYearMonth(yearParam, monthParam);
    if (!yearMonthValidation.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: yearMonthValidation.error 
        },
        { status: 400 }
      );
    }

    let specificMonth: Date | null = null;
    if (yearMonthValidation.year && yearMonthValidation.month) {
      specificMonth = new Date(yearMonthValidation.year, yearMonthValidation.month - 1, 1);
    }

    // Also support specificDate parameter (ISO format)
    if (specificDateParam && !specificMonth) {
      const parsed = parseISO(specificDateParam);
      if (isValid(parsed)) {
        specificMonth = startOfMonth(parsed);
      }
    }

    // Validate platformId if provided
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
    }

    // Calculate date range
    const now = new Date();
    const endDate = specificMonth 
      ? endOfMonth(specificMonth) 
      : endOfMonth(now);
    const startDate = specificMonth
      ? startOfMonth(subMonths(specificMonth, months - 1))
      : startOfMonth(subMonths(now, months - 1));

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
      whereClause.platformId = platformId;
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
      orderBy: { date: 'desc' },
    });

    // Generate monthly data
    const monthlyData: MonthlyDataPoint[] = [];
    let currentMonth = startOfMonth(startDate);

    while (currentMonth <= endDate) {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      monthlyData.push(getMonthData(entries, monthStart, monthEnd));
      
      currentMonth = startOfMonth(subMonths(currentMonth, -1));
    }

    // Sort by month ascending
    monthlyData.sort((a, b) => a.month.localeCompare(b.month));

    // Generate comparison data if requested
    let comparison: MonthlyComparisonData | null = null;
    
    if (compareParam === 'true' && monthlyData.length >= 2) {
      const currentMonthData = monthlyData[monthlyData.length - 1];
      const previousMonthData = monthlyData[monthlyData.length - 2];

      comparison = {
        current: currentMonthData,
        previous: previousMonthData,
        changes: {
          problems: calculateChange(currentMonthData.problems, previousMonthData.problems),
          commits: calculateChange(currentMonthData.commits, previousMonthData.commits),
          timeSpent: calculateChange(currentMonthData.timeSpent, previousMonthData.timeSpent),
          activeDays: calculateChange(currentMonthData.activeDays, previousMonthData.activeDays),
        },
      };
    }

    // Calculate overall stats
    const totalStats = monthlyData.reduce(
      (acc, month) => ({
        problems: acc.problems + month.problems,
        commits: acc.commits + month.commits,
        timeSpent: acc.timeSpent + month.timeSpent,
        points: acc.points + month.points,
        activeDays: acc.activeDays + month.activeDays,
      }),
      { problems: 0, commits: 0, timeSpent: 0, points: 0, activeDays: 0 }
    );

    // Find best month
    const bestMonth = monthlyData.reduce((best, current) => 
      current.problems > best.problems ? current : best
    , monthlyData[0]);

    // Calculate growth trend
    let growthTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (monthlyData.length >= 3) {
      const recentMonths = monthlyData.slice(-3);
      const firstHalf = recentMonths[0].problems;
      const secondHalf = recentMonths[2].problems;
      
      if (secondHalf > firstHalf * 1.1) growthTrend = 'increasing';
      else if (secondHalf < firstHalf * 0.9) growthTrend = 'decreasing';
    }

    // Get streak data using StatsService
    const streakData = await StatsService.calculateStreak(userId);

    // Response
    const response: MonthlyResponse = {
      success: true,
      data: {
        months: monthlyData,
        summary: {
          totalProblems: totalStats.problems,
          totalCommits: totalStats.commits,
          totalTimeSpent: totalStats.timeSpent,
          totalPoints: totalStats.points,
          totalActiveDays: totalStats.activeDays,
          avgProblemsPerMonth: Math.round(totalStats.problems / monthlyData.length),
          avgActiveDaysPerMonth: Math.round(totalStats.activeDays / monthlyData.length),
          bestMonth: bestMonth ? {
            month: bestMonth.month,
            monthName: bestMonth.monthName,
            problems: bestMonth.problems,
          } : null,
          growthTrend,
          currentStreak: streakData.current,
          longestStreak: streakData.longest,
        },
        comparison,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          monthsIncluded: monthlyData.length,
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
    console.error('Error fetching monthly stats:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to fetch monthly stats' 
      },
      { status: 500 }
    );
  }
}