// src/app/api/analytics/categories/route.ts
// =============================================================================
// Analytics by Category
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
import { PlatformCategory } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

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
  'Cache-Control': 'private, no-cache, no-store, must-revalidate',
};

const CATEGORY_CONFIG: Record<PlatformCategory, { label: string; color: string; icon: string }> = {
  DSA: { label: 'DSA & Competitive', color: '#3B82F6', icon: 'Code' },
  JOB: { label: 'Job Search', color: '#10B981', icon: 'Briefcase' },
  GIT: { label: 'Version Control', color: '#6366F1', icon: 'GitBranch' },
  LEARNING: { label: 'Learning', color: '#F59E0B', icon: 'BookOpen' },
  HACKATHON: { label: 'Hackathons', color: '#EC4899', icon: 'Zap' },
  OPENSOURCE: { label: 'Open Source', color: '#8B5CF6', icon: 'Globe' },
  COMPANY: { label: 'Company Prep', color: '#EF4444', icon: 'Building' },
  DESIGN: { label: 'Design', color: '#14B8A6', icon: 'Palette' },
  DATA_SCIENCE: { label: 'Data Science', color: '#06B6D4', icon: 'BarChart' },
  OTHER: { label: 'Other', color: '#6B7280', icon: 'MoreHorizontal' },
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(3650).default(30),
  categories: z.string().optional().transform(v => v ? v.split(',') as PlatformCategory[] : undefined),
  sortBy: z.enum(['problems', 'time', 'commits', 'entries', 'name']).default('problems'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeTimeline: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
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
  const rateLimitKey = `analytics-categories:${ip}`;
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
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      logger.info('user seesion not found', { session, requestId })
      return addHeaders(new NextResponse(null, { status: 401 }), requestId, rateLimitResult);
    }

    const categoryCount = Object.keys(PlatformCategory).length;
    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Categories', String(categoryCount));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD analytics/categories failed', { requestId }, error);
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

    // Parse and validate query parameters
    const queryValidation = querySchema.safeParse({
      days: searchParams.get('days') || '30',
      categories: searchParams.get('categories') || undefined,
      sortBy: searchParams.get('sortBy') || 'problems',
      sortOrder: searchParams.get('sortOrder') || 'desc',
      includeTimeline: searchParams.get('includeTimeline') || undefined,
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

    // Build where clause
    const whereClause: {
      userId: string;
      date: { gte: Date; lte: Date };
      category?: { in: PlatformCategory[] };
    } = {
      userId,
      date: { gte: startDate, lte: endDate },
    };

    if (params.categories && params.categories.length > 0) {
      whereClause.category = { in: params.categories };
    }

    // Fetch entries
    const entries = await prisma.trackerEntry.findMany({
      where: whereClause,
      select: {
        id: true,
        date: true,
        category: true,
        problemsSolved: true,
        commits: true,
        timeSpent: true,
        pointsEarned: true,
      },
    });

    // Aggregate by category
    const categoryMap = new Map<PlatformCategory, {
      category: PlatformCategory;
      label: string;
      color: string;
      icon: string;
      problems: number;
      commits: number;
      time: number;
      points: number;
      entries: number;
      days: Set<string>;
    }>();

    // Initialize all categories
    Object.values(PlatformCategory).forEach(cat => {
      const config = CATEGORY_CONFIG[cat];
      categoryMap.set(cat, {
        category: cat,
        label: config.label,
        color: config.color,
        icon: config.icon,
        problems: 0,
        commits: 0,
        time: 0,
        points: 0,
        entries: 0,
        days: new Set(),
      });
    });

    // Aggregate data
    entries.forEach(entry => {
      if (entry.category) {
        const data = categoryMap.get(entry.category);
        if (data) {
          data.problems += entry.problemsSolved;
          data.commits += entry.commits;
          data.time += entry.timeSpent;
          data.points += entry.pointsEarned || 0;
          data.entries += 1;
          data.days.add(entry.date.toDateString());
        }
      }
    });

    // Calculate totals
    const totals = {
      problems: 0,
      commits: 0,
      time: 0,
      points: 0,
      entries: 0,
    };

    // Convert to array and calculate percentages
    let categoryStats = Array.from(categoryMap.values()).map(data => {
      totals.problems += data.problems;
      totals.commits += data.commits;
      totals.time += data.time;
      totals.points += data.points;
      totals.entries += data.entries;

      return {
        category: data.category,
        label: data.label,
        color: data.color,
        icon: data.icon,
        problems: data.problems,
        commits: data.commits,
        time: data.time,
        points: data.points,
        entries: data.entries,
        activeDays: data.days.size,
        percentage: 0, // Will calculate after
      };
    });

    // Calculate percentages
    categoryStats = categoryStats.map(stat => ({
      ...stat,
      percentage: totals.problems > 0 ? Math.round((stat.problems / totals.problems) * 100) : 0,
    }));

    // Sort
    categoryStats.sort((a, b) => {
      const aVal = a[params.sortBy as keyof typeof a] as number;
      const bVal = b[params.sortBy as keyof typeof b] as number;
      return params.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    // Filter out empty categories unless specifically requested
    if (!params.categories) {
      categoryStats = categoryStats.filter(stat => stat.entries > 0);
    }

    // Build timeline if requested
    let timeline = null;
    if (params.includeTimeline) {
      const timelineMap = new Map<string, Record<string, number>>();

      entries.forEach(entry => {
        if (entry.category) {
          const dateKey = format(entry.date, 'yyyy-MM-dd');
          if (!timelineMap.has(dateKey)) {
            timelineMap.set(dateKey, {});
          }
          const dayData = timelineMap.get(dateKey)!;
          dayData[entry.category] = (dayData[entry.category] || 0) + entry.problemsSolved;
        }
      });

      timeline = Array.from(timelineMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    // Build response
    const response = {
      categories: categoryStats,
      totals,
      timeline,
      period: {
        days: params.days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };

    logger.info('Analytics categories fetched', {
      userId,
      days: params.days,
      categoryCount: categoryStats.length,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(response, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('GET analytics/categories failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch category analytics', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';