// src/app/api/admin/sync/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { SyncStatus } from '@prisma/client';
import { z } from 'zod';

// =============================================================================
// VALIDATION
// =============================================================================

const triggerSyncSchema = z.object({
  type: z.enum(['all', 'platform', 'user', 'failed']),
  platformId: z.string().optional(),
  userId: z.string().optional(),
});

// =============================================================================
// HELPER
// =============================================================================

async function checkAdminAccess(session: { user?: { id?: string } } | null) {
  if (!session?.user?.id) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, role: true },
  });

  if (!user?.isAdmin && user?.role !== 'admin') {
    return { authorized: false, error: 'Admin access required', status: 403 };
  }

  return { authorized: true, adminId: session.user.id };
}

// =============================================================================
// GET - Get sync status and stats
// =============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    const access = await checkAdminAccess(session);

    if (!access.authorized) {
      
  logger.info('request is ', { request })

      logger.warn('Unauthorized admin sync access');
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status }
      );
    }

    logger.debug('Fetching sync status', { adminId: access.adminId });

    // Get sync stats by status - ✅ Use SyncStatus enum
    const syncStats = await prisma.syncLog.groupBy({
      by: ['status'],
      _count: true,
    });

    const statsMap = syncStats.reduce((acc, s) => {
      acc[s.status] = s._count;
      return acc;
    }, {} as Record<SyncStatus, number>);

    // Get recent syncs
    const recentSyncs = await prisma.syncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        platform: { select: { name: true, slug: true, icon: true } },
        user: { select: { email: true, username: true } },
      },
    });

    // Get currently running syncs
    const runningSyncs = await prisma.syncLog.findMany({
      where: {
        status: { in: [SyncStatus.PENDING, SyncStatus.IN_PROGRESS] },
      },
      include: {
        platform: { select: { name: true } },
        user: { select: { email: true } },
      },
    });

    // Get failed syncs in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentFailures = await prisma.syncLog.count({
      where: {
        status: SyncStatus.FAILED,
        createdAt: { gte: oneDayAgo },
      },
    });

    // Get platforms with most failures
    const failuresByPlatform = await prisma.syncLog.groupBy({
      by: ['platformId'],
      where: {
        status: SyncStatus.FAILED,
        createdAt: { gte: oneDayAgo },
        platformId: { not: null },
      },
      _count: true,
      orderBy: { _count: { platformId: 'desc' } },
      take: 5,
    });

    // Get platform names
    const platformIds = failuresByPlatform.map(f => f.platformId).filter(Boolean) as string[];
    const platforms = await prisma.platform.findMany({
      where: { id: { in: platformIds } },
      select: { id: true, name: true },
    });

    const platformMap = platforms.reduce((acc, p) => {
      acc[p.id] = p.name;
      return acc;
    }, {} as Record<string, string>);

    // Average sync duration
    const avgDuration = await prisma.syncLog.aggregate({
      where: { status: SyncStatus.SUCCESS, duration: { not: null } },
      _avg: { duration: true },
    });

    logger.info('Sync status fetched', {
      adminId: access.adminId,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        status: runningSyncs.length > 0 ? 'running' : 'idle',
        stats: {
          idle: statsMap[SyncStatus.IDLE] || 0,
          pending: statsMap[SyncStatus.PENDING] || 0,
          inProgress: statsMap[SyncStatus.IN_PROGRESS] || 0,
          success: statsMap[SyncStatus.SUCCESS] || 0,
          partial: statsMap[SyncStatus.PARTIAL] || 0,
          failed: statsMap[SyncStatus.FAILED] || 0,
          cancelled: statsMap[SyncStatus.CANCELLED] || 0,
          rateLimited: statsMap[SyncStatus.RATE_LIMITED] || 0,
        },
        running: runningSyncs.map(s => ({
          id: s.id,
          platform: s.platform?.name,
          user: s.user?.email,
          startedAt: s.startedAt,
          status: s.status,
        })),
        recentFailures,
        failuresByPlatform: failuresByPlatform.map(f => ({
          platformId: f.platformId,
          platformName: f.platformId ? platformMap[f.platformId] : 'Unknown',
          count: f._count,
        })),
        avgDurationMs: Math.round(avgDuration._avg.duration || 0),
        recentSyncs: recentSyncs.map(s => ({
          id: s.id,
          platform: s.platform?.name,
          user: s.user?.email,
          status: s.status,
          duration: s.duration,
          itemsCreated: s.itemsCreated,
          hasError: s.hasError,
          errorMessage: s.errorMessage,
          createdAt: s.createdAt,
        })),
      },
    });
  } catch (error) {
    logger.error('Error fetching sync status', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sync status' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Trigger sync
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    const access = await checkAdminAccess(session);

    if (!access.authorized) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status }
      );
    }

    const body = await request.json();
    const validated = triggerSyncSchema.parse(body);

    logger.info('Admin triggering sync', {
      adminId: access.adminId,
      type: validated.type,
    });

    let syncCount = 0;
    let message = '';

    switch (validated.type) {
      case 'all': {
        const userPlatforms = await prisma.userPlatform.findMany({
          where: { isActive: true, autoSync: true },
          select: { id: true, userId: true, platformId: true },
        });

        await prisma.syncLog.createMany({
          data: userPlatforms.map(up => ({
            userId: up.userId,
            platformId: up.platformId,
            userPlatformId: up.id,
            status: SyncStatus.PENDING,
            triggeredBy: 'admin',
            triggerSource: access.adminId,
          })),
        });

        syncCount = userPlatforms.length;
        message = `Queued sync for ${syncCount} user platforms`;
        break;
      }

      case 'platform': {
        if (!validated.platformId) {
          return NextResponse.json(
            { success: false, error: 'Platform ID required' },
            { status: 400 }
          );
        }

        const userPlatforms = await prisma.userPlatform.findMany({
          where: { platformId: validated.platformId, isActive: true },
          select: { id: true, userId: true, platformId: true },
        });

        await prisma.syncLog.createMany({
          data: userPlatforms.map(up => ({
            userId: up.userId,
            platformId: up.platformId,
            userPlatformId: up.id,
            status: SyncStatus.PENDING,
            triggeredBy: 'admin',
            triggerSource: access.adminId,
          })),
        });

        syncCount = userPlatforms.length;
        message = `Queued sync for ${syncCount} users on platform`;
        break;
      }

      case 'user': {
        if (!validated.userId) {
          return NextResponse.json(
            { success: false, error: 'User ID required' },
            { status: 400 }
          );
        }

        const userPlatforms = await prisma.userPlatform.findMany({
          where: { userId: validated.userId, isActive: true },
          select: { id: true, userId: true, platformId: true },
        });

        await prisma.syncLog.createMany({
          data: userPlatforms.map(up => ({
            userId: up.userId,
            platformId: up.platformId,
            userPlatformId: up.id,
            status: SyncStatus.PENDING,
            triggeredBy: 'admin',
            triggerSource: access.adminId,
          })),
        });

        syncCount = userPlatforms.length;
        message = `Queued sync for ${syncCount} platforms for user`;
        break;
      }

      case 'failed': {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const failedSyncs = await prisma.syncLog.findMany({
          where: {
            status: SyncStatus.FAILED,
            createdAt: { gte: oneDayAgo },
            attemptNumber: { lt: 3 },
          },
          select: { 
            id: true, userId: true, platformId: true, 
            userPlatformId: true, attemptNumber: true,
          },
        });

        await prisma.syncLog.createMany({
          data: failedSyncs.map(fs => ({
            userId: fs.userId,
            platformId: fs.platformId,
            userPlatformId: fs.userPlatformId,
            status: SyncStatus.PENDING,
            attemptNumber: fs.attemptNumber + 1,
            triggeredBy: 'admin',
            triggerSource: access.adminId,
          })),
        });

        syncCount = failedSyncs.length;
        message = `Queued retry for ${syncCount} failed syncs`;
        break;
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: access.adminId,
        action: 'ADMIN_ACTION',
        category: 'sync',
        description: `Admin triggered sync: ${validated.type}`,
        newValue: { type: validated.type, count: syncCount },
        performedBy: access.adminId,
      },
    });

    logger.info('Sync triggered', {
      adminId: access.adminId,
      type: validated.type,
      count: syncCount,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: { syncCount },
      message,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error triggering sync', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to trigger sync' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Cancel pending/running syncs
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const access = await checkAdminAccess(session);

    if (!access.authorized) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const syncId = searchParams.get('id');
    const cancelAll = searchParams.get('cancelAll') === 'true';

    if (cancelAll) {
      logger.warn('Admin cancelling all pending syncs', { adminId: access.adminId });

      const result = await prisma.syncLog.updateMany({
        where: {
          status: { in: [SyncStatus.PENDING, SyncStatus.IN_PROGRESS] },
        },
        data: {
          status: SyncStatus.CANCELLED,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: { cancelledCount: result.count },
        message: `Cancelled ${result.count} syncs`,
      });
    }

    if (!syncId) {
      return NextResponse.json(
        { success: false, error: 'Sync ID required' },
        { status: 400 }
      );
    }

    await prisma.syncLog.update({
      where: { id: syncId },
      data: {
        status: SyncStatus.CANCELLED,
        completedAt: new Date(),
      },
    });

    logger.info('Sync cancelled', { adminId: access.adminId, syncId });

    return NextResponse.json({
      success: true,
      message: 'Sync cancelled',
    });
  } catch (error) {
    logger.error('Error cancelling sync', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel sync' },
      { status: 500 }
    );
  }
}