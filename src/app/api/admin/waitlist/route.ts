// src/app/api/admin/waitlist/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createWaitlistSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  source: z.string().optional(),
  referralCode: z.string().optional(),
});

const bulkInviteSchema = z.object({
  ids: z.array(z.string()).min(1),
});

// =============================================================================
// HELPER: Check Admin Access
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
// GET - List waitlist entries
// =============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    const access = await checkAdminAccess(session);

    if (!access.authorized) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const status = searchParams.get('status'); // waiting, invited, joined
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    logger.debug('Admin fetching waitlist', { adminId: access.adminId, status, search });

    // Build where clause
    const where: Prisma.WaitlistWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch entries
    const [entries, total] = await Promise.all([
      prisma.waitlist.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder as 'asc' | 'desc' },
      }),
      prisma.waitlist.count({ where }),
    ]);

    // Get stats
    const stats = await prisma.waitlist.groupBy({
      by: ['status'],
      _count: true,
    });

    const statsMap = stats.reduce((acc, s) => {
      acc[s.status] = s._count;
      return acc;
    }, {} as Record<string, number>);

    logger.info('Waitlist fetched', {
      adminId: access.adminId,
      count: entries.length,
      total,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        entries,
        stats: {
          total,
          waiting: statsMap['waiting'] || 0,
          invited: statsMap['invited'] || 0,
          joined: statsMap['joined'] || 0,
        },
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching waitlist', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch waitlist' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Add to waitlist or bulk invite
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    const access = await checkAdminAccess(session);

    if (!access.authorized) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'bulk_invite') {
      // Bulk invite
      const { ids } = bulkInviteSchema.parse(body);

      logger.info('Bulk inviting waitlist entries', { adminId: access.adminId, count: ids.length });

      const updated = await prisma.waitlist.updateMany({
        where: {
          id: { in: ids },
          status: 'waiting',
        },
        data: {
          status: 'invited',
          invitedAt: new Date(),
          inviteCode: nanoid(12),
        },
      });

      // TODO: Send invite emails

      logger.info('Bulk invite complete', {
        adminId: access.adminId,
        invited: updated.count,
        duration: Date.now() - startTime,
      });

      return NextResponse.json({
        success: true,
        data: { invitedCount: updated.count },
        message: `${updated.count} users invited`,
      });
    }

    // Add single entry
    const validated = createWaitlistSchema.parse(body);

    // Check if already exists
    const existing = await prisma.waitlist.findUnique({
      where: { email: validated.email },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email already on waitlist' },
        { status: 409 }
      );
    }

    // Get position
    const lastEntry = await prisma.waitlist.findFirst({
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const entry = await prisma.waitlist.create({
      data: {
        email: validated.email,
        name: validated.name,
        source: validated.source || 'admin',
        referralCode: validated.referralCode,
        status: 'waiting',
        position: (lastEntry?.position || 0) + 1,
      },
    });

    logger.info('Waitlist entry created by admin', {
      adminId: access.adminId,
      entryId: entry.id,
      email: entry.email,
    });

    return NextResponse.json({
      success: true,
      data: entry,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error adding to waitlist', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to add to waitlist' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Remove from waitlist
// =============================================================================

export async function DELETE(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    const access = await checkAdminAccess(session);

    if (!access.authorized) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids')?.split(',') || [];

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No IDs provided' },
        { status: 400 }
      );
    }

    logger.info('Deleting waitlist entries', { adminId: access.adminId, count: ids.length });

    const result = await prisma.waitlist.deleteMany({
      where: { id: { in: ids } },
    });

    logger.info('Waitlist entries deleted', {
      adminId: access.adminId,
      deleted: result.count,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: { deletedCount: result.count },
    });
  } catch (error) {
    logger.error('Error deleting waitlist entries', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete entries' },
      { status: 500 }
    );
  }
}