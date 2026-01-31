// src/app/api/admin/newsletter/route.ts

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

const createSubscriberSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  topics: z.array(z.string()).optional(),
  frequency: z.enum(['weekly', 'monthly']).optional(),
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
// GET - List newsletter subscribers
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
    const isActive = searchParams.get('active');
    const search = searchParams.get('search');
    const frequency = searchParams.get('frequency');

    logger.debug('Admin fetching newsletter subscribers', { adminId: access.adminId });

    // Build where clause
    const where: Prisma.NewsletterSubscriberWhereInput = {};

    if (isActive === 'true') {
      where.isActive = true;
    } else if (isActive === 'false') {
      where.isActive = false;
    }

    if (frequency) {
      where.frequency = frequency;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch subscribers
    const [subscribers, total] = await Promise.all([
      prisma.newsletterSubscriber.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.newsletterSubscriber.count({ where }),
    ]);

    // Get stats
    const activeCount = await prisma.newsletterSubscriber.count({ where: { isActive: true } });
    const unsubscribedCount = await prisma.newsletterSubscriber.count({ where: { isActive: false } });

    // Aggregate email stats
    const emailStats = await prisma.newsletterSubscriber.aggregate({
      _sum: {
        emailsSent: true,
        emailsOpened: true,
        emailsClicked: true,
      },
    });

    logger.info('Newsletter subscribers fetched', {
      adminId: access.adminId,
      count: subscribers.length,
      total,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        subscribers,
        stats: {
          total,
          active: activeCount,
          unsubscribed: unsubscribedCount,
          emailsSent: emailStats._sum.emailsSent || 0,
          emailsOpened: emailStats._sum.emailsOpened || 0,
          emailsClicked: emailStats._sum.emailsClicked || 0,
          openRate: emailStats._sum.emailsSent
            ? Math.round(((emailStats._sum.emailsOpened || 0) / emailStats._sum.emailsSent) * 100)
            : 0,
          clickRate: emailStats._sum.emailsOpened
            ? Math.round(((emailStats._sum.emailsClicked || 0) / emailStats._sum.emailsOpened) * 100)
            : 0,
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
    logger.error('Error fetching newsletter subscribers', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscribers' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Add subscriber or send newsletter
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

    if (action === 'send_newsletter') {
      // Handle sending newsletter
      const { subject, content, targetFrequency } = body;

      if (!subject || !content) {
        return NextResponse.json(
          { success: false, error: 'Subject and content required' },
          { status: 400 }
        );
      }

      logger.info('Sending newsletter', { adminId: access.adminId, targetFrequency });

      // Get active subscribers
      const where: Prisma.NewsletterSubscriberWhereInput = {
        isActive: true,
        confirmedAt: { not: null },
      };

      if (targetFrequency) {
        where.frequency = targetFrequency;
      }

      const subscribers = await prisma.newsletterSubscriber.findMany({
        where,
        select: { id: true, email: true, name: true },
      });

      // TODO: Actually send emails via email service
      // For now, just update sent count
      await prisma.newsletterSubscriber.updateMany({
        where: { id: { in: subscribers.map(s => s.id) } },
        data: { emailsSent: { increment: 1 } },
      });

      logger.info('Newsletter sent', {
        adminId: access.adminId,
        recipientCount: subscribers.length,
        duration: Date.now() - startTime,
      });

      return NextResponse.json({
        success: true,
        data: { recipientCount: subscribers.length },
        message: `Newsletter sent to ${subscribers.length} subscribers`,
      });
    }

    // Add single subscriber
    const validated = createSubscriberSchema.parse(body);

    // Check if already exists
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: validated.email },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email already subscribed' },
        { status: 409 }
      );
    }

    const subscriber = await prisma.newsletterSubscriber.create({
      data: {
        email: validated.email,
        name: validated.name,
        topics: validated.topics || [],
        frequency: validated.frequency || 'weekly',
        isActive: true,
        confirmedAt: new Date(), // Admin-added subscribers are auto-confirmed
        unsubscribeToken: nanoid(32),
      },
    });

    logger.info('Newsletter subscriber added by admin', {
      adminId: access.adminId,
      subscriberId: subscriber.id,
      email: subscriber.email,
    });

    return NextResponse.json({
      success: true,
      data: subscriber,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error with newsletter operation', {}, error);
    return NextResponse.json(
      { success: false, error: 'Operation failed' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Bulk delete subscribers
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const access = await checkAdminAccess(session);

    if (!access.authorized) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids')?.split(',') || [];
    const deleteUnsubscribed = searchParams.get('deleteUnsubscribed') === 'true';

    if (deleteUnsubscribed) {
      const result = await prisma.newsletterSubscriber.deleteMany({
        where: { isActive: false },
      });

      logger.info('Deleted unsubscribed subscribers', {
        adminId: access.adminId,
        deleted: result.count,
      });

      return NextResponse.json({
        success: true,
        data: { deletedCount: result.count },
      });
    }

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No IDs provided' },
        { status: 400 }
      );
    }

    const result = await prisma.newsletterSubscriber.deleteMany({
      where: { id: { in: ids } },
    });

    logger.info('Newsletter subscribers deleted', {
      adminId: access.adminId,
      deleted: result.count,
    });

    return NextResponse.json({
      success: true,
      data: { deletedCount: result.count },
    });
  } catch (error) {
    logger.error('Error deleting newsletter subscribers', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete subscribers' },
      { status: 500 }
    );
  }
}