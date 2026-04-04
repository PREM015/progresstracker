import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const bodySchema = z.object({
  type: z.enum(['EMAIL', 'PUSH', 'IN_APP']).optional(),
});

/**
 * API Route: /api/notifications/unsubscribe
 * 
 * @description Manage notification subscription preferences
 * @created 2026-01-26
 */

// GET - Fetch notification preferences
export async function GET(
  request: NextRequest
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's notification preferences
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        marketingEmails: true,
        emailDigest: true,
        pushNotifications: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        marketing: user?.marketingEmails || false,
        digest: user?.emailDigest || false,
        push: user?.pushNotifications || false,
      },
    });
  } catch (error) {
    logger.error('GET notifications/unsubscribe failed', {}, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Update notification preferences
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = bodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Update user notification preferences
    const notificationType = validation.data.type;
    const updateData: any = {};

    if (!notificationType || notificationType === 'EMAIL') {
      updateData.marketingEmails = false;
    }
    if (!notificationType || notificationType === 'PUSH') {
      updateData.pushNotifications = false;
    }
    if (!notificationType || notificationType === 'IN_APP') {
      updateData.emailDigest = false;
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        marketingEmails: true,
        emailDigest: true,
        pushNotifications: true,
      },
    });

    logger.info('Notification preferences updated', { userId: session.user.id });

    return NextResponse.json({
      success: true,
      data: {
        marketing: updated.marketingEmails,
        digest: updated.emailDigest,
        push: updated.pushNotifications,
      },
    }, { status: 200 });
  } catch (error) {
    logger.error('POST notifications/unsubscribe failed', {}, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';



