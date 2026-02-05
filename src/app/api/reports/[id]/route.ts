/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// =============================================================================
// api/reports/[id]/route.ts
// =============================================================================
// Description: Individual report management (view, update, delete, regenerate)
// Methods: GET, PATCH, DELETE, POST, OPTIONS
// Auth Required: Yes
// Rate Limit: 30 requests/minute
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

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const paramsSchema = z.object({
  id: z.string().cuid('Invalid report ID format')
});

const updateReportSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  summary: z.string().max(1000).optional(),
  status: z.enum(['generating', 'generated', 'sent', 'failed']).optional(),
});

const regenerateSchema = z.object({
  force: z.boolean().default(false),
  updateConfig: z.object({
    includeCharts: z.boolean().optional(),
    includeComparisons: z.boolean().optional(),
    includeInsights: z.boolean().optional(),
  }).optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function checkReportOwnership(reportId: string, userId: string) {
  const report = await prisma.report.findFirst({
    where: {
      id: reportId,
      userId
    }
  });

  return report;
}

async function regenerateReportData(reportId: string, userId: string, config?: any) {
  // Get original report to understand period and type
  const originalReport = await prisma.report.findUnique({
    where: { id: reportId }
  });

  if (!originalReport) {
    throw new Error('Report not found');
  }

  // Get fresh data for the same period
  const dailyStats = await prisma.dailyStats.findMany({
    where: {
      userId,
      date: {
        gte: originalReport.periodStart,
        lte: originalReport.periodEnd
      }
    },
    orderBy: { date: 'asc' }
  });

  const trackerEntries = await prisma.trackerEntry.findMany({
    where: {
      userId,
      date: {
        gte: originalReport.periodStart,
        lte: originalReport.periodEnd
      }
    },
    include: {
      platform: {
        select: { name: true, category: true }
      }
    }
  });

  // Calculate updated statistics
  const stats = {
    totalProblems: dailyStats.reduce((sum, s) => sum + s.totalProblems, 0),
    totalCommits: dailyStats.reduce((sum, s) => sum + s.totalCommits, 0),
    totalTimeSpent: dailyStats.reduce((sum, s) => sum + s.totalTimeSpent, 0),
    daysActive: dailyStats.filter(s => s.hadActivity).length,
    totalDays: dailyStats.length,
  };

  // Platform breakdown
  const platformBreakdown: Record<string, any> = {};
  trackerEntries.forEach(entry => {
    const platform = entry.platform?.name || 'Manual Entry';
    if (!platformBreakdown[platform]) {
      platformBreakdown[platform] = {
        problems: 0,
        commits: 0,
        timeSpent: 0,
        category: entry.platform?.category || 'OTHER'
      };
    }
    platformBreakdown[platform].problems += entry.problemsSolved;
    platformBreakdown[platform].commits += entry.commits;
    platformBreakdown[platform].timeSpent += entry.timeSpent;
  });

  // Generate insights
  const insights = [];
  
  const consistencyRate = stats.totalDays > 0 ? (stats.daysActive / stats.totalDays) * 100 : 0;
  insights.push({
    type: 'consistency',
    title: 'Activity Consistency',
    description: `You were active ${consistencyRate.toFixed(1)}% of the time`,
    metric: consistencyRate
  });

  if (Object.keys(platformBreakdown).length > 0) {
    const topPlatform = Object.entries(platformBreakdown)
      .sort(([,a], [,b]) => (b as any).problems - (a as any).problems)[0];
    
    insights.push({
      type: 'platform',
      title: 'Most Active Platform',
      description: `${topPlatform[0]} with ${(topPlatform[1] as any).problems} problems solved`,
      platform: topPlatform[0]
    });
  }

  return {
    stats,
    platformBreakdown,
    insights,
    dailyBreakdown: dailyStats.map(s => ({
      date: s.date.toISOString().split('T')[0],
      problems: s.totalProblems,
      commits: s.totalCommits,
      timeSpent: s.totalTimeSpent,
      hadActivity: s.hadActivity
    })),
    regeneratedAt: new Date().toISOString(),
    originalGeneratedAt: (originalReport.data as any)?.generatedAt
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
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

/**
 * GET - Get individual report details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  
  try {
    // Validate params
    const validation = paramsSchema.safeParse(params);
    if (!validation.success) {
      return apiResponse.validationError(
        'Invalid report ID',
        validation.error.errors,
        requestId
      );
    }

    const { id } = validation.data;

    // Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // Rate limiting
    const rateLimitResult = await checkLimit(
      apiRateLimiter, 
      50, 
      `report-view:${session.user.id}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Check ownership and get report
    const report = await checkReportOwnership(id, session.user.id);
    
    if (!report) {
      return apiResponse.notFound('Report', requestId);
    }

    // Log view (for analytics)
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: AuditAction.READ,
        category: 'reports',
        entityType: 'report',
        entityId: id,
        description: `Viewed report: ${report.title}`,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      }
    });

    logger.info('Report viewed', {
      requestId,
      userId: session.user.id,
      reportId: id,
      type: report.type
    });

    return apiResponse.success(report, { meta: { requestId } });

  } catch (error) {
    logger.error('GET report failed', { requestId, reportId: params.id }, error);
    return apiResponse.internalError('Failed to fetch report', requestId);
  }
}

/**
 * PATCH - Update report metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  
  try {
    const validation = paramsSchema.safeParse(params);
    if (!validation.success) {
      return apiResponse.validationError(
        'Invalid report ID',
        validation.error.errors,
        requestId
      );
    }

    const { id } = validation.data;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    const rateLimitResult = await checkLimit(
      apiRateLimiter, 
      30, 
      `report-update:${session.user.id}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(120, requestId);
    }

    // Check ownership
    const existingReport = await checkReportOwnership(id, session.user.id);
    if (!existingReport) {
      return apiResponse.notFound('Report', requestId);
    }

    // Parse update data
    const body = await request.json();
    const updateValidation = updateReportSchema.safeParse(body);

    if (!updateValidation.success) {
      return apiResponse.validationError(
        'Invalid update data',
        updateValidation.error.errors,
        requestId
      );
    }

    const updateData = updateValidation.data;

    // Update report
    const updatedReport = await prisma.report.update({
      where: { id },
      data: updateData
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: AuditAction.UPDATE,
        category: 'reports',
        entityType: 'report',
        entityId: id,
        description: `Updated report: ${existingReport.title}`,
        oldValue: { 
          title: existingReport.title, 
          summary: existingReport.summary, 
          status: existingReport.status 
        },
        newValue: updateData,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent'),
      }
    });

    logger.info('Report updated', {
      requestId,
      userId: session.user.id,
      reportId: id,
      changes: Object.keys(updateData)
    });

    return apiResponse.success(updatedReport, { meta: { requestId } });

  } catch (error) {
    logger.error('PATCH report failed', { requestId, reportId: params.id }, error);
    return apiResponse.internalError('Failed to update report', requestId);
  }
}

/**
 * POST - Regenerate report (or perform other actions)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    const validation = paramsSchema.safeParse(params);
    if (!validation.success) {
      return apiResponse.validationError(
        'Invalid report ID',
        validation.error.errors,
        requestId
      );
    }

    const { id } = validation.data;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // Stricter rate limiting for regeneration
    const rateLimitResult = await checkLimit(
      apiRateLimiter, 
      5, 
      `report-regenerate:${session.user.id}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(600, requestId); // 10 min timeout
    }

    // Check ownership
    const existingReport = await checkReportOwnership(id, session.user.id);
    if (!existingReport) {
      return apiResponse.notFound('Report', requestId);
    }

    // Parse regeneration config
    const body = await request.json();
    const configValidation = regenerateSchema.safeParse(body);

    if (!configValidation.success) {
      return apiResponse.validationError(
        'Invalid regeneration config',
        configValidation.error.errors,
        requestId
      );
    }

    const { force, updateConfig } = configValidation.data;

    // Check if report is too recent to regenerate (unless forced)
    if (!force) {
      const hoursSinceGeneration = (Date.now() - existingReport.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceGeneration < 1) {
        return apiResponse.validationError(
          'Report was generated recently. Use force=true to override',
          [{ path: ['force'], message: 'Report too recent to regenerate' }],
          requestId
        );
      }
    }

    // Mark as regenerating
    await prisma.report.update({
      where: { id },
      data: { status: 'generating' }
    });

    try {
      // Regenerate report data
      const newReportData = await regenerateReportData(
        id, 
        session.user.id, 
        updateConfig
      );

      // Update summary
      const newSummary = `Regenerated: ${newReportData.stats.totalProblems} problems solved, ` +
        `${newReportData.stats.daysActive}/${newReportData.stats.totalDays} days active.`;

      // Update report with new data
      const updatedReport = await prisma.report.update({
        where: { id },
        data: {
          data: newReportData,
          summary: newSummary,
          status: 'generated'
        }
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: AuditAction.UPDATE,
          category: 'reports',
          entityType: 'report',
          entityId: id,
          description: `Regenerated report: ${existingReport.title}`,
          newValue: { 
            regenerated: true, 
            stats: newReportData.stats,
            force 
          },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
          userAgent: request.headers.get('user-agent'),
        }
      });

      logger.info('Report regenerated', {
        requestId,
        userId: session.user.id,
        reportId: id,
        duration: Date.now() - startTime,
        force
      });

      return apiResponse.success({
        report: updatedReport,
        regenerated: true,
        stats: newReportData.stats,
        message: 'Report regenerated successfully'
      }, { meta: { requestId } });

    } catch (regenerationError) {
      // Mark as failed
      await prisma.report.update({
        where: { id },
        data: { status: 'failed' }
      });

      logger.error('Report regeneration failed', {
        requestId,
        reportId: id
      }, regenerationError);

      throw regenerationError;
    }

  } catch (error) {
    logger.error('POST report regenerate failed', { requestId, reportId: params.id }, error);
    return apiResponse.internalError('Failed to regenerate report', requestId);
  }
}

/**
 * DELETE - Delete report
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  
  try {
    const validation = paramsSchema.safeParse(params);
    if (!validation.success) {
      return apiResponse.validationError(
        'Invalid report ID',
        validation.error.errors,
        requestId
      );
    }

    const { id } = validation.data;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    const rateLimitResult = await checkLimit(
      apiRateLimiter, 
      20, 
      `report-delete:${session.user.id}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(180, requestId);
    }

    // Check ownership
    const existingReport = await checkReportOwnership(id, session.user.id);
    if (!existingReport) {
      return apiResponse.notFound('Report', requestId);
    }

    // Delete report
    await prisma.report.delete({
      where: { id }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: AuditAction.DELETE,
        category: 'reports',
        entityType: 'report',
        entityId: id,
        description: `Deleted report: ${existingReport.title}`,
        oldValue: {
          title: existingReport.title,
          type: existingReport.type,
          periodStart: existingReport.periodStart,
          periodEnd: existingReport.periodEnd
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent'),
      }
    });

    logger.info('Report deleted', {
      requestId,
      userId: session.user.id,
      reportId: id,
      title: existingReport.title
    });

    return apiResponse.success(
      { message: 'Report deleted successfully' },
      { meta: { requestId } }
    );

  } catch (error) {
    logger.error('DELETE report failed', { requestId, reportId: params.id }, error);
    return apiResponse.internalError('Failed to delete report', requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';