// src/app/api/analytics/report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import apiResponse from '@/lib/apiResponse';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { reportService } from '@/services/analytics/reportService';

const log = logger.child({ module: 'api.analytics.report' });

// Validation schemas
const createReportSchema = z.object({
  type: z.enum(['weekly', 'monthly', 'yearly', 'custom']),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  sendEmail: z.boolean().optional().default(false),
});

const updateReportSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
});

const getReportsSchema = z.object({
  limit: z.coerce.number().min(1).max(50).optional().default(10),
  type: z.enum(['weekly', 'monthly', 'yearly', 'custom']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
});

/**
 * GET /api/analytics/report
 * Get user's reports or specific report by ID
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      log.warn('Unauthorized report request');
      return apiResponse.unauthorized('Authentication required');
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);

    // Check for specific report ID
    const reportId = searchParams.get('id');
    if (reportId) {
      log.info('Fetching specific report', { userId, reportId });

      const report = await reportService.getById(reportId, userId);
      if (!report) {
        log.warn('Report not found', { userId, reportId });
        return apiResponse.notFound('Report');
      }

      const duration = Date.now() - startTime;
      log.info('Report fetched successfully', { userId, reportId, duration });

      return apiResponse.success(report, {
        meta: { executionTime: duration },
      });
    }

    // Extract params for list
    const limit = searchParams.get('limit');
    const type = searchParams.get('type');
    const page = searchParams.get('page');

    // Parse and validate query params for list
    const validationResult = getReportsSchema.safeParse({
      limit: limit ?? undefined,
      type: type ?? undefined,
      page: page ?? undefined,
    });

    if (!validationResult.success) {
      log.warn('Invalid report list parameters', {
        userId,
        errors: validationResult.error.flatten(),
      });
      return apiResponse.validationError(
        'Invalid parameters',
        validationResult.error.issues
      );
    }

    const params = validationResult.data;

    log.info('Fetching reports list', {
      userId,
      limit: params.limit,
      type: params.type,
      page: params.page,
    });

    // Fetch reports with pagination
    const skip = (params.page - 1) * params.limit;
    const reports = await reportService.getAll(userId, params.limit, skip);

    // Filter by type if specified
    const filteredReports = params.type
      ? reports.filter((r) => r.type === params.type)
      : reports;

    // Get total count for pagination
    const totalCount = await reportService.getCount(userId, params.type);

    const duration = Date.now() - startTime;
    log.info('Reports fetched successfully', {
      userId,
      count: filteredReports.length,
      duration,
    });

    return apiResponse.success(
      {
        reports: filteredReports,
        pagination: {
          total: totalCount,
          page: params.page,
          limit: params.limit,
          totalPages: Math.ceil(totalCount / params.limit),
          hasNext: params.page * params.limit < totalCount,
          hasPrev: params.page > 1,
        },
      },
      {
        meta: {
          limit: params.limit,
          type: params.type,
          executionTime: duration,
        },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Error fetching reports', { duration }, error);
    return apiResponse.error(error);
  }
}

/**
 * POST /api/analytics/report
 * Generate a new report
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      log.warn('Unauthorized report generation request');
      return apiResponse.unauthorized('Authentication required');
    }

    const userId = session.user.id;
    const body = await req.json();

    // Validate request body
    const validationResult = createReportSchema.safeParse(body);
    if (!validationResult.success) {
      log.warn('Invalid report creation parameters', {
        userId,
        errors: validationResult.error.flatten(),
      });
      return apiResponse.validationError(
        'Invalid report parameters',
        validationResult.error.issues
      );
    }

    const params = validationResult.data;

    // Validate custom period dates
    if (params.type === 'custom' && (!params.periodStart || !params.periodEnd)) {
      log.warn('Custom report missing period dates', { userId });
      return apiResponse.validationError(
        'Custom reports require periodStart and periodEnd dates'
      );
    }

    // Check rate limiting (max 10 reports per day)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const reportsToday = await reportService.getCountSince(userId, todayStart);
    
    if (reportsToday >= 10) {
      log.warn('Report generation rate limit exceeded', { userId, reportsToday });
      return apiResponse.rateLimited(86400); // 24 hours
    }

    log.info('Generating report', {
      userId,
      type: params.type,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      sendEmail: params.sendEmail,
    });

    // Generate report
    const report = await reportService.create(
      {
        type: params.type,
        periodStart: params.periodStart ? new Date(params.periodStart) : undefined,
        periodEnd: params.periodEnd ? new Date(params.periodEnd) : undefined,
        sendEmail: params.sendEmail,
      },
      userId
    );

    const duration = Date.now() - startTime;
    log.info('Report generated successfully', {
      userId,
      reportId: report.id,
      type: report.type,
      duration,
    });

    return apiResponse.created(report, {
      meta: {
        type: params.type,
        executionTime: duration,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Error generating report', { duration }, error);
    return apiResponse.error(error);
  }
}

/**
 * PATCH /api/analytics/report
 * Update a report (metadata only, not regenerate)
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      log.warn('Unauthorized report update request');
      return apiResponse.unauthorized('Authentication required');
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get('id');

    if (!reportId) {
      log.warn('Report ID missing for update', { userId });
      return apiResponse.validationError('Report ID is required');
    }

    // Check if report exists and belongs to user
    const existingReport = await reportService.getById(reportId, userId);
    if (!existingReport) {
      log.warn('Report not found for update', { userId, reportId });
      return apiResponse.notFound('Report');
    }

    const body = await req.json();

    // Validate request body
    const validationResult = updateReportSchema.safeParse(body);
    if (!validationResult.success) {
      log.warn('Invalid report update parameters', {
        userId,
        reportId,
        errors: validationResult.error.flatten(),
      });
      return apiResponse.validationError(
        'Invalid update parameters',
        validationResult.error.issues
      );
    }

    const params = validationResult.data;

    log.info('Updating report', { userId, reportId, updates: params });

    // Update report
    const updatedReport = await reportService.update(reportId, userId, params);

    const duration = Date.now() - startTime;
    log.info('Report updated successfully', { userId, reportId, duration });

    return apiResponse.success(updatedReport, {
      meta: { executionTime: duration },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Error updating report', { duration }, error);
    return apiResponse.error(error);
  }
}

/**
 * DELETE /api/analytics/report
 * Delete a report
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      log.warn('Unauthorized report deletion request');
      return apiResponse.unauthorized('Authentication required');
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get('id');

    if (!reportId) {
      log.warn('Report ID missing for deletion', { userId });
      return apiResponse.validationError('Report ID is required');
    }

    // Check if report exists and belongs to user
    const existingReport = await reportService.getById(reportId, userId);
    if (!existingReport) {
      log.warn('Report not found for deletion', { userId, reportId });
      return apiResponse.notFound('Report');
    }

    log.info('Deleting report', { userId, reportId });

    await reportService.delete(reportId, userId);

    const duration = Date.now() - startTime;
    log.info('Report deleted successfully', { userId, reportId, duration });

    return apiResponse.success(
      {
        message: 'Report deleted successfully',
        id: reportId,
      },
      {
        meta: { executionTime: duration },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Error deleting report', { duration }, error);
    return apiResponse.error(error);
  }
}

/**
 * PUT /api/analytics/report/regenerate
 * Regenerate an existing report with latest data
 */
export async function PUT(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      log.warn('Unauthorized report regeneration request');
      return apiResponse.unauthorized('Authentication required');
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get('id');

    if (!reportId) {
      log.warn('Report ID missing for regeneration', { userId });
      return apiResponse.validationError('Report ID is required');
    }

    // Check if report exists and belongs to user
    const existingReport = await reportService.getById(reportId, userId);
    if (!existingReport) {
      log.warn('Report not found for regeneration', { userId, reportId });
      return apiResponse.notFound('Report');
    }

    log.info('Regenerating report', { userId, reportId });

    // Regenerate report
    const regeneratedReport = await reportService.regenerate(reportId, userId);

    const duration = Date.now() - startTime;
    log.info('Report regenerated successfully', {
      userId,
      reportId,
      duration,
    });

    return apiResponse.success(regeneratedReport, {
      meta: {
        executionTime: duration,
        regenerated: true,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Error regenerating report', { duration }, error);
    return apiResponse.error(error);
  }
}