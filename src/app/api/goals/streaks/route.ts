// =============================================================================
// src/app/api/goals/streaks/route.ts
// =============================================================================
// Description: Streak-specific statistics and management
// Methods: GET, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 30 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { GoalStatus, GoalType } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { startOfDay, subDays, differenceInDays, format } from 'date-fns';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=60',
};

// =============================================================================
// STREAK MILESTONES
// =============================================================================

interface StreakMilestone {
  days: number;
  label: string;
  icon: string;
  color: string;
  achieved: boolean;
  achievedAt?: string;
}

const STREAK_MILESTONES: Omit<StreakMilestone, 'achieved' | 'achievedAt'>[] = [
  { days: 3, label: 'Getting Started', icon: '🌱', color: '#10B981' },
  { days: 7, label: 'Week Warrior', icon: '⚡', color: '#3B82F6' },
  { days: 14, label: 'Fortnight Fighter', icon: '🔥', color: '#F59E0B' },
  { days: 21, label: 'Habit Forming', icon: '💪', color: '#8B5CF6' },
  { days: 30, label: 'Monthly Master', icon: '🏆', color: '#EF4444' },
  { days: 60, label: 'Two Month Titan', icon: '⭐', color: '#EC4899' },
  { days: 90, label: 'Quarterly Champion', icon: '🎯', color: '#6366F1' },
  { days: 100, label: 'Century Club', icon: '💯', color: '#14B8A6' },
  { days: 180, label: 'Half Year Hero', icon: '🌟', color: '#F97316' },
  { days: 365, label: 'Year Long Legend', icon: '👑', color: '#DC2626' },
];

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

async function validateRequest(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `goals-streaks:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return {
      error: apiResponse.rateLimited(60, requestId),
      session: null,
      rateLimitResult,
    };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      error: apiResponse.unauthorized('Authentication required', requestId),
      session: null,
      rateLimitResult,
    };
  }

  return { error: null, session, rateLimitResult };
}

interface StreakCalculationResult {
  currentStreak: number;
  longestStreak: number;
  streakStartDate: Date | null;
  lastActivityDate: Date | null;
  streakBrokenAt: Date | null;
  activeDates: string[];
}

async function calculateStreakFromEntries(userId: string): Promise<StreakCalculationResult> {
  // Get tracker entries for the past year
  const entries = await prisma.trackerEntry.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    select: { date: true },
    take: 400,
  });

  if (entries.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      streakStartDate: null,
      lastActivityDate: null,
      streakBrokenAt: null,
      activeDates: [],
    };
  }

  // Get unique dates
  const uniqueDatesSet = new Set<string>();
  entries.forEach((entry) => {
    uniqueDatesSet.add(format(startOfDay(entry.date), 'yyyy-MM-dd'));
  });

  const activeDates = Array.from(uniqueDatesSet).sort().reverse();
  const uniqueTimestamps = activeDates.map((d) => new Date(d).getTime());

  const today = startOfDay(new Date()).getTime();
  const yesterday = today - 86400000;

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;
  let streakStartDate: Date | null = null;
  let streakBrokenAt: Date | null = null;
  const lastActivityDate = entries.length > 0 ? entries[0].date : null;

  // Check if streak is active (activity today or yesterday)
  if (uniqueTimestamps.length > 0) {
    const mostRecent = uniqueTimestamps[0];

    if (mostRecent >= yesterday) {
      currentStreak = 1;
      streakStartDate = new Date(mostRecent);

      // Count consecutive days backwards
      for (let i = 1; i < uniqueTimestamps.length; i++) {
        const diff = uniqueTimestamps[i - 1] - uniqueTimestamps[i];
        if (diff === 86400000) {
          currentStreak++;
          streakStartDate = new Date(uniqueTimestamps[i]);
        } else {
          streakBrokenAt = new Date(uniqueTimestamps[i]);
          break;
        }
      }
    } else {
      streakBrokenAt = new Date(mostRecent);
    }

    // Calculate longest streak
    tempStreak = 1;
    for (let i = 1; i < uniqueTimestamps.length; i++) {
      const diff = uniqueTimestamps[i - 1] - uniqueTimestamps[i];
      if (diff === 86400000) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, currentStreak, tempStreak);
  }

  return {
    currentStreak,
    longestStreak,
    streakStartDate,
    lastActivityDate,
    streakBrokenAt,
    activeDates,
  };
}

// =============================================================================
// OPTIONS - CORS Preflight
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  const response = new NextResponse(null, { status: 204 });
  return addHeaders(response, requestId);
}

// =============================================================================
// HEAD - Resource Metadata
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, longestStreak: true },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Current-Streak', String(user?.currentStreak || 0));
    response.headers.set('X-Longest-Streak', String(user?.longestStreak || 0));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/streaks failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Streak Statistics
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        streakStartDate: true,
        streakFreezeCount: true,
        streakFreezeUsedAt: true,
        lastActivityDate: true,
      },
    });

    // Calculate streak from tracker entries
    const streakData = await calculateStreakFromEntries(userId);

    // Use the higher of stored or calculated streak
    const currentStreak = Math.max(user?.currentStreak || 0, streakData.currentStreak);
    const longestStreak = Math.max(user?.longestStreak || 0, streakData.longestStreak);

    // Get streak-related goals
    const streakGoals = await prisma.goal.findMany({
      where: {
        userId,
        goalType: GoalType.STREAK,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        target: true,
        progress: true,
        progressPercentage: true,
        status: true,
        currentStreakDays: true,
        requiredStreakDays: true,
      },
    });

    // Calculate milestones
    const milestones: StreakMilestone[] = STREAK_MILESTONES.map((milestone) => ({
      ...milestone,
      achieved: currentStreak >= milestone.days,
      achievedAt: currentStreak >= milestone.days && streakData.streakStartDate
        ? format(
            subDays(new Date(), currentStreak - milestone.days),
            'yyyy-MM-dd'
          )
        : undefined,
    }));

    // Find next milestone
    const nextMilestone = milestones.find((m) => !m.achieved);
    const daysToNextMilestone = nextMilestone ? nextMilestone.days - currentStreak : null;

    // Get last 30 days activity
    const today = startOfDay(new Date());
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      return {
        date: dateStr,
        hasActivity: streakData.activeDates.includes(dateStr),
        dayOfWeek: format(date, 'EEE'),
      };
    }).reverse();

    // Calculate weekly stats
    const last7DaysActivity = last30Days.slice(-7).filter((d) => d.hasActivity).length;
    const weeklyAverage = Math.round((last30Days.filter((d) => d.hasActivity).length / 4) * 10) / 10;

    // Calculate risk status
    let riskStatus: 'safe' | 'at-risk' | 'critical' = 'safe';
    let hoursUntilStreakBreaks: number | null = null;

    if (currentStreak > 0 && streakData.lastActivityDate) {
      const hoursSinceLastActivity = differenceInDays(new Date(), streakData.lastActivityDate) * 24 +
        (new Date().getHours() - streakData.lastActivityDate.getHours());

      hoursUntilStreakBreaks = Math.max(0, 48 - hoursSinceLastActivity);

      if (hoursUntilStreakBreaks <= 4) {
        riskStatus = 'critical';
      } else if (hoursUntilStreakBreaks <= 12) {
        riskStatus = 'at-risk';
      }
    }

    // Get streak-related achievements
    const streakAchievements = await prisma.userAchievement.findMany({
      where: {
        userId,
        achievement: {
          OR: [
            { requirement: { path: ['metric'], equals: 'current_streak' } },
            { requirement: { path: ['metric'], equals: 'streak_days' } },
          ],
        },
      },
      include: {
        achievement: {
          select: {
            title: true,
            description: true,
            points: true,
            icon: true,
          },
        },
      },
      orderBy: { unlockedAt: 'desc' },
    });

    const stats = {
      currentStreak,
      longestStreak,
      streakStartDate: streakData.streakStartDate || user?.streakStartDate,
      lastActivityDate: streakData.lastActivityDate || user?.lastActivityDate,
      streakBrokenAt: streakData.streakBrokenAt,
      freezesAvailable: user?.streakFreezeCount || 0,
      lastFreezeUsed: user?.streakFreezeUsedAt,
      totalActiveDays: streakData.activeDates.length,
      riskStatus,
      hoursUntilStreakBreaks,
    };

    const streakGoalStats = {
      total: streakGoals.length,
      active: streakGoals.filter((g) => g.status === GoalStatus.ACTIVE).length,
      completed: streakGoals.filter((g) => g.status === GoalStatus.COMPLETED).length,
      goals: streakGoals,
    };

    const weeklyStats = {
      activeDaysThisWeek: last7DaysActivity,
      weeklyAverage,
      consistency: Math.round((last7DaysActivity / 7) * 100),
    };

    logger.info('GET /api/goals/streaks completed', {
      userId,
      currentStreak,
      longestStreak,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        stats,
        milestones,
        nextMilestone: nextMilestone || null,
        daysToNextMilestone,
        streakGoals: streakGoalStats,
        weeklyStats,
        last30Days,
        achievements: streakAchievements.map((a) => ({
          title: a.achievement.title,
          description: a.achievement.description,
          points: a.achievement.points,
          icon: a.achievement.icon,
          unlockedAt: a.unlockedAt,
        })),
        message: currentStreak > 0
          ? `${currentStreak} day streak! Keep it going!`
          : 'Start your streak today!',
      },
      { meta: { requestId } }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/streaks failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to get streak stats', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';