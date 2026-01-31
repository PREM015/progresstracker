// src/app/api/admin/newsletter/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// =============================================================================
// VALIDATION
// =============================================================================

const updateSchema = z.object({
  name: z.string().optional(),
  topics: z.array(z.string()).optional(),
  frequency: z.enum(['weekly', 'monthly']).optional(),
  isActive: z.boolean().optional(),
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
// GET - Get single subscriber
// =============================================================================

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    const access = await checkAdminAccess(session);

    if (!access.authorized) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    }

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { id },
    });

    if (!subscriber) {
      return NextResponse.json(
        { success: false, error: 'Subscriber not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: subscriber });
  } catch (error) {
    logger.error('Error fetching newsletter subscriber', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscriber' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT - Update subscriber
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

    logger.info('Updating newsletter subscriber', { adminId: access.adminId, subscriberId: id });

    // Build update data
    const updateData: Record<string, unknown> = { ...validated };

    // If reactivating, clear unsubscribe data
    if (validated.isActive === true) {
      updateData.unsubscribedAt = null;
      updateData.unsubscribeReason = null;
    }

    // If deactivating
    if (validated.isActive === false) {
      updateData.unsubscribedAt = new Date();
      updateData.unsubscribeReason = 'admin_deactivated';
    }

    const subscriber = await prisma.newsletterSubscriber.update({
      where: { id },
      data: updateData,
    });

    logger.info('Newsletter subscriber updated', {
      adminId: access.adminId,
      subscriberId: id,
    });

    return NextResponse.json({ success: true, data: subscriber });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error updating newsletter subscriber', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update subscriber' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Delete subscriber
// =============================================================================

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    const access = await checkAdminAccess(session);

    if (!access.authorized) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    }

    logger.info('Deleting newsletter subscriber', { adminId: access.adminId, subscriberId: id });

    await prisma.newsletterSubscriber.delete({
      where: { id },
    });

    logger.info('Newsletter subscriber deleted', {
      adminId: access.adminId,
      subscriberId: id,
    });

    return NextResponse.json({ success: true, message: 'Subscriber deleted' });
  } catch (error) {
    logger.error('Error deleting newsletter subscriber', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete subscriber' },
      { status: 500 }
    );
  }
}