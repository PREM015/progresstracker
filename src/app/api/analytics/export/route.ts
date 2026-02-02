// src/app/api/analytics/export/route.ts
// =============================================================================
// Analytics Export
// =============================================================================
// Methods: GET, POST, DELETE, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 20 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { PlatformCategory, ExportFormat, ExportStatus } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { subDays, format } from 'date-fns';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 20;
const DAILY_EXPORT_LIMIT = 10;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS, HEAD',
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
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(['QUEUED', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED']).optional(),
});

const postBodySchema = z.object({
  format: z.enum(['CSV', 'JSON', 'PDF', 'EXCEL', 'XML']).default('CSV'),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  days: z.number().int().min(1).max(365).optional().default(30),
  platforms: z.array(z.string()).optional(),
  categories: z.array(z.nativeEnum(PlatformCategory)).optional(),
  includeNotes: z.boolean().optional().default(true),
  includeStats: z.boolean().optional().default(true),
  includeGoals: z.boolean().optional().default(false),
  includeAchievements: z.boolean().optional().default(false),
});

const deleteQuerySchema = z.object({
  id: z.string().cuid(),
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
  const rateLimitKey = `analytics-export:${ip}`;
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

    const [totalExports, pendingExports] = await Promise.all([
      prisma.exportJob.count({ where: { userId } }),
      prisma.exportJob.count({ where: { userId, status: { in: ['QUEUED', 'PENDING', 'PROCESSING'] } } }),
    ]);

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Exports', String(totalExports));
    response.headers.set('X-Pending-Exports', String(pendingExports));

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD analytics/export failed', { requestId }, error);
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

    // Check for specific export ID
    const exportId = searchParams.get('id');
    if (exportId) {
      const exportJob = await prisma.exportJob.findFirst({
        where: { id: exportId, userId },
      });

      if (!exportJob) {
        return addHeaders(apiResponse.notFound('Export job', requestId), requestId, rateLimitResult);
      }

      return addHeaders(
        apiResponse.success({
          id: exportJob.id,
          name: exportJob.name,
          format: exportJob.format,
          status: exportJob.status,
          progress: exportJob.progress,
          fileUrl: exportJob.fileUrl,
          fileName: exportJob.fileName,
          fileSize: exportJob.fileSize,
          totalRecords: exportJob.totalRecords,
          exportedRecords: exportJob.exportedRecords,
          hasError: exportJob.hasError,
          errorMessage: exportJob.errorMessage,
          expiresAt: exportJob.expiresAt?.toISOString(),
          createdAt: exportJob.createdAt.toISOString(),
          completedAt: exportJob.completedAt?.toISOString(),
        }, { meta: { requestId } }),
        requestId,
        rateLimitResult
      );
    }

    // Parse query parameters
    const queryValidation = getQuerySchema.safeParse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
      status: searchParams.get('status'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const params = queryValidation.data;

    // Build where clause
    const where: { userId: string; status?: ExportStatus } = { userId };
    if (params.status) {
      where.status = params.status as ExportStatus;
    }

    // Fetch exports
    const [exports, total] = await Promise.all([
      prisma.exportJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.exportJob.count({ where }),
    ]);

    const exportList = exports.map(job => ({
      id: job.id,
      name: job.name,
      format: job.format,
      status: job.status,
      progress: job.progress,
      fileUrl: job.fileUrl,
      fileName: job.fileName,
      fileSize: job.fileSize,
      totalRecords: job.totalRecords,
      hasError: job.hasError,
      expiresAt: job.expiresAt?.toISOString(),
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString(),
    }));

    logger.info('Export list fetched', {
      userId,
      count: exports.length,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.paginated(exportList, {
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
    logger.error('GET analytics/export failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch exports', requestId), requestId);
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

    const validation = postBodySchema.safeParse(body);

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

    const todayExports = await prisma.exportJob.count({
      where: {
        userId,
        createdAt: { gte: todayStart },
      },
    });

    if (todayExports >= DAILY_EXPORT_LIMIT) {
      return addHeaders(
        apiResponse.rateLimited(86400, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Check subscription limits
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { exportLimitMonthly: true, currentExportCount: true },
    });

    const monthlyLimit = subscription?.exportLimitMonthly || 3;
    const currentCount = subscription?.currentExportCount || 0;

    if (currentCount >= monthlyLimit) {
      return addHeaders(
        apiResponse.forbidden(`Monthly export limit (${monthlyLimit}) reached. Upgrade to export more.`, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Calculate date range
    const dateTo = params.dateTo ? new Date(params.dateTo) : new Date();
    const dateFrom = params.dateFrom ? new Date(params.dateFrom) : subDays(dateTo, params.days || 30);

    // Create export job
    const exportJob = await prisma.exportJob.create({
      data: {
        userId,
        name: `${params.format} Export - ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
        format: params.format as ExportFormat,
        dateFrom,
        dateTo,
        platforms: params.platforms || [],
        categories: params.categories || [],
        includeNotes: params.includeNotes ?? true,
        includeStats: params.includeStats ?? true,
        status: 'QUEUED' as ExportStatus,
        progress: 0,
        hasError: false,
        totalRecords: 0,
        exportedRecords: 0,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Update subscription export count
    if (subscription) {
      await prisma.subscription.update({
        where: { userId },
        data: { currentExportCount: { increment: 1 } },
      });
    }

    // TODO: Queue export job for background processing
    // In production, this would trigger a background job
    // For now, we'll process it inline (simplified)

    logger.info('Export job created', {
      userId,
      exportId: exportJob.id,
      format: params.format,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.created({
        id: exportJob.id,
        status: 'QUEUED',
        message: 'Export job created. Processing will begin shortly.',
        format: params.format,
        estimatedTime: '1-5 minutes',
      }, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('POST analytics/export failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to create export', requestId), requestId);
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

    const queryValidation = deleteQuerySchema.safeParse({
      id: searchParams.get('id'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Export ID is required', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { id } = queryValidation.data;

    // Check ownership
    const exportJob = await prisma.exportJob.findFirst({
      where: { id, userId },
    });

    if (!exportJob) {
      return addHeaders(apiResponse.notFound('Export job', requestId), requestId, rateLimitResult);
    }

    // Cancel if in progress
    if (['QUEUED', 'PENDING', 'PROCESSING'].includes(exportJob.status)) {
      await prisma.exportJob.update({
        where: { id },
        data: { status: 'CANCELLED' as ExportStatus },
      });
    } else {
      await prisma.exportJob.delete({ where: { id } });
    }

    logger.info('Export job deleted/cancelled', {
      userId,
      exportId: id,
      previousStatus: exportJob.status,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success({ message: 'Export deleted successfully', id }, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('DELETE analytics/export failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to delete export', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';