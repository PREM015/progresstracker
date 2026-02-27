
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatsService } from '@/services/statsService';
import { withCache } from '@/lib/withCache';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
  format,
} from 'date-fns';

// =============================================================================
// TYPES
// =============================================================================

interface SummaryCard {
  label: string;
  value: number;
  displayValue: string;
  change?: {
    value: number;
    percent: number;
    trend: 'up' | 'down' | 'stable';
  };
  icon?: string;
  color?: string;
}

interface SummaryResponse {
  success: boolean;
  data: {
    cards: {
      totalProblems: SummaryCard;
      currentStreak: SummaryCard;
      todayProblems: SummaryCard;
      weeklyProblems: SummaryCard;
      monthlyProblems: SummaryCard;
      totalTime: SummaryCard;
      activeDays: SummaryCard;
      rank: SummaryCard;
    };
    quickStats: {
      connectedPlatforms: number;
      activeGoals: number;
      completedGoals: number;
      achievements: number;
      totalPoints: number;
    };
    streakInfo: {
      current: number;
      longest: number;
      isAtRisk: boolean;
      lastActivityDate: string | null;
    };
    todayProgress: {
      problems: number;
      commits: number;
      timeSpent: number;
      hasActivity: boolean;
    };
    lastUpdated: string;
  };
  meta: {
    generatedAt: string;
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

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

// =============================================================================
// GET - Quick Summary Stats
// =============================================================================

const handler = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: `You must be logged in to view summary stats. Session ID: ${session?.user?.id}`
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const now = new Date();

    // Date ranges
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const yesterdayStart = startOfDay(subDays(now, 1));
    const yesterdayEnd = endOfDay(subDays(now, 1));

    const thisWeekStart = startOfWeek(now);
    const thisWeekEnd = endOfWeek(now);
    const lastWeekStart = startOfWeek(subWeeks(now, 1));
    const lastWeekEnd = endOfWeek(subWeeks(now, 1));

    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const thirtyDaysAgo = subDays(now, 30);

    // Helper: aggregate sums for a period (replaces findMany → in-memory reduce)
    const periodAgg = (gte: Date, lte: Date) =>
      prisma.trackerEntry.aggregate({
        where: { userId, date: { gte, lte } },
        _sum: { problemsSolved: true, commits: true, timeSpent: true },
        _count: true,
      });

    // Parallel queries — all lightweight aggregates + counts
    const [
      user,
      todayAgg,
      yesterdayAgg,
      thisWeekAgg,
      lastWeekAgg,
      thisMonthAgg,
      lastMonthAgg,
      thirtyDayAgg,
      thirtyDayActiveDays,
      connectedPlatforms,
      activeGoals,
      completedGoals,
      achievements,
    ] = await Promise.all([
      // User data
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          currentStreak: true,
          longestStreak: true,
          totalProblems: true,
          totalCommits: true,
          totalPoints: true,
          rank: true,
          lastActivityDate: true,
        },
      }),
      periodAgg(todayStart, todayEnd),
      periodAgg(yesterdayStart, yesterdayEnd),
      periodAgg(thisWeekStart, thisWeekEnd),
      periodAgg(lastWeekStart, lastWeekEnd),
      periodAgg(thisMonthStart, thisMonthEnd),
      periodAgg(lastMonthStart, lastMonthEnd),
      periodAgg(thirtyDaysAgo, now),
      // Active days (30d) — lightweight: only fetch dates
      prisma.trackerEntry.findMany({
        where: { userId, date: { gte: thirtyDaysAgo } },
        select: { date: true },
        distinct: ['date'],
      }),
      prisma.userPlatform.count({ where: { userId, isActive: true } }),
      prisma.goal.count({ where: { userId, status: 'ACTIVE' } }),
      prisma.goal.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.userAchievement.count({ where: { userId } }),
    ]);

    // Extract sums
    const todayProblems = todayAgg._sum.problemsSolved || 0;
    const yesterdayProblems = yesterdayAgg._sum.problemsSolved || 0;

    const thisWeekProblems = thisWeekAgg._sum.problemsSolved || 0;
    const lastWeekProblems = lastWeekAgg._sum.problemsSolved || 0;

    const thisMonthProblems = thisMonthAgg._sum.problemsSolved || 0;
    const lastMonthProblems = lastMonthAgg._sum.problemsSolved || 0;

    const todayTime = todayAgg._sum.timeSpent || 0;
    const todayCommits = todayAgg._sum.commits || 0;

    const thirtyDayTime = thirtyDayAgg._sum.timeSpent || 0;
    const activeDaysCount = new Set(
      thirtyDayActiveDays.map((e) => format(e.date, 'yyyy-MM-dd'))
    ).size;

    // Calculate streak info
    let currentStreak = user?.currentStreak ?? 0;
    let longestStreak = user?.longestStreak ?? 0;

    // Recalculate if needed
    if (currentStreak === 0) {
      const streakData = await StatsService.calculateStreak(userId);
      currentStreak = streakData.current;
      longestStreak = streakData.longest;
    }

    // Check if streak is at risk (no activity today)
    const hasActivityToday = todayAgg._count > 0;
    const isAtRisk = currentStreak > 0 && !hasActivityToday;

    // Get user rank (simplified - in production, calculate from leaderboard)
    const userRank = user?.rank ?? null;

    // Build response
    const responseData = {
      success: true,
      data: {
        cards: {
          totalProblems: {
            label: 'Total Problems',
            value: user?.totalProblems ?? 0,
            displayValue: formatNumber(user?.totalProblems ?? 0),
            icon: 'code',
            color: 'blue',
          },
          currentStreak: {
            label: 'Current Streak',
            value: currentStreak,
            displayValue: `${currentStreak} day${currentStreak !== 1 ? 's' : ''}`,
            icon: 'flame',
            color: isAtRisk ? 'orange' : 'green',
          },
          todayProblems: {
            label: 'Today',
            value: todayProblems,
            displayValue: todayProblems.toString(),
            change: calculateChange(todayProblems, yesterdayProblems),
            icon: 'calendar',
            color: 'purple',
          },
          weeklyProblems: {
            label: 'This Week',
            value: thisWeekProblems,
            displayValue: thisWeekProblems.toString(),
            change: calculateChange(thisWeekProblems, lastWeekProblems),
            icon: 'chart',
            color: 'indigo',
          },
          monthlyProblems: {
            label: 'This Month',
            value: thisMonthProblems,
            displayValue: formatNumber(thisMonthProblems),
            change: calculateChange(thisMonthProblems, lastMonthProblems),
            icon: 'trending',
            color: 'teal',
          },
          totalTime: {
            label: 'Time (30 days)',
            value: thirtyDayTime,
            displayValue: formatDuration(thirtyDayTime),
            icon: 'clock',
            color: 'cyan',
          },
          activeDays: {
            label: 'Active Days (30d)',
            value: activeDaysCount,
            displayValue: `${activeDaysCount}/30`,
            icon: 'check',
            color: 'green',
          },
          rank: {
            label: 'Global Rank',
            value: userRank ?? 0,
            displayValue: userRank ? `#${formatNumber(userRank)}` : 'Unranked',
            icon: 'trophy',
            color: 'yellow',
          },
        },
        quickStats: {
          connectedPlatforms,
          activeGoals,
          completedGoals,
          achievements,
          totalPoints: user?.totalPoints ?? 0,
        },
        streakInfo: {
          current: currentStreak,
          longest: longestStreak,
          isAtRisk,
          lastActivityDate: user?.lastActivityDate?.toISOString() ?? null,
        },
        todayProgress: {
          problems: todayProblems,
          commits: todayCommits,
          timeSpent: todayTime,
          hasActivity: hasActivityToday,
        },
        lastUpdated: now.toISOString(),
      },
    };

    // Update last active (fire-and-forget) - only on cache MISS
    prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    }).catch(() => { });

    const response: SummaryResponse = {
      ...responseData,
      meta: {
        generatedAt: new Date().toISOString(),
      },
    };

    // Cache headers are handled by withCache (X-Cache, etc)
    // We just return JSON
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching summary stats:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to fetch summary stats'
      },
      { status: 500 }
    );
  }
};

export const GET = withCache(handler, {
  keyGenerator: async (req) => {
    const session = await getServerSession(authOptions);
    return session ? `stats:summary:${session.user.id}` : null;
  },
  ttl: 180,       // 3 minutes (matching original)
  staleTtl: 300,  // 5 min stale
  timingLabel: 'GET /api/stats/summary',
});