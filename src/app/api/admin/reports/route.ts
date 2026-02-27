// src/app/api/admin/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { generateAndSaveReport } from '@/lib/pdf-generator';
// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 100;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION
// =============================================================================

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['weekly', 'monthly', 'yearly', 'custom']).optional(),
  status: z.enum(['generating', 'generated', 'sent', 'failed']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'periodStart']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const generateSchema = z.object({
  type: z.enum(['weekly', 'monthly', 'yearly', 'custom']),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  userIds: z.array(z.string().cuid()).optional(),
});

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(response: NextResponse, requestId: string, rateLimitResult?: { limit: number; remaining: number }): NextResponse {
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

async function validateAdminSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `admin-reports:${ip}`);

  if (!rateLimitResult.success) {
    return { error: apiResponse.rateLimited(60, requestId), session: null, rateLimitResult };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: apiResponse.unauthorized('Authentication required', requestId), session: null, rateLimitResult };
  }

  const isAdmin = Boolean(session.user.isAdmin || session.user.role === 'admin');

  if (!isAdmin) {
    return { error: apiResponse.forbidden('Admin access required', requestId), session: null, rateLimitResult };
  }

  return { error: null, session, rateLimitResult };
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

// =============================================================================
// HEAD
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return new NextResponse(null, { status: 403 });
    }

    const [total, sent, failed] = await Promise.all([
      prisma.report.count(),
      prisma.report.count({ where: { status: 'sent' } }),
      prisma.report.count({ where: { status: 'failed' } }),
    ]);

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Total-Count': String(total),
        'X-Sent-Count': String(sent),
        'X-Failed-Count': String(failed),
      },
    });

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD admin reports failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - List reports
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      type: searchParams.get('type') || undefined,
      status: searchParams.get('status') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { page, limit, type, status, dateFrom, dateTo, sortBy, sortOrder } = queryValidation.data;

    const where: Prisma.ReportWhereInput = {};

    if (type) where.type = type;
    if (status) where.status = status;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
      }),
      prisma.report.count({ where }),
    ]);

    logger.info('Reports fetched', {
      total,
      page,
      filters: { type, status },
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.paginated(
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

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET admin reports failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch reports', requestId), requestId);
  }
}

// =============================================================================
// POST - Generate reports
// =============================================================================

// Update the POST handler in reports/route.ts



// Replace the POST function's report generation section:

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);
    if (error) return addHeaders(error, requestId, rateLimitResult);

    const body = await request.json();
    const validation = generateSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { type, periodStart, periodEnd, userIds } = validation.data;

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    // Get users
    const users = userIds
      ? await prisma.user.findMany({ where: { id: { in: userIds } } })
      : await prisma.user.findMany({ where: { isActive: true }, take: 100 }); // Limit for safety

    // Queue report generation with background job
    const reportPromises = users.map(async (user) => {
      try {
        const result = await generateAndSaveReport(user.id, start, end, type);

        // Update status to generated
        await prisma.report.update({
          where: { id: result.reportId },
          data: { status: 'generated' },
        });

        return result.reportId;
      } catch (error) {
        logger.error('Report generation failed for user', { userId: user.id }, error);

        // Create failed report record
        const failedReport = await prisma.report.create({
          data: {
            userId: user.id,
            type,
            periodStart: start,
            periodEnd: end,
            title: `${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
            summary: 'Report generation failed',
            data: {} as Prisma.InputJsonValue,
            status: 'failed',
          },
        });

        return failedReport.id;
      }
    });

    const reportIds = await Promise.all(reportPromises);

    logger.info('Reports generation completed', {
      count: reportIds.length,
      type,
      adminId: session!.user.id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        message: `Generated ${reportIds.length} reports`,
        reportIds,
        count: reportIds.length,
      },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST admin reports failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to generate reports', requestId), requestId);
  }
}
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';