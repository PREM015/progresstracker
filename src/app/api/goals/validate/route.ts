// =============================================================================
// src/app/api/goals/validate/route.ts
// =============================================================================
// Description: Validate goal data without creating
// Methods: POST, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 60 requests/minute
// =============================================================================
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { GoalType, GoalMetric, PlatformCategory, GoalStatus } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { differenceInDays } from 'date-fns';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 60;
const MAX_ACTIVE_GOALS = 50;

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

const validateGoalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  target: z.number().positive('Target must be positive').max(999999, 'Target too large'),
  unit: z.string().max(50).optional(),
  category: z.nativeEnum(PlatformCategory, { errorMap: () => ({ message: 'Invalid category' }) }),
  goalType: z.nativeEnum(GoalType, { errorMap: () => ({ message: 'Invalid goal type' }) }),
  metric: z.nativeEnum(GoalMetric, { errorMap: () => ({ message: 'Invalid metric' }) }),
  customMetric: z.string().max(100).optional(),
  deadline: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  platformId: z.string().cuid().optional(),
  isPublic: z.boolean().optional(),
});

// =============================================================================
// TYPES
// =============================================================================

interface ValidationIssue {
  field: string;
  message: string;
  type: 'error' | 'warning' | 'suggestion';
  code?: string;
}

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
  const rateLimitKey = `goals-validate:${ip}`;
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

export async function HEAD(): Promise<NextResponse> {
  const requestId = generateRequestId();

  const response = new NextResponse(null, { status: 200 });
  response.headers.set('X-Validation-Available', 'true');
  response.headers.set('X-Max-Active-Goals', String(MAX_ACTIVE_GOALS));

  return addHeaders(response, requestId);
}

// =============================================================================
// POST - Validate Goal Data
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

    const issues: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const suggestions: ValidationIssue[] = [];

    // Schema validation
    const schemaValidation = validateGoalSchema.safeParse(body);

    if (!schemaValidation.success) {
      for (const err of schemaValidation.error.errors) {
        issues.push({
          field: err.path.join('.'),
          message: err.message,
          type: 'error',
          code: 'SCHEMA_VALIDATION',
        });
      }
    }

    // If schema validation failed, return early with errors
    if (!schemaValidation.success) {
      const response = apiResponse.success(
        {
          valid: false,
          issues,
          warnings,
          suggestions,
          summary: {
            errors: issues.length,
            warnings: 0,
            suggestions: 0,
          },
        },
        { meta: { requestId } }
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const data = schemaValidation.data;
    const now = new Date();

    // =========================================================================
    // ADDITIONAL VALIDATIONS
    // =========================================================================

    // Check for duplicate title
    const existingGoal = await prisma.goal.findFirst({
      where: {
        userId,
        title: { equals: data.title, mode: 'insensitive' },
        status: { notIn: [GoalStatus.ARCHIVED, GoalStatus.CANCELLED] },
      },
      select: { id: true, title: true, status: true },
    });

    if (existingGoal) {
      warnings.push({
        field: 'title',
        message: `You already have a goal with this title (status: ${existingGoal.status.toLowerCase()})`,
        type: 'warning',
        code: 'DUPLICATE_TITLE',
      });
    }

    // Validate platform if provided
    if (data.platformId) {
      const userPlatform = await prisma.userPlatform.findFirst({
        where: {
          platformId: data.platformId,
          userId,
          isActive: true,
        },
        select: { platform: { select: { name: true } } },
      });

      if (!userPlatform) {
        issues.push({
          field: 'platformId',
          message: 'Platform not connected or inactive',
          type: 'error',
          code: 'INVALID_PLATFORM',
        });
      }
    }

    // Validate deadline
    if (data.deadline) {
      const deadline = new Date(data.deadline);

      if (deadline <= now) {
        issues.push({
          field: 'deadline',
          message: 'Deadline must be in the future',
          type: 'error',
          code: 'PAST_DEADLINE',
        });
      } else {
        const daysUntilDeadline = differenceInDays(deadline, now);

        if (daysUntilDeadline === 0) {
          warnings.push({
            field: 'deadline',
            message: 'Deadline is today. Consider giving yourself more time.',
            type: 'warning',
            code: 'DEADLINE_TODAY',
          });
        } else if (daysUntilDeadline === 1) {
          warnings.push({
            field: 'deadline',
            message: 'Very short deadline (tomorrow). Make sure this is achievable.',
            type: 'warning',
            code: 'SHORT_DEADLINE',
          });
        }

        // Check if deadline aligns with goal type
        if (data.goalType === GoalType.DAILY && daysUntilDeadline > 1) {
          suggestions.push({
            field: 'deadline',
            message: 'Daily goals typically have a 1-day deadline. Consider adjusting.',
            type: 'suggestion',
            code: 'DEADLINE_GOAL_TYPE_MISMATCH',
          });
        }

        if (data.goalType === GoalType.WEEKLY && daysUntilDeadline > 14) {
          suggestions.push({
            field: 'deadline',
            message: 'Weekly goals typically have a 7-day deadline.',
            type: 'suggestion',
            code: 'DEADLINE_GOAL_TYPE_MISMATCH',
          });
        }
      }
    }

    // Validate target based on goal type
    if (data.goalType === GoalType.DAILY && data.target > 50) {
      warnings.push({
        field: 'target',
        message: 'Daily target of ' + data.target + ' seems high. Make sure it\'s achievable.',
        type: 'warning',
        code: 'HIGH_DAILY_TARGET',
      });
    }

    // Check historical data for suggestions
    const historicalGoals = await prisma.goal.findMany({
      where: {
        userId,
        category: data.category,
        metric: data.metric,
        status: GoalStatus.COMPLETED,
      },
      select: { target: true, daysActive: true },
      take: 10,
    });

    if (historicalGoals.length > 0) {
      const avgTarget = historicalGoals.reduce((sum, g) => sum + g.target, 0) / historicalGoals.length;
      const avgDays = historicalGoals.reduce((sum, g) => sum + g.daysActive, 0) / historicalGoals.length;

      if (data.target > avgTarget * 2) {
        suggestions.push({
          field: 'target',
          message: `Your average completed goal in this category is ${Math.round(avgTarget)}. Consider starting with a smaller target.`,
          type: 'suggestion',
          code: 'HIGH_TARGET_VS_HISTORY',
        });
      }

      if (data.target < avgTarget * 0.5) {
        suggestions.push({
          field: 'target',
          message: `You usually complete goals with target ~${Math.round(avgTarget)}. You might want to aim higher!`,
          type: 'suggestion',
          code: 'LOW_TARGET_VS_HISTORY',
        });
      }
    }

    // Check active goals limit
    const activeGoalsCount = await prisma.goal.count({
      where: {
        userId,
        status: GoalStatus.ACTIVE,
      },
    });

    if (activeGoalsCount >= MAX_ACTIVE_GOALS) {
      issues.push({
        field: 'general',
        message: `You already have ${activeGoalsCount} active goals (maximum: ${MAX_ACTIVE_GOALS}). Complete or archive some before creating new ones.`,
        type: 'error',
        code: 'MAX_ACTIVE_GOALS',
      });
    } else if (activeGoalsCount >= MAX_ACTIVE_GOALS - 5) {
      warnings.push({
        field: 'general',
        message: `You have ${activeGoalsCount} active goals. Consider completing some before adding more.`,
        type: 'warning',
        code: 'MANY_ACTIVE_GOALS',
      });
    }

    // Validate metric and category compatibility
    const metricCategoryCompatibility: Record<string, PlatformCategory[]> = {
      [GoalMetric.PROBLEMS_SOLVED]: [PlatformCategory.DSA],
      [GoalMetric.COMMITS]: [PlatformCategory.LEARNING],
      [GoalMetric.PULL_REQUESTS]: [PlatformCategory.LEARNING],
      [GoalMetric.APPLICATIONS_SUBMITTED]: [PlatformCategory.JOB],
      [GoalMetric.COURSES_COMPLETED]: [PlatformCategory.LEARNING],
      [GoalMetric.CERTIFICATIONS]: [PlatformCategory.LEARNING],
      [GoalMetric.CONTESTS_PARTICIPATED]: [PlatformCategory.HACKATHON, PlatformCategory.DSA],
    };

    const compatibleCategories = metricCategoryCompatibility[data.metric];
    if (compatibleCategories && !compatibleCategories.includes(data.category)) {
      suggestions.push({
        field: 'metric',
        message: `The metric "${data.metric}" is typically used with categories: ${compatibleCategories.join(', ')}`,
        type: 'suggestion',
        code: 'METRIC_CATEGORY_MISMATCH',
      });
    }

    // Custom metric validation
    if (data.metric === GoalMetric.CUSTOM && !data.customMetric) {
      warnings.push({
        field: 'customMetric',
        message: 'Consider providing a custom metric name for clarity',
        type: 'warning',
        code: 'MISSING_CUSTOM_METRIC',
      });
    }

    // =========================================================================
    // PREPARE RESPONSE
    // =========================================================================

    const isValid = issues.length === 0;

    logger.info('POST /api/goals/validate completed', {
      userId,
      isValid,
      issues: issues.length,
      warnings: warnings.length,
      suggestions: suggestions.length,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        valid: isValid,
        issues,
        warnings,
        suggestions,
        summary: {
          errors: issues.length,
          warnings: warnings.length,
          suggestions: suggestions.length,
        },
        context: {
          activeGoals: activeGoalsCount,
          maxActiveGoals: MAX_ACTIVE_GOALS,
          hasSimilarGoals: !!existingGoal,
          historicalGoalsCount: historicalGoals.length,
        },
      },
      { meta: { requestId } }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /api/goals/validate failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to validate goal', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';