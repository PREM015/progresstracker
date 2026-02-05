// =============================================================================
// src/app/api/goals/overdue/route.ts
// =============================================================================
// Description: Overdue goals management
// Methods: GET, POST, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 30 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { GoalStatus, Prisma } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { auditLogService } from '@/services/auditLogService';
import { differenceInDays, differenceInHours, addDays } from 'date-fns';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;
const MAX_BULK_SIZE = 50;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
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

const querySchema = z.object({
  sortBy: z.enum(['deadline', 'progress', 'title', 'daysOverdue']).default('deadline'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  severity: z.enum(['all', 'critical', 'high', 'medium', 'low']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const bulkActionSchema = z.object({
  goalIds: z.array(z.string().cuid()).min(1).max(MAX_BULK_SIZE),
  action: z.enum(['extend', 'fail', 'archive', 'pause']),
  extendDays: z.number().int().min(1).max(365).optional(),
  reason: z.string().max(500).optional(),
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
  const rateLimitKey = `goals-overdue:${ip}`;
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

type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

function calculateSeverity(daysOverdue: number, progressPercentage: number): SeverityLevel {
  // Critical: Very overdue or very low progress
  if (daysOverdue > 30 || (daysOverdue > 14 && progressPercentage < 25)) {
    return 'critical';
  }
  // High: Moderately overdue
  if (daysOverdue > 14 || (daysOverdue > 7 && progressPercentage < 50)) {
    return 'high';
  }
  // Medium: Recently overdue
  if (daysOverdue > 7 || progressPercentage < 75) {
    return 'medium';
  }
  // Low: Just overdue with good progress
  return 'low';
}

function getRecommendations(
  daysOverdue: number,
  progressPercentage: number,
  avgDailyProgress: number
): string[] {
  const recommendations: string[] = [];

  if (progressPercentage >= 90) {
    recommendations.push('Almost complete! Push for final completion.');
  } else if (progressPercentage >= 75) {
    recommendations.push('Good progress. Extend deadline and finish strong.');
  } else if (progressPercentage >= 50) {
    recommendations.push('Consider extending deadline and creating a recovery plan.');
  } else if (progressPercentage >= 25) {
    recommendations.push('Significant work remaining. Consider breaking into smaller goals.');
  } else {
    recommendations.push('Low progress. Re-evaluate feasibility or archive.');
  }

  if (daysOverdue > 30 && progressPercentage < 25) {
    recommendations.push('Consider archiving and starting fresh with a new goal.');
  }

  if (avgDailyProgress === 0) {
    recommendations.push('No recent progress. Consider pausing or archiving.');
  }

  if (daysOverdue > 7 && daysOverdue <= 14) {
    recommendations.push('Extend by 1-2 weeks to get back on track.');
  }

  return recommendations;
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
    const now = new Date();

    const overdueCount = await prisma.goal.count({
      where: {
        userId,
        status: GoalStatus.ACTIVE,
        deadline: { lt: now },
      },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Overdue-Goals', String(overdueCount));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/overdue failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Overdue Goals
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

    // Parse query parameters
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
    const now = new Date();

    // Fetch overdue goals
    const where: Prisma.GoalWhereInput = {
      userId,
      status: GoalStatus.ACTIVE,
      deadline: { lt: now },
    };

    const [goals, total] = await Promise.all([
      prisma.goal.findMany({
        where,
        include: {
          platform: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
              color: true,
            },
          },
        },
        orderBy: params.sortBy === 'daysOverdue'
          ? { deadline: 'asc' }
          : { [params.sortBy]: params.sortOrder },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.goal.count({ where }),
    ]);

    // Process goals with overdue info
    const processedGoals = goals.map((goal) => {
      const daysOverdue = differenceInDays(now, goal.deadline!);
      const hoursOverdue = differenceInHours(now, goal.deadline!);
      const remaining = Math.max(0, goal.target - goal.progress);
      const severity = calculateSeverity(daysOverdue, goal.progressPercentage);
      const recommendations = getRecommendations(
        daysOverdue,
        goal.progressPercentage,
        goal.avgDailyProgress
      );

      // Calculate estimated completion time
      const estimatedDaysToComplete = goal.avgDailyProgress > 0
        ? Math.ceil(remaining / goal.avgDailyProgress)
        : null;

      return {
        ...goal,
        overdueInfo: {
          daysOverdue,
          hoursOverdue,
          weeksOverdue: Math.floor(daysOverdue / 7),
          severity,
        },
        completionEstimate: {
          remaining,
          daysNeeded: estimatedDaysToComplete,
          projectedDate: estimatedDaysToComplete
            ? addDays(now, estimatedDaysToComplete)
            : null,
          percentComplete: goal.progressPercentage,
        },
        recommendations,
        suggestedAction: severity === 'critical' && goal.progressPercentage < 25
          ? 'archive'
          : severity === 'critical'
            ? 'fail'
            : 'extend',
        suggestedExtendDays: Math.max(7, Math.ceil((remaining / Math.max(goal.avgDailyProgress, 1)) * 1.5)),
      };
    });

    // Filter by severity if specified
    let filteredGoals = processedGoals;
    if (params.severity !== 'all') {
      filteredGoals = processedGoals.filter(
        (g) => g.overdueInfo.severity === params.severity
      );
    }

    // Sort by daysOverdue if specified
    if (params.sortBy === 'daysOverdue') {
      filteredGoals.sort((a, b) => {
        const diff = params.sortOrder === 'desc'
          ? b.overdueInfo.daysOverdue - a.overdueInfo.daysOverdue
          : a.overdueInfo.daysOverdue - b.overdueInfo.daysOverdue;
        return diff;
      });
    }

    // Calculate stats
    const stats = {
      total,
      bySeverity: {
        critical: processedGoals.filter((g) => g.overdueInfo.severity === 'critical').length,
        high: processedGoals.filter((g) => g.overdueInfo.severity === 'high').length,
        medium: processedGoals.filter((g) => g.overdueInfo.severity === 'medium').length,
        low: processedGoals.filter((g) => g.overdueInfo.severity === 'low').length,
      },
      averageDaysOverdue: processedGoals.length > 0
        ? Math.round(
            processedGoals.reduce((sum, g) => sum + g.overdueInfo.daysOverdue, 0) / processedGoals.length
          )
        : 0,
      nearCompletion: processedGoals.filter((g) => g.progressPercentage >= 75).length,
      abandonedRisk: processedGoals.filter(
        (g) => g.progressPercentage < 25 && g.overdueInfo.daysOverdue > 14
      ).length,
      mostOverdue: processedGoals[0] || null,
    };

    const totalPages = Math.ceil(total / params.limit);

    logger.info('GET /api/goals/overdue completed', {
      userId,
      total,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.paginated(
      filteredGoals,
      {
        page: params.page,
        limit: params.limit,
        total,
        totalPages,
        hasNextPage: params.page < totalPages,
        hasPreviousPage: params.page > 1,
      },
      {
        meta: {
          requestId,
          stats,
        },
      }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/overdue failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to fetch overdue goals', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// POST - Bulk Actions on Overdue Goals
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const response = apiResponse.validationError(
        'Invalid JSON body',
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const validation = bulkActionSchema.safeParse(body);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Invalid action data',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const { goalIds, action, extendDays, reason } = validation.data;

    // Validate action-specific requirements
    if (action === 'extend' && !extendDays) {
      const response = apiResponse.validationError(
        'extendDays is required for extend action',
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const now = new Date();

    // Verify all goals are overdue and owned by user
    const overdueGoals = await prisma.goal.findMany({
      where: {
        id: { in: goalIds },
        userId,
        status: GoalStatus.ACTIVE,
        deadline: { lt: now },
      },
      select: { id: true, title: true, deadline: true },
    });

    if (overdueGoals.length !== goalIds.length) {
      const foundIds = new Set(overdueGoals.map((g) => g.id));
      const missingIds = goalIds.filter((id) => !foundIds.has(id));

      const response = apiResponse.validationError(
        `${missingIds.length} goals are not overdue or not found`,
        [{ path: ['goalIds'], message: `Invalid IDs: ${missingIds.join(', ')}` }],
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    let result: { count: number };
    let actionDescription: string;

    switch (action) {
      case 'extend':
        // Extend deadlines
        const extendResults = await Promise.all(
          overdueGoals.map((goal) =>
            prisma.goal.update({
              where: { id: goal.id },
              data: {
                deadline: addDays(goal.deadline!, extendDays!),
                updatedAt: now,
              },
            })
          )
        );
        result = { count: extendResults.length };
        actionDescription = `Extended deadlines by ${extendDays} days`;
        break;

      case 'fail':
        result = await prisma.goal.updateMany({
          where: { id: { in: goalIds } },
          data: {
            status: GoalStatus.FAILED,
            failedAt: now,
            updatedAt: now,
          },
        });
        actionDescription = 'Marked as failed';

        // Disable reminders
        await prisma.goalReminder.updateMany({
          where: { goalId: { in: goalIds } },
          data: { isActive: false },
        });
        break;

      case 'archive':
        result = await prisma.goal.updateMany({
          where: { id: { in: goalIds } },
          data: {
            status: GoalStatus.ARCHIVED,
            updatedAt: now,
          },
        });
        actionDescription = 'Archived';

        // Disable reminders
        await prisma.goalReminder.updateMany({
          where: { goalId: { in: goalIds } },
          data: { isActive: false },
        });
        break;

      case 'pause':
        result = await prisma.goal.updateMany({
          where: { id: { in: goalIds } },
          data: {
            status: GoalStatus.PAUSED,
            updatedAt: now,
          },
        });
        actionDescription = 'Paused';
        break;

      default:
        const response = apiResponse.validationError(
          'Invalid action',
          undefined,
          requestId
        );
        return addHeaders(response, requestId, rateLimitResult);
    }

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'UPDATE',
      category: 'goals',
      entityType: 'goal',
      description: `Bulk ${actionDescription.toLowerCase()} ${result.count} overdue goals${reason ? `: ${reason}` : ''}`,
      newValue: {
        action,
        goalIds,
        extendDays,
        reason,
        count: result.count,
      },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('POST /api/goals/overdue completed', {
      userId,
      action,
      count: result.count,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        action,
        processed: result.count,
        goalIds,
        extendDays: action === 'extend' ? extendDays : undefined,
        message: `${result.count} overdue goals ${actionDescription.toLowerCase()}`,
      },
      { meta: { requestId } }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /api/goals/overdue failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to process overdue goals', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';