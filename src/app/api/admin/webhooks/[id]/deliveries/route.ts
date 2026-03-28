// src/app/api/admin/webhooks/[id]/deliveries/route.ts
// GET: delivery logs for a webhook

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

interface Props { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Props): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!session.user.isAdmin && session.user.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Number(searchParams.get('limit') || 20));
    const status = searchParams.get('status') || undefined;

    const where: any = { webhookId: id };
    if (status) where.status = status;

    const [deliveries, total] = await Promise.all([
      prisma.webhookDelivery.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.webhookDelivery.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: { deliveries, total, page, limit } });
  } catch (err) {
    logger.error('GET admin webhook deliveries failed', {}, err);
    return NextResponse.json({ success: false, error: 'Failed to fetch deliveries' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
