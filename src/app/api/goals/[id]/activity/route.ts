// =============================================================================
// src/app/api/goals/[id]/activity/route.ts
// =============================================================================
// Description: Get goal activity from tracker entries and audit logs
// Methods: GET, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 60 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { GoalMetric } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { startOfDay, subDays, format, differenceInDays } from 'date-fns';

// =============================================================================
// TYPES
// =============================================================================

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface ActivityEntry {
  id: string;
  type: 'progress' | 'update' | 'status_change' | 'milestone' | 'reminder';
  date: Date;
  description: string;
  value?: number;
  platform?: string;
  changes?: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 60;
const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;

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
// VALIDATION SCHEMAS
// =============================================================================

const idSchema = z.string().cuid('Invalid goal ID format');

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(MAX_DAYS).default(DEFAULT_DAYS),
  includeAuditLogs: z.union([
    z.boolean(),
    z.string().transform((val) => val !== 'false'),
  ]).default(true),
  includeTrackerEntries: z.union([
    z.boolean(),
    z.string().transform((val) => val !== 'false'),
  ]).default(true),
  limit: z.coerce.number().int().min(1).max(500).default(100),
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
  const rateLimitKey = `goal-activity:${ip}`;
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

function getMetricValue(
  entry: Record<string, unknown>,
  metric: GoalMetric
): number {
  switch (metric) {
    case GoalMetric.PROBLEMS_SOLVED:
      return (entry.problemsSolved as number) || 0;
    case GoalMetric.COMMITS:
      return (entry.commits as number) || 0;
    case GoalMetric.PULL_REQUESTS:
      return (entry.pullRequests as number) || 0;
    case GoalMetric.TIME_SPENT:
      return (entry.timeSpent as number) || 0;
    case GoalMetric.PROJECTS_COMPLETED:
      return (entry.projectsCompleted as number) || 0;
    case GoalMetric.COURSES_COMPLETED:
      return (entry.coursesCompleted as number) || 0;
    case GoalMetric.CERTIFICATIONS:
      return (entry.certificationsEarned as number) || 0;
    case GoalMetric.APPLICATIONS_SUBMITTED:
      return (entry.applicationsSubmitted as number) || 0;
    case GoalMetric.CONTESTS_PARTICIPATED:
      return (entry.contestsParticipated as number) || 0;
    default:
      return 0;
  }
}

function parseAuditChanges(
  changes: unknown
): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
  if (!changes || typeof changes !== 'object') return [];

  const result: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
  const changesObj = changes as Record<string, { old?: unknown; new?: unknown }>;

  for (const [field, value] of Object.entries(changesObj)) {
    if (value && typeof value === 'object') {
      result.push({
        field,
        oldValue: value.old,
        newValue: value.new,
      });
    }
  }

  return result;
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

export async function HEAD(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const { id } = await context.params;
    const userId = session!.user.id;

    const goal = await prisma.goal.findFirst({
      where: { id, userId },
      select: { daysActive: true },
    });

    if (!goal) {
      return new NextResponse(null, { status: 404 });
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Days-Active', String(goal.daysActive));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/[id]/activity failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Goal Activity History
// =============================================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const { id } = await context.params;
    const userId = session!.user.id;

    // Validate ID
    const idValidation = idSchema.safeParse(id);
    if (!idValidation.success) {
      const response = apiResponse.validationError(
        'Invalid goal ID',
        idValidation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Get goal
    const goal = await prisma.goal.findFirst({
      where: { id, userId },
      include: {
        platform: {
          select: { name: true, slug: true },
        },
      },
    });

    if (!goal) {
      const response = apiResponse.notFound('Goal', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, unknown> = {};

    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const validation = querySchema.safeParse(queryParams);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Invalid query parameters',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const params = validation.data;
    const startDate = subDays(new Date(), params.days);

    const activities: ActivityEntry[] = [];

    // Get tracker entries
    if (params.includeTrackerEntries) {
      const entryWhere: Record<string, unknown> = {
        userId,
        date: { gte: startDate },
      };

      if (goal.platformId) {
        entryWhere.platformId = goal.platformId;
      }

      const entries = await prisma.trackerEntry.findMany({
        where: entryWhere,
        orderBy: { date: 'desc' },
        include: {
          platform: {
            select: { name: true },
          },
        },
      });

      for (const entry of entries) {
        const value = getMetricValue(entry as unknown as Record<string, unknown>, goal.metric);

        if (value > 0) {
          activities.push({
            id: `entry-${entry.id}`,
            type: 'progress',
            date: entry.date,
            description: `Added ${value} ${goal.unit || 'units'}`,
            value,
            platform: entry.platform?.name,
            metadata: {
              entryId: entry.id,
              metric: goal.metric,
            },
          });
        }
      }
    }

    // Get audit logs
    if (params.includeAuditLogs) {
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          userId,
          entityType: 'goal',
          entityId: id,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'desc' },
        take: params.limit,
      });

      for (const log of auditLogs) {
        let activityType: ActivityEntry['type'] = 'update';

        if (log.description?.toLowerCase().includes('status')) {
          activityType = 'status_change';
        } else if (log.description?.toLowerCase().includes('milestone')) {
          activityType = 'milestone';
        } else if (log.description?.toLowerCase().includes('reminder')) {
          activityType = 'reminder';
        }

        activities.push({
          id: `audit-${log.id}`,
          type: activityType,
          date: log.createdAt,
          description: log.description || log.action,
          changes: parseAuditChanges(log.changes),
          metadata: {
            auditLogId: log.id,
            action: log.action,
          },
        });
      }
    }

    // Sort all activities by date (newest first)
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Limit results
    const limitedActivities = activities.slice(0, params.limit);

    // Calculate daily progress
    const dailyProgress: Record<string, number> = {};

    for (const activity of limitedActivities) {
      if (activity.type === 'progress' && activity.value) {
        const dateKey = format(startOfDay(activity.date), 'yyyy-MM-dd');
        dailyProgress[dateKey] = (dailyProgress[dateKey] || 0) + activity.value;
      }
    }

    // Calculate stats
    const totalProgress = Object.values(dailyProgress).reduce((sum, val) => sum + val, 0);
    const activeDays = Object.keys(dailyProgress).length;
    const avgPerActiveDay = activeDays > 0 ? totalProgress / activeDays : 0;
    const daysSinceGoalStart = Math.max(1, differenceInDays(new Date(), goal.startDate));
    const avgPerDay = totalProgress / daysSinceGoalStart;

    // Build heatmap data (last 30 days)
    const today = startOfDay(new Date());
    const heatmapData = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(today, 29 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      return {
        date: dateStr,
        value: dailyProgress[dateStr] || 0,
        hasActivity: !!dailyProgress[dateStr],
      };
    });

    // Get streak info
    let currentActivityStreak = 0;
    const sortedDates = Object.keys(dailyProgress).sort().reverse();

    if (sortedDates.length > 0) {
      const todayStr = format(today, 'yyyy-MM-dd');
      const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');

      if (sortedDates.includes(todayStr) || sortedDates.includes(yesterdayStr)) {
        currentActivityStreak = 1;

        for (let i = 1; i < sortedDates.length; i++) {
          const prevDate = new Date(sortedDates[i - 1]);
          const currDate = new Date(sortedDates[i]);
          const diff = differenceInDays(prevDate, currDate);

          if (diff === 1) {
            currentActivityStreak++;
          } else {
            break;
          }
        }
      }
    }

    const stats = {
      totalActivities: limitedActivities.length,
      progressActivities: limitedActivities.filter((a) => a.type === 'progress').length,
      updateActivities: limitedActivities.filter((a) => a.type === 'update').length,
      activeDays,
      totalProgress,
      avgPerActiveDay: Math.round(avgPerActiveDay * 100) / 100,
      avgPerDay: Math.round(avgPerDay * 100) / 100,
      currentActivityStreak,
    };

    logger.info('GET /api/goals/[id]/activity completed', {
      userId,
      goalId: id,
      activitiesCount: limitedActivities.length,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        goal: {
          id: goal.id,
          title: goal.title,
          progress: goal.progress,
          target: goal.target,
          progressPercentage: goal.progressPercentage,
          metric: goal.metric,
          unit: goal.unit,
          status: goal.status,
          platform: goal.platform,
        },
        activities: limitedActivities,
        dailyProgress,
        heatmap: heatmapData,
        stats,
      },
      { meta: { requestId } }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/[id]/activity failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to fetch activity', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';