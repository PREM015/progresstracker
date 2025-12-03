// src/app/api/sync/logs/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {prisma} from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const platformId = searchParams.get('platformId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');

    // Build query
    const where: any = { userId: session.user.id };

    if (platformId) {
      where.platformId = platformId;
    }

    if (status) {
      where.status = status;
    }

    // Fetch logs
    const [logs, total] = await Promise.all([
      prisma.syncLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          platform: {
            select: { name: true, icon: true, slug: true },
          },
        },
      }),
      prisma.syncLog.count({ where }),
    ]);

    // Calculate stats
    const stats = await prisma.syncLog.groupBy({
      by: ['status'],
      where: { userId: session.user.id },
      _count: true,
    });

    const statsMap = stats.reduce((acc, s) => {
      acc[s.status] = s._count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total,
      },
      stats: {
        total: total,
        success: statsMap['success'] || 0,
        failed: statsMap['failed'] || 0,
        running: statsMap['running'] || 0,
      },
    });
  } catch (error: any) {
    console.error('Sync logs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get sync logs' },
      { status: 500 }
    );
  }
}

// DELETE - Clear old logs
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const olderThan = searchParams.get('olderThan'); // days

    const daysAgo = parseInt(olderThan || '30');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    const result = await prisma.syncLog.deleteMany({
      where: {
        userId: session.user.id,
        createdAt: { lt: cutoffDate },
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `Deleted ${result.count} logs older than ${daysAgo} days`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete logs' },
      { status: 500 }
    );
  }
}