// src/app/api/sync/logs/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { SyncStatus, Prisma } from '@prisma/client';

// =============================================================================
// GET - Get sync logs
// =============================================================================

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized sync logs access');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const platformId = searchParams.get('platformId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') as SyncStatus | null;
    const hasError = searchParams.get('hasError');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    logger.debug('Fetching sync logs', {
      userId: session.user.id,
      platformId,
      status,
      limit,
      offset,
    });

    // Build where clause
    const where: Prisma.SyncLogWhereInput = {
      userId: session.user.id,
    };

    if (platformId) {
      where.platformId = platformId;
    }

    // ✅ FIXED: Use proper SyncStatus enum values
    if (status && Object.values(SyncStatus).includes(status)) {
      where.status = status;
    }

    if (hasError === 'true') {
      where.hasError = true;
    } else if (hasError === 'false') {
      where.hasError = false;
    }

    if (fromDate) {
      where.createdAt = {
        ...(where.createdAt as Prisma.DateTimeFilter || {}),
        gte: new Date(fromDate),
      };
    }

    if (toDate) {
      where.createdAt = {
        ...(where.createdAt as Prisma.DateTimeFilter || {}),
        lte: new Date(toDate),
      };
    }

    // Fetch logs with pagination
    const [logs, total] = await Promise.all([
      prisma.syncLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          platform: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
              color: true,
            },
          },
          userPlatform: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
      prisma.syncLog.count({ where }),
    ]);

    // ✅ FIXED: Use proper SyncStatus enum values for stats
    const stats = await prisma.syncLog.groupBy({
      by: ['status'],
      where: { userId: session.user.id },
      _count: true,
    });

    const statsMap = stats.reduce((acc, s) => {
      acc[s.status] = s._count;
      return acc;
    }, {} as Record<SyncStatus, number>);

    // Calculate average duration for successful syncs
    const avgDuration = await prisma.syncLog.aggregate({
      where: {
        userId: session.user.id,
        status: SyncStatus.SUCCESS,
        duration: { not: null },
      },
      _avg: { duration: true },
    });

    logger.info('Sync logs fetched', {
      userId: session.user.id,
      count: logs.length,
      total,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        logs: logs.map(log => ({
          id: log.id,
          platformId: log.platformId,
          platform: log.platform,
          userPlatform: log.userPlatform,
          status: log.status,
          startedAt: log.startedAt,
          completedAt: log.completedAt,
          duration: log.duration,
          // Results
          itemsFound: log.itemsFound,
          itemsCreated: log.itemsCreated,
          itemsUpdated: log.itemsUpdated,
          itemsSkipped: log.itemsSkipped,
          itemsFailed: log.itemsFailed,
          // Data range
          dataFromDate: log.dataFromDate,
          dataToDate: log.dataToDate,
          // Error info
          hasError: log.hasError,
          errorCode: log.errorCode,
          errorMessage: log.errorMessage,
          // Retry info
          attemptNumber: log.attemptNumber,
          maxAttempts: log.maxAttempts,
          nextRetryAt: log.nextRetryAt,
          // Trigger info
          triggeredBy: log.triggeredBy,
          triggerSource: log.triggerSource,
          // Timestamps
          createdAt: log.createdAt,
        })),
      },
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total,
      },
      stats: {
        total,
        // ✅ FIXED: Use proper enum values
        idle: statsMap[SyncStatus.IDLE] || 0,
        pending: statsMap[SyncStatus.PENDING] || 0,
        inProgress: statsMap[SyncStatus.IN_PROGRESS] || 0,
        success: statsMap[SyncStatus.SUCCESS] || 0,
        partial: statsMap[SyncStatus.PARTIAL] || 0,
        failed: statsMap[SyncStatus.FAILED] || 0,
        cancelled: statsMap[SyncStatus.CANCELLED] || 0,
        rateLimited: statsMap[SyncStatus.RATE_LIMITED] || 0,
        avgDurationMs: Math.round(avgDuration._avg.duration || 0),
      },
    });
  } catch (error) {
    logger.error('Sync logs error', {}, error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get sync logs' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Clear old logs
// =============================================================================

export async function DELETE(req: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized sync log deletion');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const olderThan = searchParams.get('olderThan'); // days
    const status = searchParams.get('status') as SyncStatus | null;
    const deleteAll = searchParams.get('deleteAll') === 'true';

    const daysAgo = parseInt(olderThan || '30');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    logger.info('Deleting sync logs', {
      userId: session.user.id,
      daysAgo,
      status,
      deleteAll,
    });

    const where: Prisma.SyncLogWhereInput = {
      userId: session.user.id,
    };

    if (!deleteAll) {
      where.createdAt = { lt: cutoffDate };
    }

    // ✅ FIXED: Use proper enum for status filter
    if (status && Object.values(SyncStatus).includes(status)) {
      where.status = status;
    }

    const result = await prisma.syncLog.deleteMany({ where });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        category: 'sync',
        entityType: 'sync_log',
        description: `Deleted ${result.count} sync logs older than ${daysAgo} days`,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        userAgent: req.headers.get('user-agent'),
      },
    });

    logger.info('Sync logs deleted', {
      userId: session.user.id,
      deletedCount: result.count,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: { deletedCount: result.count },
      message: `Deleted ${result.count} logs older than ${daysAgo} days`,
    });
  } catch (error) {
    logger.error('Error deleting sync logs', {}, error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete logs' },
      { status: 500 }
    );
  }
}