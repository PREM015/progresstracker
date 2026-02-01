// src/app/api/analytics/export/route.ts

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import apiResponse, { withErrorHandler } from '@/lib/apiResponse';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { ExportService } from '@/services/exportService';
import { prisma } from '@/lib/prisma';
import { ExportStatus, PlatformCategory } from '@prisma/client';
import {
  fromPrismaExportFormat,
  fromPrismaExportStatus,
  toPrismaExportFormat,
} from '@/types/export';

const log = logger.child({ module: 'api.analytics.export' });

// Validation schemas
const exportSchema = z.object({
  format: z.enum(['csv', 'json', 'pdf', 'excel', 'xml']).default('csv'),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  platforms: z.array(z.string()).optional(),

  // IMPORTANT: Prisma expects enum values, not plain string[]
  categories: z.array(z.nativeEnum(PlatformCategory)).optional(),

  includeNotes: z.boolean().optional().default(true),
  includeStats: z.boolean().optional().default(true),
  includeGoals: z.boolean().optional().default(false),
  includeAchievements: z.boolean().optional().default(false),
  includePlatforms: z.boolean().optional().default(false),
});

type ExportParams = z.infer<typeof exportSchema>;

/**
 * GET /api/analytics/export
 * Get user's export history
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const startTime = Date.now();

  // Authentication check
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    log.warn('Unauthorized export history request');
    // IMPORTANT: must return SUCCESS type because withErrorHandler expects success
    return apiResponse.success([], { 
      status: 401, 
      message: 'Authentication required' 
    });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, parseInt(searchParams.get('limit') || '10'));
  const statusParam = searchParams.get('status');

  const status = statusParam ? (statusParam as ExportStatus) : null;

  log.info('Fetching export history', { userId, page, limit, status });

  // Build where clause
  const where: { userId: string; status?: ExportStatus } = { userId };
  if (status) where.status = status;

  // Fetch export jobs
  const [exportJobs, total] = await Promise.all([
    prisma.exportJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.exportJob.count({ where }),
  ]);

  // Transform to response format
  const exports = exportJobs.map((job) => ({
    id: job.id,
    name: job.name,
    format: fromPrismaExportFormat(job.format),
    status: fromPrismaExportStatus(job.status),
    progress: job.progress,
    dateFrom: job.dateFrom?.toISOString(),
    dateTo: job.dateTo?.toISOString(),
    fileUrl: job.fileUrl,
    fileName: job.fileName,
    fileSize: job.fileSize,
    totalRecords: job.totalRecords,
    exportedRecords: job.exportedRecords,
    hasError: job.hasError,
    errorMessage: job.errorMessage,
    expiresAt: job.expiresAt?.toISOString(),
    createdAt: job.createdAt.toISOString(),
    completedAt: job.completedAt?.toISOString(),
  }));

  const duration = Date.now() - startTime;
  log.info('Export history fetched successfully', {
    userId,
    count: exports.length,
    duration,
  });

  return apiResponse.paginated(exports, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPreviousPage: page > 1,
  });
});

/**
 * POST /api/analytics/export
 * Create new export job
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const startTime = Date.now();

  // Authentication check
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    log.warn('Unauthorized export request');
    // IMPORTANT: must return SUCCESS type because withErrorHandler expects success
    return apiResponse.success(
      { id: '', status: 'unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  const body = await req.json();

  // Validate request body
  const validationResult = exportSchema.safeParse(body);
  if (!validationResult.success) {
    log.warn('Invalid export parameters', {
      userId,
      errors: validationResult.error.flatten(),
    });

    // IMPORTANT: withErrorHandler expects success type
    // So return "success" but with 400 status and include errors
    return apiResponse.success(
      {
        id: '',
        status: 'validation_error',
        message: 'Invalid export parameters',
        errors: validationResult.error.issues,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      { status: 400, message: 'Invalid export parameters' }
    );
  }

  const params = validationResult.data;

  // Check subscription limits
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);

  const monthlyExports = await prisma.exportJob.count({
    where: {
      userId,
      createdAt: { gte: currentMonth },
    },
  });

  const exportLimit = user?.subscription?.exportLimitMonthly || 3;

  if (monthlyExports >= exportLimit) {
    log.warn('Export limit exceeded', {
      userId,
      limit: exportLimit,
      current: monthlyExports,
    });

    // IMPORTANT: return success type with 403 status
    return apiResponse.success(
      {
        id: '',
        status: 'limit_exceeded',
        message: `Monthly export limit (${exportLimit}) reached. Upgrade your plan for more exports.`,
      },
      { status: 403 }
    );
  }

  log.info('Creating export job', {
    userId,
    format: params.format,
    dateRange: { from: params.dateFrom, to: params.dateTo },
  });

  // Create export job
  const exportJob = await prisma.exportJob.create({
    data: {
      userId,
      name: `${params.format.toUpperCase()} Export - ${new Date().toLocaleDateString()}`,
      format: toPrismaExportFormat(params.format),
      dateFrom: params.dateFrom ? new Date(params.dateFrom) : null,
      dateTo: params.dateTo ? new Date(params.dateTo) : null,
      platforms: params.platforms || [],
      categories: params.categories || [],
      includeNotes: params.includeNotes,
      includeStats: params.includeStats,
      includeGoals: params.includeGoals,
      includeAchievements: params.includeAchievements,
      includePlatforms: params.includePlatforms,
      status: 'PENDING',
      progress: 0,
      hasError: false,
      totalRecords: 0,
      exportedRecords: 0,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  // Start export process asynchronously
  processExportJob(exportJob.id, userId, params).catch((error) => {
    log.error('Export processing failed', { jobId: exportJob.id, userId }, error);
  });

  const duration = Date.now() - startTime;
  log.info('Export job created successfully', {
    jobId: exportJob.id,
    userId,
    duration,
  });

  return apiResponse.created(
    {
      id: exportJob.id,
      status: 'pending',
      message: 'Export job created. Processing will begin shortly.',
    },
    {
      meta: {
        format: params.format,
        executionTime: duration,
      },
    }
  );
});

/**
 * Process export job asynchronously
 */
async function processExportJob(
  jobId: string,
  userId: string,
  params: ExportParams
): Promise<void> {
  const processingLog = logger.child({
    module: 'export.processing',
    jobId,
    userId,
  });

  try {
    processingLog.info('Starting export processing');

    // Update status to processing
    await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
        progress: 10,
      },
    });

    // Prepare export options
    // NOTE: ExportService might only support csv/json/pdf
    // If excel/xml are selected, fallback to csv safely.
    const normalizedFormat =
      params.format === 'excel' || params.format === 'xml' ? 'csv' : params.format;

    const exportOptions = {
      format: normalizedFormat as 'csv' | 'json' | 'pdf',
      type: 'full' as const,
      dateRange:
        params.dateFrom && params.dateTo
          ? ('custom' as const)
          : ('all_time' as const),
      startDate: params.dateFrom ? new Date(params.dateFrom) : undefined,
      endDate: params.dateTo ? new Date(params.dateTo) : undefined,
      includeTracker: true,
      includeGoals: params.includeGoals,
      includeAchievements: params.includeAchievements,
      includePlatforms: params.includePlatforms,
      includeStats: params.includeStats,
      includeNotes: params.includeNotes,
      platforms: params.platforms,
      categories: params.categories,
    };

    // Update progress
    await prisma.exportJob.update({
      where: { id: jobId },
      data: { progress: 30 },
    });

    // Generate export
    const result = await ExportService.exportData(userId, exportOptions);

    if (!result.success) {
      throw new Error(result.error || 'Export failed');
    }

    // Update progress
    await prisma.exportJob.update({
      where: { id: jobId },
      data: { progress: 80 },
    });

    // Store file (in production, upload to cloud storage)
    const fileUrl = `/api/analytics/export/download/${jobId}`;
    const fileData = result.data as string;
    const fileSize = Buffer.byteLength(fileData, 'utf8');

    // Complete export job
    await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        completedAt: new Date(),
        fileUrl,
        fileName: result.fileName,
        fileSize,
        fileMimeType: result.mimeType,
        totalRecords: result.recordCount || 0,
        exportedRecords: result.recordCount || 0,
      },
    });

    processingLog.info('Export processing completed successfully');
  } catch (error) {
    processingLog.error('Export processing failed', { error });

    await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      },
    });
  }
}
