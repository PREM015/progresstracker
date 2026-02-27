// src/app/api/analytics/productivity/route.ts
// =============================================================================
// Productivity Metrics
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
import { subDays, startOfDay, endOfDay, format, getDay, eachDayOfInterval } from 'date-fns';

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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  days: z.coerce.number().int().min(7).max(365).default(30),
  includePatterns: z.enum(['true', 'false']).optional().transform(v => v !== 'false'),
  includeComparison: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
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
  const rateLimitKey = `analytics-productivity:${ip}`;
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

function calculateProductivityScore(data: {
  activeDays: number;
  totalDays: number;
  problems: number;
  avgProblemsPerDay: number;
  streakDays: number;
  focusRatio: number;
}): number {
  // Weighted scoring
  const consistencyScore = (data.activeDays / data.totalDays) * 30; // 30% weight
  const volumeScore = Math.min(data.avgProblemsPerDay / 5, 1) * 25; // 25% weight (5 problems/day = 100%)
  const streakScore = Math.min(data.streakDays / 14, 1) * 25; // 25% weight (14 days = 100%)
  const focusScore = data.focusRatio * 20; // 20% weight

  return Math.round(consistencyScore + volumeScore + streakScore + focusScore);
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
    response.headers.set('X-Metric-Type', 'productivity');

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD analytics/productivity failed', { requestId }, error);
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
      includePatterns: searchParams.get('includePatterns') || undefined,
      includeComparison: searchParams.get('includeComparison') || undefined,
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

    // Fetch data
    const [user, entries] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { currentStreak: true, longestStreak: true },
      }),
      prisma.trackerEntry.findMany({
        where: { userId, date: { gte: startDate, lte: endDate } },
        select: {
          date: true,
          problemsSolved: true,
          commits: true,
          timeSpent: true,
          focusTime: true,
          productivityRating: true,
          mood: true,
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    // Basic calculations
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    const totalDays = allDays.length;
    const activeDays = new Set(entries.map(e => e.date.toDateString())).size;

    const totalProblems = entries.reduce((sum, e) => sum + e.problemsSolved, 0);
    const totalCommits = entries.reduce((sum, e) => sum + e.commits, 0);
    const totalTime = entries.reduce((sum, e) => sum + e.timeSpent, 0);
    const totalFocusTime = entries.reduce((sum, e) => sum + (e.focusTime || 0), 0);

    const avgProblemsPerDay = activeDays > 0 ? totalProblems / activeDays : 0;
    const avgTimePerDay = activeDays > 0 ? totalTime / activeDays : 0;
    const focusRatio = totalTime > 0 ? totalFocusTime / totalTime : 0;

    // Calculate productivity score
    const productivityScore = calculateProductivityScore({
      activeDays,
      totalDays,
      problems: totalProblems,
      avgProblemsPerDay,
      streakDays: user?.currentStreak || 0,
      focusRatio,
    });

    // Day of week analysis
    const dayOfWeekStats: Array<{
      day: string;
      dayIndex: number;
      problems: number;
      time: number;
      entries: number;
      avgProblems: number;
    }> = DAY_NAMES.map((name, index) => ({
      day: name,
      dayIndex: index,
      problems: 0,
      time: 0,
      entries: 0,
      avgProblems: 0,
    }));

    entries.forEach(entry => {
      const dow = getDay(entry.date);
      dayOfWeekStats[dow].problems += entry.problemsSolved;
      dayOfWeekStats[dow].time += entry.timeSpent;
      dayOfWeekStats[dow].entries += 1;
    });

    // Calculate day counts in the range
    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
    allDays.forEach(day => {
      dayOfWeekCounts[getDay(day)]++;
    });

    dayOfWeekStats.forEach((stat, index) => {
      stat.avgProblems = dayOfWeekCounts[index] > 0
        ? Math.round((stat.problems / dayOfWeekCounts[index]) * 10) / 10
        : 0;
    });

    // Find best and worst days
    const sortedDays = [...dayOfWeekStats].sort((a, b) => b.avgProblems - a.avgProblems);
    const bestDay = sortedDays[0];
    const worstDay = sortedDays[sortedDays.length - 1];

    // Weekly patterns
    let patterns = null;
    if (params.includePatterns) {
      // Weekly aggregation
      const weeklyData: Array<{
        week: string;
        problems: number;
        commits: number;
        time: number;
        activeDays: number;
      }> = [];

      let currentWeek = '';
      let weekData = { problems: 0, commits: 0, time: 0, days: new Set<string>() };

      entries.forEach(entry => {
        const weekStr = format(entry.date, 'yyyy-ww');
        if (weekStr !== currentWeek) {
          if (currentWeek) {
            weeklyData.push({
              week: currentWeek,
              problems: weekData.problems,
              commits: weekData.commits,
              time: weekData.time,
              activeDays: weekData.days.size,
            });
          }
          currentWeek = weekStr;
          weekData = { problems: 0, commits: 0, time: 0, days: new Set<string>() };
        }

        weekData.problems += entry.problemsSolved;
        weekData.commits += entry.commits;
        weekData.time += entry.timeSpent;
        weekData.days.add(entry.date.toDateString());
      });

      // Add last week
      if (currentWeek) {
        weeklyData.push({
          week: currentWeek,
          problems: weekData.problems,
          commits: weekData.commits,
          time: weekData.time,
          activeDays: weekData.days.size,
        });
      }

      // Mood correlation
      const moodStats: Record<string, { count: number; problems: number; time: number }> = {};
      entries.forEach(entry => {
        if (entry.mood) {
          if (!moodStats[entry.mood]) {
            moodStats[entry.mood] = { count: 0, problems: 0, time: 0 };
          }
          moodStats[entry.mood].count++;
          moodStats[entry.mood].problems += entry.problemsSolved;
          moodStats[entry.mood].time += entry.timeSpent;
        }
      });

      const moodCorrelation = Object.entries(moodStats).map(([mood, data]) => ({
        mood,
        entries: data.count,
        avgProblems: Math.round((data.problems / data.count) * 10) / 10,
        avgTime: Math.round(data.time / data.count),
      }));

      patterns = {
        weeklyTrend: weeklyData,
        moodCorrelation,
        bestTimeToWork: bestDay.day,
        consistencyScore: Math.round((activeDays / totalDays) * 100),
      };
    }

    // Previous period comparison
    let comparison = null;
    if (params.includeComparison) {
      const previousStart = subDays(startDate, params.days);
      const previousEntries = await prisma.trackerEntry.findMany({
        where: { userId, date: { gte: previousStart, lt: startDate } },
        select: { date: true, problemsSolved: true, commits: true, timeSpent: true },
      });

      const prevTotalProblems = previousEntries.reduce((sum, e) => sum + e.problemsSolved, 0);
      const prevActiveDays = new Set(previousEntries.map(e => e.date.toDateString())).size;
      const prevTotalTime = previousEntries.reduce((sum, e) => sum + e.timeSpent, 0);

      comparison = {
        problems: {
          current: totalProblems,
          previous: prevTotalProblems,
          change: totalProblems - prevTotalProblems,
          changePercent: prevTotalProblems > 0 ? Math.round(((totalProblems - prevTotalProblems) / prevTotalProblems) * 100) : 0,
        },
        activeDays: {
          current: activeDays,
          previous: prevActiveDays,
          change: activeDays - prevActiveDays,
        },
        time: {
          current: totalTime,
          previous: prevTotalTime,
          change: totalTime - prevTotalTime,
          changePercent: prevTotalTime > 0 ? Math.round(((totalTime - prevTotalTime) / prevTotalTime) * 100) : 0,
        },
      };
    }

    // Build response
    const response = {
      score: productivityScore,
      scoreBreakdown: {
        consistency: Math.round((activeDays / totalDays) * 100),
        volume: Math.round(Math.min(avgProblemsPerDay / 5, 1) * 100),
        streak: Math.round(Math.min((user?.currentStreak || 0) / 14, 1) * 100),
        focus: Math.round(focusRatio * 100),
      },
      metrics: {
        totalProblems,
        totalCommits,
        totalTime,
        totalFocusTime,
        activeDays,
        totalDays,
        activityRate: Math.round((activeDays / totalDays) * 100),
        avgProblemsPerDay: Math.round(avgProblemsPerDay * 10) / 10,
        avgTimePerDay: Math.round(avgTimePerDay),
        avgCommitsPerDay: Math.round((totalCommits / activeDays) * 10) / 10 || 0,
        focusRatio: Math.round(focusRatio * 100),
        currentStreak: user?.currentStreak || 0,
        longestStreak: user?.longestStreak || 0,
      },
      dayOfWeek: {
        data: dayOfWeekStats,
        bestDay: { name: bestDay.day, avgProblems: bestDay.avgProblems },
        worstDay: { name: worstDay.day, avgProblems: worstDay.avgProblems },
      },
      patterns,
      comparison,
      period: {
        days: params.days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };

    logger.info('Productivity analytics fetched', {
      userId,
      days: params.days,
      score: productivityScore,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(response, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('GET analytics/productivity failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch productivity metrics', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';