// src/app/api/admin/webhooks/route.ts
// GET: list all user webhooks

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
  if (!session.user.isAdmin && session.user.role !== 'admin') return { error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) };
  return { error: null };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Number(searchParams.get('limit') || 20));
    const isActive = searchParams.get('isActive');
    const userId = searchParams.get('userId') || undefined;
    const search = searchParams.get('search') || undefined;

    const where: any = {};
    if (isActive !== null && isActive !== undefined) where.isActive = isActive === 'true';
    if (userId) where.userId = userId;
    if (search) where.OR = [
      { url: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];

    const [webhooks, total] = await Promise.all([
      prisma.webhook.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          _count: { select: { deliveries: true } },
        },
      }),
      prisma.webhook.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: { webhooks, total, page, limit } });
  } catch (err) {
    logger.error('GET /api/admin/webhooks failed', {}, err);
    return NextResponse.json({ success: false, error: 'Failed to fetch webhooks' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
