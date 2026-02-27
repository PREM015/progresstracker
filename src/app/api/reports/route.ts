/* eslint-disable @typescript-eslint/no-explicit-any */
// =============================================================================
// api/reports/route.ts
// =============================================================================
// Description: Main reports management
// Methods: GET, POST, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 30 requests/minute
// Security: User ownership validation, audit logging
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { AuditAction } from '@prisma/client';
import { sanitizeText } from '@/lib/sanitize';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['weekly', 'monthly', 'yearly', 'custom']).optional(),
  status: z.enum(['generating', 'generated', 'sent', 'failed']).optional(),
  search: z.string().max(200).optional().transform(val => val ? sanitizeText(val) : val),
  sortBy: z.enum(['createdAt', 'periodStart', 'type', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

const createReportSchema = z.object({
  type: z.enum(['weekly', 'monthly', 'yearly', 'custom']),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  title: z.string().min(1).max(200).optional().transform(val => val ? sanitizeText(val) : val),
  includeCharts: z.boolean().default(true),
  includeComparisons: z.boolean().default(true),
  includeInsights: z.boolean().default(true),
  platforms: z.array(z.string()).optional(),
  categories: z.array(z.enum(['DSA', 'JOB', 'GIT', 'LEARNING', 'HACKATHON', 'OPENSOURCE', 'COMPANY', 'DESIGN', 'DATA_SCIENCE', 'OTHER'])).optional(),
});

// =============================================================================
// SECURITY HELPERS
// =============================================================================

async function validateUserAuth(request: NextRequest, requestId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: apiResponse.unauthorized('Authentication required', requestId) };
  }

  // Check if user is active
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      isActive: true,
      isBanned: true,
      subscription: {
        select: {
          tier: true,
          exportLimitMonthly: true,
          currentExportCount: true,
          usageResetAt: true
        }
      }
    }
  });

  if (!user) {
    return { error: apiResponse.unauthorized('User not found', requestId) };
  }

  if (!user.isActive || user.isBanned) {
    return { error: apiResponse.forbidden('Account is not active', requestId) };
  }

  return { session, user };
}

// =============================================================================
// BUSINESS LOGIC HELPERS
// =============================================================================

async function generateReportData(userId: string, periodStart: Date, periodEnd: Date, options: any) {
  // Get daily stats for the period
  const dailyStats = await prisma.dailyStats.findMany({
    where: {
      userId,
      date: {
        gte: periodStart,
        lte: periodEnd,
      }
    },
    orderBy: { date: 'asc' }
  });

  // Get tracker entries for detailed analysis
  const trackerEntries = await prisma.trackerEntry.findMany({
    where: {
      userId,
      date: {
        gte: periodStart,
        lte: periodEnd,
      },
      ...(options.platforms && {
        platform: {
          slug: { in: options.platforms }
        }
      }),
      ...(options.categories && {
        category: { in: options.categories }
      })
    },
    include: {
      platform: {
        select: { name: true, slug: true, category: true }
      }
    },
    orderBy: { date: 'asc' }
  });

  // Calculate aggregate statistics
  const stats = {
    totalProblems: dailyStats.reduce((sum, s) => sum + s.totalProblems, 0),
    totalCommits: dailyStats.reduce((sum, s) => sum + s.totalCommits, 0),
    totalPullRequests: dailyStats.reduce((sum, s) => sum + s.totalPullRequests, 0),
    totalTimeSpent: dailyStats.reduce((sum, s) => sum + s.totalTimeSpent, 0),
    totalPoints: dailyStats.reduce((sum, s) => sum + s.totalPoints, 0),
    daysActive: dailyStats.filter(s => s.hadActivity).length,
    totalDays: dailyStats.length,
  };

  // Calculate platform breakdown
  const platformBreakdown: Record<string, any> = {};
  trackerEntries.forEach(entry => {
    const platformName = entry.platform?.name || 'Manual Entry';
    if (!platformBreakdown[platformName]) {
      platformBreakdown[platformName] = {
        problems: 0,
        commits: 0,
        timeSpent: 0,
        category: entry.platform?.category || 'OTHER'
      };
    }
    platformBreakdown[platformName].problems += entry.problemsSolved;
    platformBreakdown[platformName].commits += entry.commits;
    platformBreakdown[platformName].timeSpent += entry.timeSpent;
  });

  // Calculate trends
  const weeklyTrends = [];
  for (let i = 0; i < dailyStats.length; i += 7) {
    const weekStats = dailyStats.slice(i, i + 7);
    const weekTotal = weekStats.reduce((sum, s) => sum + s.totalProblems, 0);
    weeklyTrends.push({
      week: Math.floor(i / 7) + 1,
      problems: weekTotal,
      daysActive: weekStats.filter(s => s.hadActivity).length
    });
  }

  // Generate insights
  const insights = [];

  // Activity consistency
  const consistencyRate = (stats.daysActive / stats.totalDays) * 100;
  if (consistencyRate > 80) {
    insights.push({
      type: 'positive',
      title: 'Great Consistency!',
      message: `You were active ${stats.daysActive} out of ${stats.totalDays} days (${consistencyRate.toFixed(1)}%)`
    });
  } else if (consistencyRate < 40) {
    insights.push({
      type: 'suggestion',
      title: 'Improve Consistency',
      message: `Try to be more consistent. You were active only ${consistencyRate.toFixed(1)}% of days`
    });
  }

  // Problem solving trend
  if (weeklyTrends.length > 1) {
    const lastWeek = weeklyTrends[weeklyTrends.length - 1];
    const previousWeek = weeklyTrends[weeklyTrends.length - 2];

    if (lastWeek.problems > previousWeek.problems * 1.2) {
      insights.push({
        type: 'positive',
        title: 'Accelerating Progress!',
        message: `Your problem-solving increased by ${((lastWeek.problems / previousWeek.problems - 1) * 100).toFixed(1)}% this week`
      });
    }
  }

  // Top performing platform
  const topPlatform = Object.entries(platformBreakdown)
    .sort(([, a], [, b]) => (b as any).problems - (a as any).problems)[0];

  if (topPlatform) {
    insights.push({
      type: 'info',
      title: 'Most Active Platform',
      message: `${topPlatform[0]} was your most active platform with ${(topPlatform[1] as any).problems} problems solved`
    });
  }

  return {
    stats,
    dailyBreakdown: dailyStats.map(s => ({
      date: s.date.toISOString().split('T')[0],
      problems: s.totalProblems,
      commits: s.totalCommits,
      timeSpent: s.totalTimeSpent,
      hadActivity: s.hadActivity
    })),
    platformBreakdown,
    weeklyTrends: options.includeCharts ? weeklyTrends : undefined,
    insights: options.includeInsights ? insights : undefined,
    comparisons: options.includeComparisons ? {
      // Add comparison with previous period
      // This would require additional logic
    } : undefined,
    metadata: {
      generatedAt: new Date().toISOString(),
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
        days: Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
      }
    }
  };
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();

  try {
    const { error, user } = await validateUserAuth(request, requestId);
    if (error) return error;

    const count = await prisma.report.count({
      where: { userId: user!.id }
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Count', String(count));
    response.headers.set('X-Request-ID', requestId);

    return response;
  } catch (error) {
    logger.error('HEAD reports failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * GET - List user's reports
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Auth and rate limiting
    const { error, session, user } = await validateUserAuth(request, requestId);
    if (error) return error;

    const rateLimitResult = await checkLimit(
      apiRateLimiter,
      30,
      `reports:${session!.user.id}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Parse query
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      type: searchParams.get('type') || undefined,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    });

    if (!queryValidation.success) {
      return apiResponse.validationError(
        'Invalid query parameters',
        queryValidation.error.errors,
        requestId
      );
    }

    const { page, limit, type, status, search, sortBy, sortOrder, dateFrom, dateTo } = queryValidation.data;

    // Build where clause
    const where: any = { userId: user!.id };

    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (dateFrom || dateTo) {
      where.periodStart = {};
      if (dateFrom) where.periodStart.gte = new Date(dateFrom);
      if (dateTo) where.periodStart.lte = new Date(dateTo);
    }

    // Execute query
    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          summary: true,
          periodStart: true,
          periodEnd: true,
          status: true,
          sentAt: true,
          pdfUrl: true,
          createdAt: true,
        }
      }),
      prisma.report.count({ where })
    ]);

    logger.info('Reports fetched', {
      requestId,
      userId: user!.id,
      total,
      type,
      duration: Date.now() - startTime
    });

    return apiResponse.paginated(
      reports,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
      { meta: { requestId } }
    );

  } catch (error) {
    logger.error('GET reports failed', { requestId }, error);
    return apiResponse.internalError('Failed to fetch reports', requestId);
  }
}

/**
 * POST - Generate new report
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Auth and rate limiting
    const { error, session, user } = await validateUserAuth(request, requestId);
    if (error) return error;

    const rateLimitResult = await checkLimit(
      apiRateLimiter,
      10,
      `reports-create:${session!.user.id}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(300, requestId); // 5 min timeout for report generation
    }

    // Check subscription limits
    const now = new Date();
    const subscription = user!.subscription;

    if (subscription && subscription.usageResetAt && subscription.usageResetAt < now) {
      // Reset monthly usage
      await prisma.subscription.update({
        where: { userId: user!.id },
        data: {
          currentExportCount: 0,
          usageResetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
        }
      });
      subscription.currentExportCount = 0;
    }

    if (subscription && subscription.currentExportCount >= subscription.exportLimitMonthly) {
      return apiResponse.forbidden('Monthly report generation limit exceeded', requestId);
    }

    // Parse body
    const body = await request.json();
    const validation = createReportSchema.safeParse(body);

    if (!validation.success) {
      return apiResponse.validationError(
        'Invalid report configuration',
        validation.error.errors,
        requestId
      );
    }

    const data = validation.data;
    const periodStart = new Date(data.periodStart);
    const periodEnd = new Date(data.periodEnd);

    // Validate date range
    if (periodEnd <= periodStart) {
      return apiResponse.validationError(
        'End date must be after start date',
        [{ path: ['periodEnd'], message: 'Must be after periodStart' }],
        requestId
      );
    }

    // Check maximum date range (e.g., 1 year)
    const maxDays = 365;
    const diffDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > maxDays) {
      return apiResponse.validationError(
        `Date range too large. Maximum ${maxDays} days allowed`,
        [{ path: ['periodEnd'], message: `Date range exceeds ${maxDays} days` }],
        requestId
      );
    }

    // Generate report data
    const reportData = await generateReportData(user!.id, periodStart, periodEnd, data);

    // Generate title if not provided
    const title = data.title || `${data.type.charAt(0).toUpperCase() + data.type.slice(1)} Report`;

    // Generate summary
    const summary = `Report for ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}. 
Problems solved: ${reportData.stats.totalProblems}, Commits: ${reportData.stats.totalCommits}, 
Days active: ${reportData.stats.daysActive}/${reportData.stats.totalDays}, Points earned: ${reportData.stats.totalPoints}`;

    // Create report
    const report = await prisma.report.create({
      data: {
        userId: user!.id,
        type: data.type,
        periodStart,
        periodEnd,
        title,
        summary,
        data: reportData,
        status: 'generated',
      }
    });

    // Update subscription usage
    if (subscription) {
      await prisma.subscription.update({
        where: { userId: user!.id },
        data: {
          currentExportCount: { increment: 1 }
        }
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user!.id,
        action: AuditAction.CREATE,
        category: 'reports',
        entityType: 'report',
        entityId: report.id,
        description: `Generated ${data.type} report`,
        newValue: {
          type: data.type,
          periodStart,
          periodEnd,
          dataPoints: reportData.stats.totalProblems
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent'),
      }
    });

    logger.info('Report generated', {
      requestId,
      userId: user!.id,
      reportId: report.id,
      type: data.type,
      duration: Date.now() - startTime
    });

    return apiResponse.created(report, { requestId });

  } catch (error) {
    logger.error('POST reports failed', { requestId }, error);
    return apiResponse.internalError('Failed to generate report', requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';