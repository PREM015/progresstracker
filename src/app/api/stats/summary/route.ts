// src/app/api/stats/summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatsService } from '@/services/statsService';
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
    cached: boolean;
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

export async function GET(request: NextRequest) {
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

    // Parallel queries for efficiency
    const [
      user,
      todayEntries,
      yesterdayEntries,
      thisWeekEntries,
      lastWeekEntries,
      thisMonthEntries,
      lastMonthEntries,
      thirtyDayEntries,
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
      // Today's entries
      prisma.trackerEntry.findMany({
        where: { userId, date: { gte: todayStart, lte: todayEnd } },
      }),
      // Yesterday's entries
      prisma.trackerEntry.findMany({
        where: { userId, date: { gte: yesterdayStart, lte: yesterdayEnd } },
      }),
      // This week entries
      prisma.trackerEntry.findMany({
        where: { userId, date: { gte: thisWeekStart, lte: thisWeekEnd } },
      }),
      // Last week entries
      prisma.trackerEntry.findMany({
        where: { userId, date: { gte: lastWeekStart, lte: lastWeekEnd } },
      }),
      // This month entries
      prisma.trackerEntry.findMany({
        where: { userId, date: { gte: thisMonthStart, lte: thisMonthEnd } },
      }),
      // Last month entries
      prisma.trackerEntry.findMany({
        where: { userId, date: { gte: lastMonthStart, lte: lastMonthEnd } },
      }),
      // Last 30 days
      prisma.trackerEntry.findMany({
        where: { userId, date: { gte: thirtyDaysAgo } },
      }),
      // Connected platforms
      prisma.userPlatform.count({
        where: { userId, isActive: true },
      }),
      // Active goals
      prisma.goal.count({
        where: { userId, status: 'ACTIVE' },
      }),
      // Completed goals
      prisma.goal.count({
        where: { userId, status: 'COMPLETED' },
      }),
      // Achievements
      prisma.userAchievement.count({
        where: { userId },
      }),
    ]);

    // Calculate totals
    const todayProblems = todayEntries.reduce((s, e) => s + e.problemsSolved, 0);
    const yesterdayProblems = yesterdayEntries.reduce((s, e) => s + e.problemsSolved, 0);
    
    const thisWeekProblems = thisWeekEntries.reduce((s, e) => s + e.problemsSolved, 0);
    const lastWeekProblems = lastWeekEntries.reduce((s, e) => s + e.problemsSolved, 0);
    
    const thisMonthProblems = thisMonthEntries.reduce((s, e) => s + e.problemsSolved, 0);
    const lastMonthProblems = lastMonthEntries.reduce((s, e) => s + e.problemsSolved, 0);

    const todayTime = todayEntries.reduce((s, e) => s + e.timeSpent, 0);
    const todayCommits = todayEntries.reduce((s, e) => s + e.commits, 0);

    const thirtyDayTime = thirtyDayEntries.reduce((s, e) => s + e.timeSpent, 0);
    const thirtyDayActiveDays = new Set(
      thirtyDayEntries.map((e) => format(e.date, 'yyyy-MM-dd'))
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
    const hasActivityToday = todayEntries.length > 0;
    const isAtRisk = currentStreak > 0 && !hasActivityToday;

    // Get user rank (simplified - in production, calculate from leaderboard)
    const userRank = user?.rank ?? null;

    // Build response
    const response: SummaryResponse = {
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
            value: thirtyDayActiveDays,
            displayValue: `${thirtyDayActiveDays}/30`,
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
      meta: {
        generatedAt: new Date().toISOString(),
        cached: false,
      },
    };

    // Update last active
    await prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    }).catch(() => {});

    // Cache headers - short cache for dashboard
    const headers = new Headers();
    headers.set('Cache-Control', 'private, max-age=30'); // 30 seconds

    return NextResponse.json(response, { headers });

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
}