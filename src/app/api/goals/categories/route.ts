// =============================================================================
// src/app/api/goals/categories/route.ts
// =============================================================================
// Description: Get goals grouped by category with stats
// Methods: GET, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 50 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { GoalStatus, PlatformCategory } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 50;

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

// Category display configuration
const CATEGORY_CONFIG: Record<PlatformCategory, { label: string; icon: string; color: string }> = {
  [PlatformCategory.DSA]: { label: 'DSA & Algorithms', icon: '🧮', color: '#6366F1' },
  [PlatformCategory.JOB]: { label: 'Job Applications', icon: '💼', color: '#10B981' },
  [PlatformCategory.GIT]: { label: 'Git & Development', icon: '💻', color: '#1F2937' },
  [PlatformCategory.LEARNING]: { label: 'Learning', icon: '📚', color: '#8B5CF6' },
  [PlatformCategory.HACKATHON]: { label: 'Hackathons', icon: '🚀', color: '#F59E0B' },
  [PlatformCategory.OPENSOURCE]: { label: 'Open Source', icon: '🌍', color: '#059669' },
  [PlatformCategory.COMPANY]: { label: 'Company', icon: '🏢', color: '#3B82F6' },
  [PlatformCategory.DESIGN]: { label: 'Design', icon: '🎨', color: '#EC4899' },
  [PlatformCategory.DATA_SCIENCE]: { label: 'Data Science', icon: '📊', color: '#14B8A6' },
  [PlatformCategory.OTHER]: { label: 'Other', icon: '📌', color: '#6B7280' },
};

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
  const rateLimitKey = `goals-categories:${ip}`;
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
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    const categoryCounts = await prisma.goal.groupBy({
      by: ['category'],
      where: { userId },
      _count: true,
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Categories-Used', String(categoryCounts.length));
    response.headers.set('X-Total-Categories', String(Object.keys(PlatformCategory).length));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/categories failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Goals by Category
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

    // Get all goals grouped by category and status
    const goals = await prisma.goal.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        progress: true,
        target: true,
        progressPercentage: true,
        deadline: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by category with stats
    const categoryMap = new Map<
      PlatformCategory,
      {
        goals: typeof goals;
        total: number;
        active: number;
        completed: number;
        failed: number;
        avgProgress: number;
        completionRate: number;
      }
    >();

    // Initialize all categories
    Object.values(PlatformCategory).forEach((category) => {
      categoryMap.set(category, {
        goals: [],
        total: 0,
        active: 0,
        completed: 0,
        failed: 0,
        avgProgress: 0,
        completionRate: 0,
      });
    });

    // Populate category data
    goals.forEach((goal) => {
      const categoryData = categoryMap.get(goal.category)!;
      categoryData.goals.push(goal);
      categoryData.total++;

      switch (goal.status) {
        case GoalStatus.ACTIVE:
        case GoalStatus.PAUSED:
          categoryData.active++;
          break;
        case GoalStatus.COMPLETED:
          categoryData.completed++;
          break;
        case GoalStatus.FAILED:
          categoryData.failed++;
          break;
      }
    });

    // Calculate averages and format response
    const categories = Object.values(PlatformCategory).map((category) => {
      const data = categoryMap.get(category)!;
      const config = CATEGORY_CONFIG[category];

      // Calculate average progress
      const totalProgress = data.goals.reduce((sum, g) => sum + (g.progressPercentage || 0), 0);
      data.avgProgress = data.total > 0 ? Math.round(totalProgress / data.total) : 0;

      // Calculate completion rate
      const finishedGoals = data.completed + data.failed;
      data.completionRate = finishedGoals > 0 ? Math.round((data.completed / finishedGoals) * 100) : 0;

      // Get recent goals (top 3)
      const recentGoals = data.goals.slice(0, 3).map((g) => ({
        id: g.id,
        title: g.title,
        status: g.status,
        progress: g.progressPercentage,
        deadline: g.deadline,
      }));

      return {
        category,
        ...config,
        stats: {
          total: data.total,
          active: data.active,
          completed: data.completed,
          failed: data.failed,
          avgProgress: data.avgProgress,
          completionRate: data.completionRate,
        },
        recentGoals,
        hasGoals: data.total > 0,
      };
    });

    // Sort by total goals (most used first), then alphabetically
    categories.sort((a, b) => {
      if (b.stats.total !== a.stats.total) {
        return b.stats.total - a.stats.total;
      }
      return a.label.localeCompare(b.label);
    });

    // Overall stats
    const overallStats = {
      totalGoals: goals.length,
      categoriesUsed: categories.filter((c) => c.hasGoals).length,
      totalCategories: Object.keys(PlatformCategory).length,
      mostUsedCategory: categories[0]?.category || null,
      avgCompletionRate:
        categories.reduce((sum, c) => sum + c.stats.completionRate, 0) /
        Math.max(1, categories.filter((c) => c.hasGoals).length),
    };

    logger.info('GET /api/goals/categories completed', {
      userId,
      categoriesUsed: overallStats.categoriesUsed,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        categories,
        stats: overallStats,
      },
      { }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/categories failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to fetch goal categories', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';