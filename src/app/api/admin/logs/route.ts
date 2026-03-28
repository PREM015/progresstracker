// src/app/api/admin/logs/route.ts
// GET: list system / audit logs

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!session.user.isAdmin && session.user.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(200, Number(searchParams.get('limit') || 50));
    const action = searchParams.get('action') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    const where: any = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (severity) where.severity = severity;
    if (category) where.category = category;
    if (search) where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { entityType: { contains: search, mode: 'insensitive' } },
      { ipAddress: { contains: search, mode: 'insensitive' } },
    ];
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: { logs, total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error('GET /api/admin/logs failed', {}, err);
    return NextResponse.json({ success: false, error: 'Failed to fetch logs' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
