// =============================================================================
// src/app/api/goals/templates/route.ts
// =============================================================================
// Description: Goal templates for quick creation
// Methods: GET, POST, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 50 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { GoalStatus, GoalType, GoalMetric, PlatformCategory, Prisma } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { CacheService } from '@/services/cacheService';
import { withTiming } from '@/lib/apiTiming';
import { auditLogService } from '@/services/auditLogService';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 50;
const MAX_GOALS_PER_USER = 100;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=300',
};

// =============================================================================
// PREDEFINED TEMPLATES
// =============================================================================

const GOAL_TEMPLATES = [
  {
    id: 'daily-5-problems',
    title: 'Solve 5 Problems Daily',
    description: 'Complete 5 coding problems every day to sharpen your skills',
    category: PlatformCategory.DSA,
    goalType: GoalType.DAILY,
    metric: GoalMetric.PROBLEMS_SOLVED,
    target: 5,
    unit: 'problems',
    icon: '🎯',
    color: '#6366F1',
    difficulty: 'easy',
    estimatedDays: 1,
    tags: ['daily', 'problems', 'beginner'],
    tips: ['Start with easy problems', 'Focus on understanding patterns', 'Review solutions after solving'],
  },
  {
    id: 'weekly-25-problems',
    title: 'Weekly 25 Problems',
    description: 'Solve 25 coding problems this week across different difficulty levels',
    category: PlatformCategory.DSA,
    goalType: GoalType.WEEKLY,
    metric: GoalMetric.PROBLEMS_SOLVED,
    target: 25,
    unit: 'problems',
    icon: '📊',
    color: '#10B981',
    difficulty: 'medium',
    estimatedDays: 7,
    tags: ['weekly', 'problems'],
    tips: ['Mix easy, medium, and hard problems', 'Track your weak areas', 'Practice different topics each day'],
  },
  {
    id: 'monthly-100-problems',
    title: 'Monthly 100 Club',
    description: 'Join the elite 100 problems per month club',
    category: PlatformCategory.DSA,
    goalType: GoalType.MONTHLY,
    metric: GoalMetric.PROBLEMS_SOLVED,
    target: 100,
    unit: 'problems',
    icon: '🏆',
    color: '#F59E0B',
    difficulty: 'hard',
    estimatedDays: 30,
    tags: ['monthly', 'problems', 'challenge'],
    tips: ['Aim for 3-4 problems daily', 'Use weekends for harder problems', 'Take breaks to avoid burnout'],
  },
  {
    id: 'daily-2-hours-coding',
    title: '2 Hours Daily Coding',
    description: 'Code for at least 2 hours every day',
    category: PlatformCategory.GIT,
    goalType: GoalType.DAILY,
    metric: GoalMetric.TIME_SPENT,
    target: 120,
    unit: 'minutes',
    icon: '⏱️',
    color: '#8B5CF6',
    difficulty: 'medium',
    estimatedDays: 1,
    tags: ['daily', 'time', 'consistency'],
    tips: ['Use a timer', 'Eliminate distractions', 'Take short breaks every 25 minutes'],
  },
  {
    id: 'weekly-commits',
    title: 'Weekly GitHub Commits',
    description: 'Make at least 20 meaningful commits this week',
    category: PlatformCategory.GIT,
    goalType: GoalType.WEEKLY,
    metric: GoalMetric.COMMITS,
    target: 20,
    unit: 'commits',
    icon: '💻',
    color: '#1F2937',
    difficulty: 'medium',
    estimatedDays: 7,
    tags: ['weekly', 'github', 'commits'],
    tips: ['Commit frequently', 'Write meaningful commit messages', 'Push at least once a day'],
  },
  {
    id: 'job-applications-weekly',
    title: 'Apply to 10 Jobs Weekly',
    description: 'Send 10 job applications this week',
    category: PlatformCategory.JOB,
    goalType: GoalType.WEEKLY,
    metric: GoalMetric.APPLICATIONS_SUBMITTED,
    target: 10,
    unit: 'applications',
    icon: '💼',
    color: '#10B981',
    difficulty: 'medium',
    estimatedDays: 7,
    tags: ['weekly', 'jobs', 'applications'],
    tips: ['Customize each application', 'Track applications in a spreadsheet', 'Follow up after 1 week'],
  },
  {
    id: '7-day-streak',
    title: '7 Day Streak',
    description: 'Maintain a 7 day coding streak',
    category: PlatformCategory.DSA,
    goalType: GoalType.STREAK,
    metric: GoalMetric.STREAK_DAYS,
    target: 7,
    unit: 'days',
    icon: '🔥',
    color: '#EF4444',
    difficulty: 'easy',
    estimatedDays: 7,
    tags: ['streak', 'consistency', 'beginner'],
    tips: ['Solve at least one problem daily', 'Set a reminder', 'Start with easy problems on busy days'],
  },
  {
    id: '30-day-streak',
    title: '30 Day Streak',
    description: 'Maintain a 30 day coding streak - the habit builder',
    category: PlatformCategory.DSA,
    goalType: GoalType.STREAK,
    metric: GoalMetric.STREAK_DAYS,
    target: 30,
    unit: 'days',
    icon: '🔥',
    color: '#EF4444',
    difficulty: 'hard',
    estimatedDays: 30,
    tags: ['streak', 'consistency', 'challenge'],
    tips: ['Never miss two days in a row', 'Have backup easy problems ready', 'Build a morning routine'],
  },
  {
    id: 'complete-course',
    title: 'Complete a Course',
    description: 'Finish an online course this month',
    category: PlatformCategory.LEARNING,
    goalType: GoalType.MONTHLY,
    metric: GoalMetric.COURSES_COMPLETED,
    target: 1,
    unit: 'course',
    icon: '📚',
    color: '#EC4899',
    difficulty: 'medium',
    estimatedDays: 30,
    tags: ['monthly', 'learning', 'courses'],
    tips: ['Schedule dedicated learning time', 'Take notes', 'Practice what you learn'],
  },
  {
    id: 'earn-certification',
    title: 'Earn a Certification',
    description: 'Get a professional certification this quarter',
    category: PlatformCategory.LEARNING,
    goalType: GoalType.QUARTERLY,
    metric: GoalMetric.CERTIFICATIONS,
    target: 1,
    unit: 'certification',
    icon: '🏅',
    color: '#F59E0B',
    difficulty: 'hard',
    estimatedDays: 90,
    tags: ['quarterly', 'certification', 'career'],
    tips: ['Choose a relevant certification', 'Create a study schedule', 'Take practice exams'],
  },
  {
    id: 'hackathon-participation',
    title: 'Participate in a Hackathon',
    description: 'Join and complete a hackathon this month',
    category: PlatformCategory.HACKATHON,
    goalType: GoalType.MONTHLY,
    metric: GoalMetric.CONTESTS_PARTICIPATED,
    target: 1,
    unit: 'hackathon',
    icon: '🚀',
    color: '#F97316',
    difficulty: 'medium',
    estimatedDays: 30,
    tags: ['monthly', 'hackathon', 'collaboration'],
    tips: ['Find teammates early', 'Practice with past hackathon challenges', 'Focus on MVP'],
  },
  {
    id: 'open-source-contributions',
    title: 'Contribute to Open Source',
    description: 'Make 5 open source contributions this month',
    category: PlatformCategory.OPENSOURCE,
    goalType: GoalType.MONTHLY,
    metric: GoalMetric.PULL_REQUESTS,
    target: 5,
    unit: 'PRs',
    icon: '🌍',
    color: '#059669',
    difficulty: 'medium',
    estimatedDays: 30,
    tags: ['monthly', 'opensource', 'collaboration'],
    tips: ['Start with good-first-issue labels', 'Read contribution guidelines', 'Be patient with reviews'],
  },
];

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  category: z.nativeEnum(PlatformCategory).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  type: z.nativeEnum(GoalType).optional(),
});

const createFromTemplateSchema = z.object({
  templateId: z.string().min(1),
  customizations: z
    .object({
      title: z.string().min(1).max(200).optional(),
      target: z.number().int().positive().optional(),
      deadline: z.string().datetime().optional(),
      platformId: z.string().cuid().optional(),
    })
    .optional()
    .default({}),
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
  const rateLimitKey = `goals-templates:${ip}`;
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

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Templates', String(GOAL_TEMPLATES.length));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/templates failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Goal Templates
// =============================================================================

export const GET = withTiming('GET /api/goals/templates', async function GET(request: NextRequest): Promise<NextResponse> {
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
    const queryValidation = querySchema.safeParse({
      category: searchParams.get('category') || undefined,
      difficulty: searchParams.get('difficulty') || undefined,
      type: searchParams.get('type') || undefined,
    });

    if (!queryValidation.success) {
      const response = apiResponse.validationError(
        'Invalid query parameters',
        queryValidation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const { category, difficulty, type } = queryValidation.data;

    // Check cache first (24h TTL — templates rarely change)
    const cacheKey = `goals:templates:${userId}:${category || 'all'}:${difficulty || 'all'}:${type || 'all'}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      logger.info('GET /api/goals/templates cache hit', { userId, requestId, duration: Date.now() - startTime });
      const response = apiResponse.success(cached, {});
      response.headers.set('X-Cache', 'HIT');
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Filter static templates
    let templates = [...GOAL_TEMPLATES];

    if (category) {
      templates = templates.filter((t) => t.category === category);
    }

    if (difficulty) {
      templates = templates.filter((t) => t.difficulty === difficulty);
    }

    if (type) {
      templates = templates.filter((t) => t.goalType === type);
    }

    // Parallel DB queries (was sequential)
    const [dbTemplates, userGoals] = await Promise.all([
      prisma.goalTemplate.findMany({
        where: { isActive: true },
        select: {
          id: true, title: true, description: true, category: true,
          goalType: true, metric: true, target: true, duration: true,
          icon: true, color: true, difficulty: true, tips: true,
          timesUsed: true, successRate: true, isFeatured: true,
        },
        orderBy: [{ isFeatured: 'desc' }, { timesUsed: 'desc' }],
      }),
      prisma.goal.findMany({
        where: { userId },
        select: { title: true, category: true, goalType: true },
      }),
    ]);

    // Add usage info to templates
    const templatesWithUsage = templates.map((template) => {
      const usedCount = userGoals.filter(
        (g) =>
          g.title.includes(template.title.split(' ')[0]) ||
          (g.category === template.category && g.goalType === template.goalType)
      ).length;

      return {
        ...template,
        usedByYou: usedCount,
        source: 'predefined' as const,
      };
    });

    // Format DB templates
    const formattedDbTemplates = dbTemplates.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      category: t.category,
      goalType: t.goalType,
      metric: t.metric,
      target: t.target,
      unit: `${t.duration} days`,
      icon: t.icon || '📌',
      color: t.color || '#6B7280',
      difficulty: t.difficulty,
      estimatedDays: t.duration,
      tags: [],
      tips: t.tips,
      usedByYou: 0,
      timesUsed: t.timesUsed,
      successRate: t.successRate,
      isFeatured: t.isFeatured,
      source: 'database' as const,
    }));

    // Combine and sort
    const allTemplates = [...templatesWithUsage, ...formattedDbTemplates];

    // Group by category for easy navigation
    const byCategory = Object.values(PlatformCategory).reduce(
      (acc, cat) => {
        acc[cat] = allTemplates.filter((t) => t.category === cat);
        return acc;
      },
      {} as Record<string, typeof allTemplates>
    );

    // Get recommendations based on user's goals
    const recommendedTemplates = templates
      .filter((t) => {
        const hasGoalInCategory = userGoals.some((g) => g.category === t.category);
        return hasGoalInCategory;
      })
      .slice(0, 3);

    logger.info('GET /api/goals/templates completed', {
      userId,
      count: allTemplates.length,
      requestId,
      duration: Date.now() - startTime,
    });

    const responseData = {
      templates: allTemplates,
      byCategory,
      recommended: recommendedTemplates,
      total: allTemplates.length,
      filters: { category, difficulty, type },
    };

    // Cache for 24 hours (templates rarely change)
    await CacheService.set(cacheKey, responseData, 86400);

    const response = apiResponse.success(responseData, {});
    response.headers.set('X-Cache', 'MISS');
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/templates failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to fetch templates', requestId);
    return addHeaders(response, requestId);
  }
});

// =============================================================================
// POST - Create Goal from Template
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
      const response = apiResponse.validationError('Invalid JSON body', undefined, requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Validate body
    const validation = createFromTemplateSchema.safeParse(body);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Validation failed',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const { templateId, customizations } = validation.data;

    // Find template
    const template = GOAL_TEMPLATES.find((t) => t.id === templateId);

    if (!template) {
      // Check database templates
      const dbTemplate = await prisma.goalTemplate.findUnique({
        where: { id: templateId },
      });

      if (!dbTemplate) {
        const response = apiResponse.notFound('Template', requestId);
        return addHeaders(response, requestId, rateLimitResult);
      }

      // Use DB template
      // (Similar logic as below, using dbTemplate)
    }

    if (!template) {
      const response = apiResponse.notFound('Template', requestId);
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Check goal limit
    const existingCount = await prisma.goal.count({
      where: { userId, status: { notIn: [GoalStatus.ARCHIVED, GoalStatus.CANCELLED] } },
    });

    if (existingCount >= MAX_GOALS_PER_USER) {
      const response = apiResponse.validationError(
        `Maximum ${MAX_GOALS_PER_USER} active goals allowed`,
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Calculate deadline
    let deadline: Date | null = null;
    if (customizations.deadline) {
      deadline = new Date(customizations.deadline);
    } else if (template.estimatedDays) {
      deadline = new Date();
      deadline.setDate(deadline.getDate() + template.estimatedDays);
    }

    // Validate platform if provided
    if (customizations.platformId) {
      const platform = await prisma.platform.findUnique({
        where: { id: customizations.platformId },
        select: { id: true },
      });

      if (!platform) {
        const response = apiResponse.notFound('Platform', requestId);
        return addHeaders(response, requestId, rateLimitResult);
      }
    }

    // Create default milestones
    const milestones = [
      { value: 25, label: '25%', reached: false },
      { value: 50, label: '50%', reached: false },
      { value: 75, label: '75%', reached: false },
      { value: 100, label: '100%', reached: false },
    ];

    // Create goal from template
    const goal = await prisma.goal.create({
      data: {
        userId,
        title: customizations.title || template.title,
        description: template.description,
        category: template.category,
        goalType: template.goalType,
        metric: template.metric,
        target: customizations.target || template.target,
        unit: template.unit,
        progress: 0,
        progressPercentage: 0,
        startDate: new Date(),
        deadline,
        status: GoalStatus.ACTIVE,
        platformId: customizations.platformId || null,
        requiredStreakDays: template.goalType === GoalType.STREAK ? template.target : null,
        currentStreakDays: 0,
        reminderEnabled: false,
        isPublic: false,
        color: template.color,
        icon: template.icon,
        milestones: milestones as unknown as Prisma.InputJsonValue,
        daysActive: 0,
        avgDailyProgress: 0,
      },
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
    });

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'CREATE',
      category: 'goals',
      entityType: 'goal',
      entityId: goal.id,
      description: `Created goal from template: ${template.title}`,
      newValue: { templateId, goalId: goal.id },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('POST /api/goals/templates completed', {
      userId,
      templateId,
      goalId: goal.id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.created(
      {
        goal,
        template: {
          id: template.id,
          title: template.title,
        },
      },
      { requestId, message: 'Goal created from template successfully' }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /api/goals/templates failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to create goal from template', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';