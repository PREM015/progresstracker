// src/app/api/admin/waitlist/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { nanoid } from 'nanoid';

// =============================================================================
// VALIDATION
// =============================================================================

const updateSchema = z.object({
  status: z.enum(['waiting', 'invited', 'joined']).optional(),
  name: z.string().optional(),
  source: z.string().optional(),
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

interface RouteContext {
  params: Promise<{ id: string }>;
}

// =============================================================================
// GET - Get single waitlist entry
// =============================================================================

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    const access = await checkAdminAccess(session);

    if (!access.authorized) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    }

    const entry = await prisma.waitlist.findUnique({
      where: { id },
    });

    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'Entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    logger.error('Error fetching waitlist entry', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch entry' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT - Update waitlist entry
// =============================================================================

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    const access = await checkAdminAccess(session);

    if (!access.authorized) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const validated = updateSchema.parse(body);

    logger.info('Updating waitlist entry', { adminId: access.adminId, entryId: id });

    // Build update data
    const updateData: Record<string, unknown> = { ...validated };

    // If changing to invited, set invite fields
    if (validated.status === 'invited') {
      updateData.invitedAt = new Date();
      updateData.inviteCode = nanoid(12);
    }

    // If changing to joined
    if (validated.status === 'joined') {
      updateData.joinedAt = new Date();
    }

    const entry = await prisma.waitlist.update({
      where: { id },
      data: updateData,
    });

    logger.info('Waitlist entry updated', { adminId: access.adminId, entryId: id });

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error updating waitlist entry', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update entry' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Delete waitlist entry
// =============================================================================

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    const access = await checkAdminAccess(session);

    if (!access.authorized) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    }

    logger.info('Deleting waitlist entry', { adminId: access.adminId, entryId: id });

    await prisma.waitlist.delete({
      where: { id },
    });

    logger.info('Waitlist entry deleted', { adminId: access.adminId, entryId: id });

    return NextResponse.json({ success: true, message: 'Entry deleted' });
  } catch (error) {
    logger.error('Error deleting waitlist entry', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete entry' },
      { status: 500 }
    );
  }
}