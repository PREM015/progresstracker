// src/app/api/user/onboarding/complete/route.ts
// =============================================================================
// COMPLETE ONBOARDING ROUTE
// =============================================================================
// Description: Mark onboarding as complete and trigger welcome actions
// Methods: POST, OPTIONS, HEAD
// Auth Required: True
// Rate Limit: 10 requests/minute
// =============================================================================

/* eslint-disable @typescript-eslint/no-unused-vars */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 10;

const ONBOARDING_ACHIEVEMENT_ID = 'onboarding-complete'; // Slug of the achievement

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const completeOnboardingSchema = z.object({
  skipRemainingSteps: z.boolean().default(false),
  feedback: z.string().max(500).optional(),
});

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
  const rateLimitKey = `onboarding-complete:${ip}`;
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

// =============================================================================
// OPTIONS - CORS Preflight
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  const response = new NextResponse(null, { status: 204 });
  return addHeaders(response, requestId);
}

// =============================================================================
// HEAD - Check Completion Status
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return addHeaders(new NextResponse(null, { status: 401 }), requestId);
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      select: { dashboardLayout: true, showWelcomeBanner: true },
    });

    const dashboardLayout = settings?.dashboardLayout as Record<string, unknown> | null;
    const isComplete = dashboardLayout?.onboardingComplete === true;

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Onboarding-Complete': String(isComplete),
        'X-Show-Welcome-Banner': String(settings?.showWelcomeBanner ?? true),
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD onboarding/complete failed', { requestId }, error);
    return addHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// POST - Complete Onboarding
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
      // Allow empty body
      body = {};
    }

    const bodyValidation = completeOnboardingSchema.safeParse(body);

    if (!bodyValidation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', bodyValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { skipRemainingSteps, feedback } = bodyValidation.data;

    logger.info('Completing onboarding', { userId, skipRemainingSteps, requestId, ip });

    // Check if already completed
    const existingSettings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { dashboardLayout: true },
    });

    const existingLayout = existingSettings?.dashboardLayout as Record<string, unknown> | null;
    if (existingLayout?.onboardingComplete === true) {
      return addHeaders(
        apiResponse.validationError('Onboarding already completed', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Perform completion in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update settings
      const dashboardLayout: Prisma.InputJsonValue = {
        ...(existingLayout || {}),
        onboardingComplete: true,
        onboardingSkipped: skipRemainingSteps,
        onboardingCompletedAt: new Date().toISOString(),
      };

      await tx.userSettings.upsert({
        where: { userId },
        create: {
          userId,
          dashboardLayout,
          showWelcomeBanner: false,
        },
        update: {
          dashboardLayout,
          showWelcomeBanner: false,
          updatedAt: new Date(),
        },
      });

      // Try to award onboarding achievement
      let achievementAwarded = false;
      const achievement = await tx.achievement.findUnique({
        where: { slug: ONBOARDING_ACHIEVEMENT_ID },
        select: { id: true, points: true, title: true },
      });

      if (achievement) {
        const existingAchievement = await tx.userAchievement.findUnique({
          where: {
            userId_achievementId: {
              userId,
              achievementId: achievement.id,
            },
          },
        });

        if (!existingAchievement) {
          await tx.userAchievement.create({
            data: {
              userId,
              achievementId: achievement.id,
              progress: 100,
              progressPercentage: 100,
            },
          });

          // Update user points and achievement count
          await tx.user.update({
            where: { id: userId },
            data: {
              totalPoints: { increment: achievement.points },
              totalAchievements: { increment: 1 },
            },
          });

          // Create notification
          await tx.notification.create({
            data: {
              userId,
              type: 'ACHIEVEMENT_UNLOCKED',
              title: 'Achievement Unlocked!',
              message: `You earned "${achievement.title}" for completing onboarding!`,
              entityType: 'achievement',
              entityId: achievement.id,
            },
          });

          achievementAwarded = true;
        }
      }

      // Store feedback if provided
      if (feedback) {
        await tx.feedback.create({
          data: {
            userId,
            type: 'onboarding',
            message: feedback,
            status: 'new',
          },
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          category: 'onboarding',
          description: skipRemainingSteps ? 'Onboarding skipped' : 'Onboarding completed',
          ipAddress: ip,
          userAgent,
          status: 'success',
        },
      });

      return { achievementAwarded };
    });

    // Get user stats for response
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        totalPoints: true,
        totalAchievements: true,
        _count: {
          select: {
            platforms: true,
            goals: true,
          },
        },
      },
    });

    logger.info('Onboarding completed', {
      userId,
      skipRemainingSteps,
      achievementAwarded: result.achievementAwarded,
      requestId,
      ip,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        message: skipRemainingSteps
          ? 'Onboarding skipped. You can complete the remaining steps later.'
          : 'Congratulations! Onboarding completed successfully!',
        achievementAwarded: result.achievementAwarded,
        nextSteps: [
          user?._count.platforms === 0 && 'Connect a platform to start tracking',
          user?._count.goals === 0 && 'Create your first goal',
          'Explore the dashboard',
        ].filter(Boolean),
        stats: {
          platforms: user?._count.platforms || 0,
          goals: user?._count.goals || 0,
          points: user?.totalPoints || 0,
          achievements: user?.totalAchievements || 0,
        },
      },
      {
        meta: { requestId },
      }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST onboarding/complete failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to complete onboarding', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';