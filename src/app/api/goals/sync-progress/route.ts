// =============================================================================
// src/app/api/goals/sync-progress/route.ts
// =============================================================================
// Description: Sync goal progress with platform data
// Methods: POST, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 5 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { GoalStatus, GoalMetric, Prisma } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { auditLogService } from '@/services/auditLogService';
import { AchievementService } from '@/services/achievementService';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 5;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const syncProgressSchema = z.object({
  goalId: z.string().cuid().optional(),
  platformId: z.string().cuid().optional(),
  forceSync: z.boolean().default(false),
  checkAchievements: z.boolean().default(true),
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

async function validateRequest(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `sync-progress:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return {
      error: apiResponse.rateLimited(120, requestId),
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

function extractProgressFromSyncData(
  syncData: Record<string, unknown>,
  metric: GoalMetric
): number | null {
  const metricMappings: Record<GoalMetric, string[]> = {
    [GoalMetric.PROBLEMS_SOLVED]: ['problemsSolved', 'totalProblems', 'solvedCount', 'problems'],
    [GoalMetric.COMMITS]: ['commits', 'totalCommits', 'contributions', 'commitCount'],
    [GoalMetric.PULL_REQUESTS]: ['pullRequests', 'prs', 'mergedPRs', 'pullRequestCount'],
    [GoalMetric.STREAK_DAYS]: ['currentStreak', 'streak', 'streakDays', 'streakCount'],
    [GoalMetric.TIME_SPENT]: ['timeSpent', 'totalTime', 'hours', 'minutes'],
    [GoalMetric.PROJECTS_COMPLETED]: ['projects', 'projectsCompleted', 'completedProjects'],
    [GoalMetric.COURSES_COMPLETED]: ['courses', 'coursesCompleted', 'completedCourses'],
    [GoalMetric.CERTIFICATIONS]: ['certifications', 'certificates', 'certCount'],
    [GoalMetric.APPLICATIONS_SUBMITTED]: ['applications', 'applicationsSubmitted', 'jobApplications'],
    [GoalMetric.CONTESTS_PARTICIPATED]: ['contests', 'contestsParticipated', 'hackathons'],
    [GoalMetric.CUSTOM]: [],
  };

  const keys = metricMappings[metric] || [];

  for (const key of keys) {
    if (typeof syncData[key] === 'number') {
      return syncData[key] as number;
    }
  }

  return null;
}

function calculateProgressPercentage(progress: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((progress / target) * 100 * 10) / 10);
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

    const syncableGoals = await prisma.goal.count({
      where: {
        userId,
        status: GoalStatus.ACTIVE,
        platformId: { not: null },
      },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Syncable-Goals', String(syncableGoals));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/sync-progress failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// POST - Sync Goal Progress with Platforms
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    // Parse request body
    let body: unknown = {};
    try {
      const rawBody = await request.text();
      if (rawBody) {
        body = JSON.parse(rawBody);
      }
    } catch {
      // Use defaults
    }

    const validation = syncProgressSchema.safeParse(body);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Invalid request data',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const params = validation.data;

    // Build where clause
    const where: Prisma.GoalWhereInput = {
      userId,
      status: GoalStatus.ACTIVE,
      platformId: { not: null },
    };

    if (params.goalId) {
      where.id = params.goalId;
    }

    if (params.platformId) {
      where.platformId = params.platformId;
    }

    // Get goals to sync
    const goalsToSync = await prisma.goal.findMany({
      where,
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (goalsToSync.length === 0) {
      const response = apiResponse.success(
        {
          checked: 0,
          synced: 0,
          updated: 0,
          results: [],
          message: 'No goals with connected platforms found',
        },
        { meta: { requestId } }
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    interface SyncResult {
      goalId: string;
      title: string;
      platformName: string;
      oldProgress: number;
      newProgress: number;
      target: number;
      completed: boolean;
      synced: boolean;
      error?: string;
      lastSyncAt?: Date;
    }

    const results: SyncResult[] = [];
    const completedGoals: string[] = [];
    const now = new Date();

    for (const goal of goalsToSync) {
      try {
        // Get user platform connection
        const userPlatform = await prisma.userPlatform.findFirst({
          where: {
            userId,
            platformId: goal.platformId!,
            isActive: true,
          },
          select: { id: true, lastSyncedAt: true },
        });

        if (!userPlatform) {
          results.push({
            goalId: goal.id,
            title: goal.title,
            platformName: goal.platform?.name || 'Unknown',
            oldProgress: goal.progress,
            newProgress: goal.progress,
            target: goal.target,
            completed: false,
            synced: false,
            error: 'Platform not connected',
          });
          continue;
        }

        // Get recent sync history
        const recentSync = await prisma.syncLog.findFirst({
          where: {
            userPlatformId: userPlatform.id,
            status: 'SUCCESS',
          },
          orderBy: { completedAt: 'desc' },
        });

       if (!recentSync?.logEntries) {

          results.push({
            goalId: goal.id,
            title: goal.title,
            platformName: goal.platform?.name || 'Unknown',
            oldProgress: goal.progress,
            newProgress: goal.progress,
            target: goal.target,
            completed: false,
            synced: false,
            error: 'No sync data available. Please sync platform first.',
            lastSyncAt: userPlatform.lastSyncedAt || undefined,
          });
          continue;
        }

        const syncData = recentSync.logEntries as Record<string, unknown>;

        const newProgress = extractProgressFromSyncData(syncData, goal.metric);

        if (newProgress === null) {
          results.push({
            goalId: goal.id,
            title: goal.title,
            platformName: goal.platform?.name || 'Unknown',
            oldProgress: goal.progress,
            newProgress: goal.progress,
            target: goal.target,
            completed: false,
            synced: false,
            error: `Could not extract ${goal.metric} from sync data`,
            lastSyncAt: recentSync.completedAt || undefined,
          });
          continue;
        }

        // Skip if no change and not forcing sync
        if (newProgress === goal.progress && !params.forceSync) {
          results.push({
            goalId: goal.id,
            title: goal.title,
            platformName: goal.platform?.name || 'Unknown',
            oldProgress: goal.progress,
            newProgress,
            target: goal.target,
            completed: false,
            synced: true,
            lastSyncAt: recentSync.completedAt || undefined,
          });
          continue;
        }

        // Calculate new percentage
        const newPercentage = calculateProgressPercentage(newProgress, goal.target);
        const isNowComplete = newProgress >= goal.target;
        const wasComplete = goal.progress >= goal.target;

        // Update goal
        await prisma.goal.update({
          where: { id: goal.id },
          data: {
            progress: newProgress,
            progressPercentage: newPercentage,
            status: isNowComplete && !wasComplete ? GoalStatus.COMPLETED : goal.status,
            completedAt: isNowComplete && !wasComplete ? now : goal.completedAt,
            updatedAt: now,
          },
        });

        results.push({
          goalId: goal.id,
          title: goal.title,
          platformName: goal.platform?.name || 'Unknown',
          oldProgress: goal.progress,
          newProgress,
          target: goal.target,
          completed: isNowComplete && !wasComplete,
          synced: true,
          lastSyncAt: recentSync.completedAt || undefined,
        });

        if (isNowComplete && !wasComplete) {
          completedGoals.push(goal.id);
        }
      } catch (goalError) {
        logger.error('Failed to sync goal', { goalId: goal.id }, goalError);
        results.push({
          goalId: goal.id,
          title: goal.title,
          platformName: goal.platform?.name || 'Unknown',
          oldProgress: goal.progress,
          newProgress: goal.progress,
          target: goal.target,
          completed: false,
          synced: false,
          error: 'Sync failed',
        });
      }
    }

    // Check achievements if any goals were completed
    if (params.checkAchievements && completedGoals.length > 0) {
      try {
        await AchievementService.checkGoalAchievements(userId);
      } catch (achError) {
        logger.error('Failed to check achievements', { userId }, achError);
      }
    }

    // Create audit log
    const syncedCount = results.filter((r) => r.synced).length;
    const updatedCount = results.filter((r) => r.synced && r.oldProgress !== r.newProgress).length;

    if (updatedCount > 0) {
      await auditLogService.create({
        userId,
        action: 'UPDATE',
        category: 'goals',
        entityType: 'goal',
        description: `Synced progress for ${updatedCount} goals from platform data`,
        newValue: {
          synced: syncedCount,
          updated: updatedCount,
          completed: completedGoals.length,
        },
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent') || undefined,
        requestId,
      });
    }

    logger.info('POST /api/goals/sync-progress completed', {
      userId,
      checked: goalsToSync.length,
      synced: syncedCount,
      updated: updatedCount,
      completed: completedGoals.length,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        checked: goalsToSync.length,
        synced: syncedCount,
        updated: updatedCount,
        completed: completedGoals.length,
        failed: results.filter((r) => !r.synced).length,
        results,
        completedGoalIds: completedGoals,
        message: `Progress synced for ${syncedCount} goals${completedGoals.length > 0 ? `, ${completedGoals.length} completed!` : ''}`,
      },
      { meta: { requestId } }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /api/goals/sync-progress failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to sync progress', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';