// src/app/api/admin/webhooks/stats/route.ts
// GET: webhook stats

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!session.user.isAdmin && session.user.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  try {
    const [totalWebhooks, activeWebhooks, totalDeliveries, successfulDeliveries, failedDeliveries] = await Promise.all([
      prisma.webhook.count(),
      prisma.webhook.count({ where: { isActive: true } }),
      prisma.webhookDelivery.count(),
      prisma.webhookDelivery.count({ where: { status: 'SUCCESS' as any } }),
      prisma.webhookDelivery.count({ where: { status: 'FAILED' as any } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalWebhooks,
        activeWebhooks,
        inactiveWebhooks: totalWebhooks - activeWebhooks,
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries,
        successRate: totalDeliveries > 0 ? Math.round((successfulDeliveries / totalDeliveries) * 100) : 0,
      },
    });
  } catch (err) {
    logger.error('GET /api/admin/webhooks/stats failed', {}, err);
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
