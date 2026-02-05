// src/app/api/user/streak/route.ts
// =============================================================================
// USER STREAK MANAGEMENT ROUTES
// =============================================================================
// Description: Manage user streaks, freezes, and streak history
// Methods: GET, POST, OPTIONS, HEAD
// Auth Required: True
// Rate Limit: 50 requests/minute
// =============================================================================

/* eslint-disable @typescript-eslint/no-unused-vars */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { streakService } from '@/services/streakService';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 50;
const STREAK_MILESTONES = [7, 14, 30, 50, 100, 150, 200, 365, 500, 1000];

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=60',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const useStreakFreezeSchema = z.object({
  action: z.literal('use_freeze'),
  confirm: z.literal(true),
});

const recordActivitySchema = z.object({
  action: z.literal('record_activity'),
  date: z.string().datetime().optional(),
});

const actionSchema = z.discriminatedUnion('action', [
  useStreakFreezeSchema,
  recordActivitySchema,
]);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
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
  const rateLimitKey = `user-streak:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return {
      error: apiResponse.rateLimited(60, requestId),
      session: null,
      rateLimitResult,
      ip,
    };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      error: apiResponse.unauthorized('Authentication required', requestId),
      session: null,
      rateLimitResult,
      ip,
    };
  }

  return { error: null, session, rateLimitResult, ip };
}

function getNextMilestone(currentStreak: number): number | null {
  for (const milestone of STREAK_MILESTONES) {
    if (milestone > currentStreak) {
      return milestone;
    }
  }
  return null;
}

function getStreakStatus(
  currentStreak: number,
  hadActivityToday: boolean,
  hoursUntilMidnight: number
): 'active' | 'at_risk' | 'safe' {
  if (currentStreak === 0) return 'safe';
  if (hadActivityToday) return 'safe';
  if (hoursUntilMidnight <= 6) return 'at_risk';
  return 'active';
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
// HEAD - Check Streak Status
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return addHeaders(new NextResponse(null, { status: 401 }), requestId);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        currentStreak: true,
        longestStreak: true,
        streakFreezeCount: true,
      },
    });

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Current-Streak': String(user?.currentStreak || 0),
        'X-Longest-Streak': String(user?.longestStreak || 0),
        'X-Freeze-Count': String(user?.streakFreezeCount || 0),
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD streak failed', { requestId }, error);
    return addHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// GET - Get Streak Information
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const validation = await validateSession(request, requestId);

    if (validation.error) {
      return addHeaders(validation.error, requestId, validation.rateLimitResult);
    }

    const { session, rateLimitResult, ip } = validation;
    const userId = session!.user.id;

    // Get streak info from service
    const streakInfo = await streakService.getStreakInfo(userId);

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
        timezone: true,
      },
    });

    // Get streak history
    const streakHistory = await prisma.streakHistory.findMany({
      where: { userId },
      orderBy: { endDate: 'desc' },
      take: 10,
      select: {
        id: true,
        startDate: true,
        endDate: true,
        length: true,
        endReason: true,
        totalProblems: true,
        totalCommits: true,
      },
    });

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await prisma.dailyStats.findMany({
      where: {
        userId,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: 'desc' },
      select: {
        date: true,
        hadActivity: true,
        totalProblems: true,
        totalCommits: true,
      },
    });

    // Build activity heatmap
    const activityMap: Record<string, boolean> = {};
    recentActivity.forEach((day) => {
      activityMap[day.date.toISOString().split('T')[0]] = day.hadActivity;
    });

    // Calculate streak stats
    const nextMilestone = getNextMilestone(streakInfo.currentStreak);
    const daysToMilestone = nextMilestone ? nextMilestone - streakInfo.currentStreak : null;
    const status = getStreakStatus(
      streakInfo.currentStreak,
      streakInfo.hadActivityToday,
      streakInfo.hoursUntilMidnight
    );

    // Check if freeze can be used today
    const canUseFreeze =
      user?.streakFreezeCount &&
      user.streakFreezeCount > 0 &&
      !streakInfo.hadActivityToday &&
      streakInfo.currentStreak > 0;

    // Check if freeze was used today
    const freezeUsedToday =
      user?.streakFreezeUsedAt &&
      new Date(user.streakFreezeUsedAt).toDateString() === new Date().toDateString();

    logger.debug('Streak info fetched', {
      userId,
      currentStreak: streakInfo.currentStreak,
      status,
      requestId,
      ip,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        streak: {
          current: streakInfo.currentStreak,
          longest: streakInfo.longestStreak,
          startDate: streakInfo.streakStartDate,
          status,
          hadActivityToday: streakInfo.hadActivityToday,
          hoursUntilMidnight: Math.round(streakInfo.hoursUntilMidnight * 10) / 10,
          isAtRisk: streakInfo.isAtRisk,
        },
        freeze: {
          available: user?.streakFreezeCount || 0,
          canUseToday: canUseFreeze && !freezeUsedToday,
          usedToday: freezeUsedToday,
          lastUsedAt: user?.streakFreezeUsedAt,
        },
        milestones: {
          next: nextMilestone,
          daysRemaining: daysToMilestone,
          achieved: STREAK_MILESTONES.filter((m) => m <= streakInfo.currentStreak),
        },
        history: streakHistory,
        activity: {
          last30Days: activityMap,
          recentDays: recentActivity.slice(0, 7),
        },
        timezone: user?.timezone || 'UTC',
      },
      {
        meta: { requestId },
      }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET streak failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch streak info', requestId), requestId);
  }
}

// =============================================================================
// POST - Use Streak Freeze or Record Activity
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const validation = await validateSession(request, requestId);

    if (validation.error) {
      return addHeaders(validation.error, requestId, validation.rateLimitResult);
    }

    const { session, rateLimitResult, ip } = validation;
    const userId = session!.user.id;
    const userAgent = request.headers.get('user-agent');

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const bodyValidation = actionSchema.safeParse(body);

    if (!bodyValidation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', bodyValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const data = bodyValidation.data;

    if (data.action === 'use_freeze') {
      logger.info('Using streak freeze', { userId, requestId, ip });

      const success = await streakService.useStreakFreeze(userId);

      if (!success) {
        return addHeaders(
          apiResponse.validationError(
            'Cannot use streak freeze. Either no freezes available, already used today, or you already have activity today.',
            undefined,
            requestId
          ),
          requestId,
          rateLimitResult
        );
      }

      // Get updated info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          currentStreak: true,
          streakFreezeCount: true,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          category: 'streak',
          description: 'Streak freeze used',
          newValue: { freezesRemaining: user?.streakFreezeCount },
          ipAddress: ip,
          userAgent,
          status: 'success',
        },
      });

      logger.info('Streak freeze used', {
        userId,
        freezesRemaining: user?.streakFreezeCount,
        currentStreak: user?.currentStreak,
        requestId,
        ip,
        duration: Date.now() - startTime,
      });

      const response = apiResponse.success(
        {
          message: 'Streak freeze used successfully! Your streak is protected for today.',
          streak: {
            current: user?.currentStreak || 0,
            protected: true,
          },
          freeze: {
            remaining: user?.streakFreezeCount || 0,
          },
        },
        {
          meta: { requestId },
        }
      );

      return addHeaders(response, requestId, rateLimitResult);
    }

    if (data.action === 'record_activity') {
      logger.info('Recording activity', { userId, requestId, ip });

      const result = await streakService.recordActivity(userId);

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          category: 'streak',
          description: result.streakBroken ? 'New streak started' : 'Activity recorded',
          newValue: {
            newStreak: result.newStreak,
            milestoneReached: result.milestoneReached,
          },
          ipAddress: ip,
          userAgent,
          status: 'success',
        },
      });

      logger.info('Activity recorded', {
        userId,
        newStreak: result.newStreak,
        streakBroken: result.streakBroken,
        milestoneReached: result.milestoneReached,
        requestId,
        ip,
        duration: Date.now() - startTime,
      });

      const response = apiResponse.success(
        {
          ...result,
          streak: {
            current: result.newStreak,
            wasReset: result.streakBroken,
          },
        },
        {
          meta: { requestId },
        }
      );

      return addHeaders(response, requestId, rateLimitResult);
    }

    return addHeaders(
      apiResponse.validationError('Unknown action', undefined, requestId),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('POST streak failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to process streak action', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';