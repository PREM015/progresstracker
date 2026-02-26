/* eslint-disable @typescript-eslint/no-explicit-any */
// =============================================================================
// api/reports/generate/route.ts
// =============================================================================
// Description: Generate reports on-demand with job queue
// Methods: POST, OPTIONS
// Auth Required: Yes
// Rate Limit: 10 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { AuditAction, PlatformCategory } from '@prisma/client';
import { sanitizeText } from '@/lib/sanitize';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const generateReportSchema = z.object({
  type: z.enum(['weekly', 'monthly', 'yearly', 'custom', 'progress', 'analytics', 'achievements', 'goals', 'platforms']),

  // Date range shortcut
  dateRange: z.enum(['last_7_days', 'last_30_days', 'last_90_days', 'this_year', 'all_time']).optional(),

  // For predefined reports
  period: z.object({
    year: z.number().int().min(2020).max(2030).optional(),
    month: z.number().int().min(1).max(12).optional(), // 1-12
    week: z.string().regex(/^\d{4}-W\d{2}$/).optional(), // 2024-W15
  }).optional(),

  // For custom reports
  customPeriod: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),

  // Report configuration
  config: z.object({
    title: z.string().min(1).max(200).optional().transform(val => val ? sanitizeText(val) : val),
    includeCharts: z.boolean().default(true),
    includeComparisons: z.boolean().default(true),
    includeInsights: z.boolean().default(true),
    includePlatformBreakdown: z.boolean().default(true),
    includeGoalsAnalysis: z.boolean().default(false),
    includeAchievements: z.boolean().default(false),

    // Filters
    platforms: z.array(z.string()).optional(),
    categories: z.array(z.nativeEnum(PlatformCategory)).optional(),

    // Advanced options
    excludeWeekends: z.boolean().default(false),
    minimumActivityThreshold: z.number().int().min(0).default(0),
    groupBy: z.enum(['day', 'week', 'month']).default('day'),

    // Output options
    format: z.enum(['json', 'pdf']).default('json'),
    emailReport: z.boolean().default(false),
    emailAddress: z.string().email().optional(),
  }).default({}),

  // Processing options
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  async: z.boolean().default(false), // For large reports
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculatePeriodDates(type: string, dateRange?: string, period?: any, customPeriod?: any) {
  const now = new Date();

  // 1. Handle custom period
  if (type === 'custom' && customPeriod) {
    return {
      start: new Date(customPeriod.start),
      end: new Date(customPeriod.end)
    };
  }

  // 2. Handle dateRange shortcuts (takes precedence for non-calendar types)
  if (dateRange) {
    const end = new Date(now);
    let start = new Date(now);

    switch (dateRange) {
      case 'last_7_days':
        start.setDate(now.getDate() - 7);
        break;
      case 'last_30_days':
        start.setDate(now.getDate() - 30);
        break;
      case 'last_90_days':
        start.setDate(now.getDate() - 90);
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all_time':
        start = new Date(2020, 0, 1); // Or user creation date logic
        break;
      default:
        // Default to 30 days
        start.setDate(now.getDate() - 30);
    }
    return { start, end };
  }

  // 3. Handle specific calendar types
  switch (type) {
    case 'weekly':
      if (period?.week) {
        const [year, weekStr] = period.week.split('-W');
        const weekNum = parseInt(weekStr);
        const yearNum = parseInt(year);

        const jan1 = new Date(yearNum, 0, 1);
        const daysToAdd = (weekNum - 1) * 7 - jan1.getDay() + 1;
        const weekStart = new Date(jan1.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

        return { start: weekStart, end: weekEnd };
      } else {
        // Current week
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + 1);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        return { start: weekStart, end: weekEnd };
      }

    case 'monthly':
      if (period?.year && period?.month) {
        const start = new Date(period.year, period.month - 1, 1);
        const end = new Date(period.year, period.month, 0, 23, 59, 59, 999);
        return { start, end };
      } else {
        // Current month
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
      }

    case 'yearly':
      const year = period?.year || now.getFullYear();
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59, 999)
      };

    // Default fallback if no dateRange and generic type
    default:
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      return { start, end: now };
  }
}

async function estimateReportComplexity(userId: string, start: Date, end: Date, config: any) {
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  // Estimate based on data volume
  const entryCount = await prisma.trackerEntry.count({
    where: {
      userId,
      date: { gte: start, lte: end }
    }
  });

  let complexity = 'simple';
  let estimatedTime = 5; // seconds

  if (diffDays > 90 || entryCount > 1000) {
    complexity = 'moderate';
    estimatedTime = 15;
  }

  if (diffDays > 365 || entryCount > 5000 || config.includeGoalsAnalysis || config.includeAchievements) {
    complexity = 'complex';
    estimatedTime = 30;
  }

  return { complexity, estimatedTime, entryCount, diffDays };
}

async function queueReportGeneration(reportId: string, config: any) {
  // In a real implementation, you would add this to a job queue (Redis Queue, Bull, etc.)
  // For now, we'll simulate this with a database record

  await prisma.auditLog.create({
    data: {
      action: AuditAction.CREATE,
      category: 'report_queue',
      entityType: 'report',
      entityId: reportId,
      description: 'Report queued for generation',
      newValue: {
        priority: config.priority,
        async: config.async,
        queuedAt: new Date()
      }
    }
  });

  // Here you would typically:
  // 1. Add job to queue with priority
  // 2. Return job ID for status checking
  // 3. Process job in background worker

  return {
    jobId: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    estimatedCompletion: new Date(Date.now() + 30000) // 30 seconds
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // Rate limiting
    const rateLimitResult = await checkLimit(
      apiRateLimiter,
      10,
      `generate-reports:${session.user.id}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(300, requestId); // 5 min timeout
    }

    // Check user subscription and limits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        subscription: true
      }
    });

    if (!user) {
      return apiResponse.notFound('User', requestId);
    }

    // Check subscription limits
    const subscription = user.subscription;
    if (subscription) {
      const now = new Date();
      if (subscription.usageResetAt && subscription.usageResetAt < now) {
        await prisma.subscription.update({
          where: { userId: session.user.id },
          data: {
            currentExportCount: 0,
            usageResetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
          }
        });
        subscription.currentExportCount = 0;
      }

      if (subscription.currentExportCount >= subscription.exportLimitMonthly) {
        return apiResponse.forbidden('Monthly report generation limit exceeded', requestId);
      }
    }

    // Parse and validate request
    const body = await request.json();
    const validation = generateReportSchema.safeParse(body);

    if (!validation.success) {
      return apiResponse.validationError(
        'Invalid report generation request',
        validation.error.errors,
        requestId
      );
    }

    const { type, dateRange, period, customPeriod, config, priority, async: isAsync } = validation.data;

    // Calculate period dates
    const { start, end } = calculatePeriodDates(type, dateRange, period, customPeriod);

    // Validate date range
    if (end <= start) {
      return apiResponse.validationError(
        'End date must be after start date',
        [{ path: ['period'], message: 'Invalid date range' }],
        requestId
      );
    }

    // Check maximum date range based on subscription
    const maxDays = subscription?.tier === 'FREE' ? 90 :
      subscription?.tier === 'STARTER' ? 365 :
        subscription?.tier === 'PRO' ? 730 : 1095;

    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > maxDays) {
      return apiResponse.validationError(
        `Date range too large. Maximum ${maxDays} days allowed for your subscription tier`,
        [{ path: ['period'], message: `Exceeds ${maxDays} day limit` }],
        requestId
      );
    }

    // Estimate report complexity
    const complexity = await estimateReportComplexity(session.user.id, start, end, config);

    // Check if report already exists for this exact period
    const existingReport = await prisma.report.findFirst({
      where: {
        userId: session.user.id,
        type,
        periodStart: start,
        periodEnd: end,
        status: { in: ['generated', 'generating'] }
      }
    });

    if (existingReport) {
      if (existingReport.status === 'generating') {
        return apiResponse.success({
          reportId: existingReport.id,
          status: 'generating',
          message: 'Report is already being generated',
          existingReport: true
        }, { meta: { requestId } });
      } else {
        return apiResponse.success({
          reportId: existingReport.id,
          status: 'completed',
          report: existingReport,
          existingReport: true
        }, { meta: { requestId } });
      }
    }

    // Create report record
    const title = config.title ||
      `${type.charAt(0).toUpperCase() + type.slice(1)} Report - ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;

    const report = await prisma.report.create({
      data: {
        userId: session.user.id,
        type,
        periodStart: start,
        periodEnd: end,
        title,
        summary: 'Report generation in progress...',
        data: {
          generationRequest: {
            config,
            complexity: complexity.complexity,
            estimatedTime: complexity.estimatedTime,
            requestedAt: new Date().toISOString()
          }
        },
        status: isAsync ? 'generating' : 'generated',
      }
    });

    let result: any = {
      reportId: report.id,
      type,
      period: { start, end },
      complexity: complexity.complexity,
      estimatedDays: complexity.diffDays,
      estimatedEntries: complexity.entryCount
    };

    // For async reports, queue for background processing
    if (isAsync || complexity.complexity === 'complex') {
      const jobInfo = await queueReportGeneration(report.id, { priority, async: isAsync });

      result = {
        ...result,
        status: 'queued',
        jobId: jobInfo.jobId,
        estimatedCompletion: jobInfo.estimatedCompletion,
        message: 'Report has been queued for generation. You will be notified when complete.'
      };

      // Send notification if email is configured
      if (config.emailReport && config.emailAddress) {
        // Queue email notification job
        await prisma.auditLog.create({
          data: {
            action: AuditAction.CREATE,
            category: 'email_queue',
            entityType: 'report',
            entityId: report.id,
            description: 'Email notification queued',
            newValue: {
              emailAddress: config.emailAddress,
              type: 'report_completion'
            }
          }
        });
      }
    } else {
      // Generate report immediately for simple reports
      try {
        // This would call the same generation logic as in other routes
        // For brevity, I'll simulate immediate generation

        const quickStats = await prisma.dailyStats.aggregate({
          _sum: {
            totalProblems: true,
            totalCommits: true,
            totalTimeSpent: true
          },
          _count: {
            id: true
          },
          where: {
            userId: session.user.id,
            date: { gte: start, lte: end }
          }
        });

        const reportData = {
          stats: {
            totalProblems: quickStats._sum.totalProblems || 0,
            totalCommits: quickStats._sum.totalCommits || 0,
            totalTimeSpent: quickStats._sum.totalTimeSpent || 0,
            daysWithData: quickStats._count.id || 0
          },
          generatedAt: new Date().toISOString(),
          generationType: 'immediate',
          complexity: complexity.complexity
        };

        // Update report with generated data
        await prisma.report.update({
          where: { id: report.id },
          data: {
            data: reportData,
            summary: `Quick ${type} report: ${quickStats._sum.totalProblems || 0} problems solved`,
            status: 'generated'
          }
        });

        result = {
          ...result,
          status: 'completed',
          report: {
            id: report.id,
            title,
            data: reportData
          },
          generationTime: Date.now() - startTime
        };
      } catch (generationError) {
        logger.error('Immediate report generation failed', {
          requestId,
          reportId: report.id
        }, generationError);

        // Update report status to failed
        await prisma.report.update({
          where: { id: report.id },
          data: { status: 'failed' }
        });

        return apiResponse.internalError('Report generation failed', requestId);
      }
    }

    // Update subscription usage
    if (subscription) {
      await prisma.subscription.update({
        where: { userId: session.user.id },
        data: { currentExportCount: { increment: 1 } }
      });
    }

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: AuditAction.CREATE,
        category: 'reports',
        entityType: 'report',
        entityId: report.id,
        description: `Report generation ${isAsync ? 'queued' : 'completed'}: ${type}`,
        newValue: {
          type,
          period: { start, end },
          config,
          complexity: complexity.complexity,
          async: isAsync
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent'),
      }
    });

    logger.info('Report generation request processed', {
      requestId,
      userId: session.user.id,
      reportId: report.id,
      type,
      complexity: complexity.complexity,
      async: isAsync,
      duration: Date.now() - startTime
    });

    return apiResponse.success(result, {
      meta: {
        requestId,
        processingTime: Date.now() - startTime
      }
    });

  } catch (error) {
    logger.error('POST generate report failed', { requestId }, error);
    return apiResponse.internalError('Failed to process report generation request', requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';