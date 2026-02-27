// src/app/api/user/export-data/route.ts
// =============================================================================
// USER DATA EXPORT ROUTES
// =============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { ExportFormat, ExportStatus } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// SCHEMAS
// =============================================================================

const exportSchema = z.object({
  format: z.enum(['JSON', 'CSV', 'PDF', 'EXCEL', 'XML']).default('JSON'),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  platforms: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  includeNotes: z.boolean().default(true),
  includeStats: z.boolean().default(true),
});

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 10;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(response: NextResponse, requestId: string): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);
  return response;
}

async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, ip);

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
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// =============================================================================
// HEAD
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.info('request is ', { request })
      return addHeaders(new NextResponse(null, { status: 401 }), requestId);
    }

    const count = await prisma.exportJob.count({
      where: { userId: session.user.id },
    });

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Export-Count': String(count),
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD export-data failed', { requestId }, error);
    return addHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// GET - List export jobs
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId);

    const userId = session!.user.id;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);

    const [exports, total] = await Promise.all([
      prisma.exportJob.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.exportJob.count({ where: { userId } }),
    ]);

    logger.info('Export jobs fetched', {
      userId,
      count: exports.length,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.paginated(
      exports,
      {
        page,
        limit,


        total,

        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,


      },
      {
        meta: { requestId },
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('GET export-data failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch exports', requestId), requestId);
  }
}

// =============================================================================
// POST - Create new export job
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId);

    const userId = session!.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(apiResponse.validationError('Invalid JSON', undefined, requestId), requestId);
    }

    const validation = exportSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId
      );
    }

    const { format, dateFrom, dateTo, platforms, categories, includeNotes, includeStats } = validation.data;

    // Check subscription limits
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const exportsThisMonth = await prisma.exportJob.count({
      where: {
        userId,
        createdAt: { gte: monthStart },
      },
    });

    const exportLimit = subscription?.exportLimitMonthly || 3;
    if (exportsThisMonth >= exportLimit) {
      return addHeaders(
        apiResponse.rateLimited(
          30 * 24 * 60 * 60, // 30 days
          requestId
        ),
        requestId
      );
    }

    // Create export job
    const exportJob = await prisma.exportJob.create({
      data: {
        userId,
        format: format as ExportFormat,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        platforms,
        categories: categories as any[],
        includeNotes,
        includeStats,
        status: ExportStatus.QUEUED,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Process export job asynchronously
    processExportJob(exportJob.id, userId).catch((err) => {
      logger.error('Export job processing failed', { jobId: exportJob.id, userId }, err);
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'EXPORT_DATA',
        category: 'export',
        entityType: 'exportJob',
        entityId: exportJob.id,
        description: `Export job created: ${format}`,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent'),
      },
    });

    logger.info('Export job created', {
      userId,
      jobId: exportJob.id,
      format,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.created(exportJob, { requestId });
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('POST export-data failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to create export', requestId), requestId);
  }
}

// =============================================================================
// EXPORT PROCESSING FUNCTION
// =============================================================================

async function processExportJob(jobId: string, userId: string): Promise<void> {
  try {
    // Update status to processing
    await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: ExportStatus.PROCESSING,
        startedAt: new Date(),
      },
    });

    const job = await prisma.exportJob.findUnique({ where: { id: jobId } });
    if (!job) return;

    // Build query conditions
    const whereClause: Record<string, unknown> = { userId };
    if (job.dateFrom || job.dateTo) {
      whereClause.date = {};
      if (job.dateFrom) (whereClause.date as Record<string, unknown>).gte = job.dateFrom;
      if (job.dateTo) (whereClause.date as Record<string, unknown>).lte = job.dateTo;
    }
    if (job.platforms.length > 0) {
      whereClause.platformId = { in: job.platforms };
    }
    if (job.categories.length > 0) {
      whereClause.category = { in: job.categories };
    }

    // Fetch data
    const [entries, goals, achievements, platforms] = await Promise.all([
      prisma.trackerEntry.findMany({
        where: whereClause,
        include: {
          platform: { select: { name: true, slug: true } },
        },
        orderBy: { date: 'desc' },
      }),
      job.includeStats
        ? prisma.goal.findMany({
          where: { userId },
          select: {
            title: true,
            description: true,
            target: true,
            progress: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        })
        : [],
      job.includeStats
        ? prisma.userAchievement.findMany({
          where: { userId },
          include: {
            achievement: { select: { title: true, description: true, tier: true } },
          },
        })
        : [],
      prisma.userPlatform.findMany({
        where: { userId, isActive: true },
        include: {
          platform: { select: { name: true, slug: true } },
        },
      }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: { id: userId },
      entries: entries.map((e) => ({
        ...e,
        notes: job.includeNotes ? e.notes : undefined,
      })),
      goals,
      achievements,
      platforms: platforms.map((p) => ({
        platform: p.platform.name,
        username: p.username,
        connectedAt: p.createdAt,
      })),
    };

    // Generate file based on format
    let fileContent: string;
    let mimeType: string;
    let extension: string;

    switch (job.format) {
      case 'JSON':
        fileContent = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
        extension = 'json';
        break;
      case 'CSV':
        fileContent = convertToCSV(entries);
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      default:
        fileContent = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
        extension = 'json';
    }

    const fileName = `export-${userId}-${Date.now()}.${extension}`;
    const fileUrl = `/api/export/download/${jobId}`;

    await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: ExportStatus.COMPLETED,
        completedAt: new Date(),
        totalRecords: entries.length,
        exportedRecords: entries.length,
        fileUrl,
        fileName,
        fileSize: Buffer.byteLength(fileContent, 'utf8'),
        fileMimeType: mimeType,
      },
    });
  } catch (error) {
    await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: ExportStatus.FAILED,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

function convertToCSV(entries: unknown[]): string {
  if (entries.length === 0) return '';

  const typedEntries = entries as Array<{
    date: Date;
    platform?: { name: string };
    problemsSolved: number;
    commits: number;
    timeSpent: number;
    notes?: string;
  }>;

  const headers = ['date', 'platform', 'problemsSolved', 'commits', 'timeSpent', 'notes'];

  const rows = typedEntries.map((e) => [
    e.date.toISOString().split('T')[0],
    e.platform?.name || '',
    e.problemsSolved,
    e.commits,
    e.timeSpent,
    `"${(e.notes || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';