// src/app/api/analytics/report/route.ts
// =============================================================================
// Analytics Reports
// =============================================================================
// Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
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
import { reportService } from '@/services/analytics/reportService';


// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;
const DAILY_REPORT_LIMIT = 10;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const getQuerySchema = z.object({
  id: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  page: z.coerce.number().int().min(1).default(1),
  type: z.enum(['weekly', 'monthly', 'yearly', 'custom']).optional(),
});

const createBodySchema = z.object({
  type: z.enum(['weekly', 'monthly', 'yearly', 'custom']),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  sendEmail: z.boolean().optional().default(false),
  title: z.string().max(200).optional(),
});

const updateBodySchema = z.object({
  title: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  isPublic: z.boolean().optional(),
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
  const rateLimitKey = `analytics-report:${ip}`;
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
      return addHeaders(new NextResponse(null, { status: 401 }), requestId, rateLimitResult);
    }

    const userId = session!.user.id;
    const reportCount = await prisma.report.count({ where: { userId } });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Reports', String(reportCount));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD analytics/report failed', { requestId }, error);
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

    // Parse query parameters
    const queryValidation = getQuerySchema.safeParse({
      id: searchParams.get('id'),
      limit: searchParams.get('limit') || '10',
      page: searchParams.get('page') || '1',
      type: searchParams.get('type'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const params = queryValidation.data;

    // Get single report by ID
    if (params.id) {
      const report = await reportService.getById(params.id, userId);

      if (!report) {
        return addHeaders(apiResponse.notFound('Report', requestId), requestId, rateLimitResult);
      }

      return addHeaders(
        apiResponse.success(report, { meta: { requestId } }),
        requestId,
        rateLimitResult
      );
    }

    // Get reports list
    const skip = (params.page - 1) * params.limit;
    const reports = await reportService.getAll(userId, params.limit, skip);
    const total = await reportService.getCount(userId, params.type);

    // Filter by type if specified
    const filteredReports = params.type
      ? reports.filter(r => r.type === params.type)
      : reports;

    logger.info('Reports fetched', {
      userId,
      count: filteredReports.length,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.paginated(filteredReports, {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
        hasNextPage: params.page * params.limit < total,
        hasPreviousPage: params.page > 1,
      }, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('GET analytics/report failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch reports', requestId), requestId);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const validation = createBodySchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const params = validation.data;

    // Check daily limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayReports = await reportService.getCountSince(userId, todayStart);

    if (todayReports >= DAILY_REPORT_LIMIT) {
      return addHeaders(
        apiResponse.rateLimited(86400, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Validate custom period dates
    if (params.type === 'custom' && (!params.periodStart || !params.periodEnd)) {
      return addHeaders(
        apiResponse.validationError('Custom reports require periodStart and periodEnd', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Generate report
    const report = await reportService.create({
      type: params.type,
      periodStart: params.periodStart ? new Date(params.periodStart) : undefined,
      periodEnd: params.periodEnd ? new Date(params.periodEnd) : undefined,
      sendEmail: params.sendEmail,
    }, userId);

    logger.info('Report created', {
      userId,
      reportId: report.id,
      type: params.type,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.created(report, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('POST analytics/report failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to create report', requestId), requestId);
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');

    if (!reportId) {
      return addHeaders(
        apiResponse.validationError('Report ID is required', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Regenerate report
    const existingReport = await reportService.getById(reportId, userId);

    if (!existingReport) {
      return addHeaders(apiResponse.notFound('Report', requestId), requestId, rateLimitResult);
    }

    const regeneratedReport = await reportService.regenerate(reportId, userId);

    logger.info('Report regenerated', {
      userId,
      reportId,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(regeneratedReport, { meta: { requestId, regenerated: true } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('PUT analytics/report failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to regenerate report', requestId), requestId);
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');

    if (!reportId) {
      return addHeaders(
        apiResponse.validationError('Report ID is required', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const validation = updateBodySchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Check ownership
    const existingReport = await reportService.getById(reportId, userId);

    if (!existingReport) {
      return addHeaders(apiResponse.notFound('Report', requestId), requestId, rateLimitResult);
    }

    const updatedReport = await reportService.update(reportId, userId, validation.data);

    logger.info('Report updated', {
      userId,
      reportId,
      updates: Object.keys(validation.data),
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(updatedReport, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('PATCH analytics/report failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update report', requestId), requestId);
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');

    if (!reportId) {
      return addHeaders(
        apiResponse.validationError('Report ID is required', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Check ownership
    const existingReport = await reportService.getById(reportId, userId);

    if (!existingReport) {
      return addHeaders(apiResponse.notFound('Report', requestId), requestId, rateLimitResult);
    }

    await reportService.delete(reportId, userId);

    logger.info('Report deleted', {
      userId,
      reportId,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success({ message: 'Report deleted successfully', id: reportId }, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('DELETE analytics/report failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to delete report', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';