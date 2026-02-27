// src/app/api/export/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ExportService } from '@/services/exportService';
import { stripeService } from '@/services/stripeService';
import type { 
  ExportFormat as PrismaExportFormat, 
  ExportStatus as PrismaExportStatus, 
  PlatformCategory 
} from '@prisma/client';
import type { ExportOptions, ExportFormat } from '@/types/export';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createExportSchema = z.object({
  format: z.enum(['CSV', 'JSON', 'PDF', 'EXCEL', 'XML']),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  platforms: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  includeNotes: z.boolean().default(true),
  includeStats: z.boolean().default(true),
  name: z.string().max(100).optional(),
});

// =============================================================================
// TYPE HELPERS
// =============================================================================

/**
 * Convert Prisma ExportFormat to lowercase format used by ExportService
 */
function toLowercaseFormat(format: PrismaExportFormat): ExportFormat {
  return format.toLowerCase() as ExportFormat;
}

/**
 * Build ExportOptions with all required fields
 */
function buildExportOptions(
  format: ExportFormat,
  startDate?: Date,
  endDate?: Date,
  includeStats?: boolean,
  includeNotes?: boolean
): ExportOptions {
  return {
    format,
    type: 'full',
    dateRange: startDate && endDate ? 'custom' : 'all_time',
    startDate,
    endDate,
    includeGoals: true,
    includeAchievements: true,
    includePlatforms: true,
    includeStats: includeStats ?? true,
    includeTracker: true,
    includeNotes: includeNotes ?? true,
    includeMetadata: true,
  };
}

/**
 * Calculate byte length from export data safely
 */
function calculateDataSize(data: string | Buffer | Blob | undefined): number | null {
  if (!data) return null;
  
  if (typeof data === 'string') {
    return Buffer.byteLength(data, 'utf8');
  }
  
  if (Buffer.isBuffer(data)) {
    return data.byteLength;
  }
  
  if (data instanceof Blob) {
    return data.size;
  }
  
  return null;
}

// =============================================================================
// GET - Get export options and history
// =============================================================================

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const log = logger.child({ route: 'GET /api/export' });

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      log.warn('Unauthorized export access');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const includeHistory = searchParams.get('history') === 'true';
    const historyLimit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    log.debug('Getting export options', { userId: session.user.id, includeHistory });

    // Get subscription limits
    const limits = await stripeService.getTierLimits(session.user.id);

    // Get export history if requested
    let history: Array<{
      id: string;
      name: string | null;
      format: PrismaExportFormat;
      status: PrismaExportStatus;
      progress: number;
      fileUrl: string | null;
      fileName: string | null;
      fileSize: number | null;
      totalRecords: number;
      exportedRecords: number;
      createdAt: Date;
      completedAt: Date | null;
      expiresAt: Date | null;
    }> = [];

    if (includeHistory) {
      history = await prisma.exportJob.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: historyLimit,
        select: {
          id: true,
          name: true,
          format: true,
          status: true,
          progress: true,
          fileUrl: true,
          fileName: true,
          fileSize: true,
          totalRecords: true,
          exportedRecords: true,
          createdAt: true,
          completedAt: true,
          expiresAt: true,
        },
      });
    }

    // Get available platforms for export
    const userPlatforms = await prisma.userPlatform.findMany({
      where: { userId: session.user.id, isActive: true },
      include: {
        platform: {
          select: { id: true, name: true, slug: true, category: true },
        },
      },
    });

    // Check if user can export
    const canExport = await stripeService.canExport(session.user.id);

    log.info('Export options retrieved', {
      userId: session.user.id,
      canExport,
      historyCount: history.length,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      formats: ['CSV', 'JSON', 'PDF'] as PrismaExportFormat[],
      options: {
        includeGoals: true,
        includeAchievements: true,
        includePlatforms: true,
        includeStats: true,
        includeNotes: true,
      },
      platforms: userPlatforms.map(up => ({
        id: up.platform.id,
        name: up.platform.name,
        slug: up.platform.slug,
        category: up.platform.category,
      })),
      categories: [
        'DSA', 'JOB', 'GIT', 'LEARNING', 'HACKATHON',
        'OPENSOURCE', 'COMPANY', 'DESIGN', 'DATA_SCIENCE', 'OTHER',
      ] as PlatformCategory[],
      limits: {
        monthlyLimit: limits.exportLimitMonthly,
        currentCount: limits.currentExportCount,
        canExport,
        remaining: limits.exportLimitMonthly === -1
          ? 'unlimited'
          : Math.max(0, limits.exportLimitMonthly - limits.currentExportCount),
      },
      history,
    });
  } catch (error) {
    log.error(
      'Failed to get export options',
      { duration: Date.now() - startTime },
      error
    );

    return NextResponse.json(
      { success: false, error: 'Failed to fetch export options' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Create export job
// =============================================================================

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const log = logger.child({ route: 'POST /api/export' });

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      log.warn('Unauthorized export attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validated = createExportSchema.parse(body);

    log.info('Export requested', {
      userId: session.user.id,
      format: validated.format,
    });

    // Check export limits
    const canExport = await stripeService.canExport(session.user.id);
    if (!canExport) {
      log.warn('Export limit reached', { userId: session.user.id });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Monthly export limit reached',
          code: 'EXPORT_LIMIT_REACHED',
        },
        { status: 403 }
      );
    }

    // Validate categories
    const validCategoryValues = [
      'DSA', 'JOB', 'GIT', 'LEARNING', 'HACKATHON', 
      'OPENSOURCE', 'COMPANY', 'DESIGN', 'DATA_SCIENCE', 'OTHER'
    ];
    const validCategories = validated.categories.filter(c =>
      validCategoryValues.includes(c)
    ) as PlatformCategory[];

    // Create export job - matches ExportJob model in schema
    const exportJob = await prisma.exportJob.create({
      data: {
        userId: session.user.id,
        name: validated.name || `Export ${new Date().toISOString().split('T')[0]}`,
        format: validated.format as PrismaExportFormat,
        dateFrom: validated.dateFrom ? new Date(validated.dateFrom) : null,
        dateTo: validated.dateTo ? new Date(validated.dateTo) : null,
        platforms: validated.platforms,
        categories: validCategories,
        includeNotes: validated.includeNotes,
        includeStats: validated.includeStats,
        status: 'QUEUED',
        progress: 0,
        totalRecords: 0,
        exportedRecords: 0,
        hasError: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Increment export count
    await stripeService.incrementExportCount(session.user.id);

    // Create audit log - matches AuditLog model in schema
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'EXPORT_DATA',
        category: 'export',
        entityType: 'exportJob',
        entityId: exportJob.id,
        description: `Created ${validated.format} export job`,
        status: 'success',
      },
    });

    log.info('Export job created', {
      userId: session.user.id,
      exportJobId: exportJob.id,
      format: validated.format,
      duration: Date.now() - startTime,
    });

    // For now, process synchronously for simple exports
    if (validated.format === 'JSON' || validated.format === 'CSV') {
      // Process immediately for quick formats
      processExportJob(exportJob.id, session.user.id).catch(err => {
        log.error('Background export failed', { exportJobId: exportJob.id }, err);
      });
    }

    return NextResponse.json(
      {
        success: true,
        exportJob: {
          id: exportJob.id,
          status: exportJob.status,
          format: exportJob.format,
          createdAt: exportJob.createdAt,
        },
        message: 'Export job created. You will be notified when it\'s ready.',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      log.warn('Invalid export request', { errors: error.errors });
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    log.error(
      'Failed to create export job',
      { duration: Date.now() - startTime },
      error
    );

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create export job',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Cancel/delete export job
// =============================================================================

export async function DELETE(req: NextRequest) {
  const startTime = Date.now();
  const log = logger.child({ route: 'DELETE /api/export' });

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      log.warn('Unauthorized export delete attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const exportId = searchParams.get('id');

    if (!exportId) {
      return NextResponse.json(
        { success: false, error: 'Export ID required' },
        { status: 400 }
      );
    }

    log.info('Deleting export job', { userId: session.user.id, exportId });

    // Verify ownership
    const exportJob = await prisma.exportJob.findFirst({
      where: {
        id: exportId,
        userId: session.user.id,
      },
    });

    if (!exportJob) {
      log.warn('Export job not found', { exportId });
      return NextResponse.json(
        { success: false, error: 'Export job not found' },
        { status: 404 }
      );
    }

    // Update status if in progress
    if (exportJob.status === 'PROCESSING' || exportJob.status === 'QUEUED') {
      await prisma.exportJob.update({
        where: { id: exportId },
        data: { status: 'CANCELLED' },
      });
    } else {
      // Delete completed/failed jobs
      await prisma.exportJob.delete({
        where: { id: exportId },
      });
    }

    log.info('Export job deleted/cancelled', {
      exportId,
      previousStatus: exportJob.status,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      message: exportJob.status === 'PROCESSING' || exportJob.status === 'QUEUED'
        ? 'Export cancelled'
        : 'Export deleted',
    });
  } catch (error) {
    log.error(
      'Failed to delete export job',
      { duration: Date.now() - startTime },
      error
    );

    return NextResponse.json(
      { success: false, error: 'Failed to delete export' },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function processExportJob(exportJobId: string, userId: string): Promise<void> {
  const log = logger.child({ exportJobId, userId });

  try {
    // Update status to processing
    await prisma.exportJob.update({
      where: { id: exportJobId },
      data: { 
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    const exportJob = await prisma.exportJob.findUnique({
      where: { id: exportJobId },
    });

    if (!exportJob) {
      throw new Error('Export job not found');
    }

    // Convert Prisma format to lowercase for ExportService
    const formatLower = toLowercaseFormat(exportJob.format);

    // Build proper ExportOptions
    const exportOptions = buildExportOptions(
      formatLower,
      exportJob.dateFrom || undefined,
      exportJob.dateTo || undefined,
      exportJob.includeStats,
      exportJob.includeNotes
    );

    // Get data to export
    const data = await ExportService.getExportData(userId, exportOptions);

    // Count records (handle undefined trackerEntries)
    const totalRecords = data.trackerEntries?.length ?? 0;

    // Generate export based on format
    const result = await ExportService.exportData(userId, exportOptions);

    if (!result.success) {
      throw new Error(result.error || 'Export failed');
    }

    // Calculate file size safely
    const fileSize = calculateDataSize(result.data);

    // Update job with results
    await prisma.exportJob.update({
      where: { id: exportJobId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        completedAt: new Date(),
        totalRecords,
        exportedRecords: totalRecords,
        fileName: result.fileName,
        fileSize,
        fileMimeType: result.mimeType || null,
        // In production, upload to S3/storage and save URL
        // fileUrl: uploadedUrl,
      },
    });

    // Create notification - matches Notification model in schema
    await prisma.notification.create({
      data: {
        userId,
        type: 'SYSTEM',
        channel: 'IN_APP',
        priority: 'NORMAL',
        title: 'Export Ready',
        message: `Your ${exportJob.format} export is ready for download.`,
        actionUrl: `/api/export/download/${exportJobId}`,
        actionLabel: 'Download',
        entityType: 'exportJob',
        entityId: exportJobId,
        isRead: false,
        isDelivered: true,
        deliveredAt: new Date(),
      },
    });

    log.info('Export job completed', { exportJobId, totalRecords });
  } catch (error) {
    log.error('Export job failed', {}, error);

    await prisma.exportJob.update({
      where: { id: exportJobId },
      data: {
        status: 'FAILED',
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(), 
      },
    });
  }
}