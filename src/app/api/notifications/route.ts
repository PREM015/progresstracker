// src/app/api/notifications/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { NotificationType, NotificationChannel, NotificationPriority } from '@prisma/client';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createNotificationSchema = z.object({
  type: z.nativeEnum(NotificationType),
  channel: z.nativeEnum(NotificationChannel).default('IN_APP'),
  priority: z.nativeEnum(NotificationPriority).default('NORMAL'),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  shortMessage: z.string().max(100).optional(),
  actionUrl: z.string().url().optional(),
  actionLabel: z.string().max(50).optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  imageUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
  scheduledFor: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

const markReadSchema = z.object({
  notificationIds: z.array(z.string()).optional(),
  markAllAsRead: z.boolean().optional(),
});

// =============================================================================
// GET - Get user notifications
// =============================================================================

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized notifications access');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const type = searchParams.get('type') as NotificationType | null;
    const channel = searchParams.get('channel') as NotificationChannel | null;
    const priority = searchParams.get('priority') as NotificationPriority | null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const cursor = searchParams.get('cursor');
    const includeArchived = searchParams.get('includeArchived') === 'true';

    logger.debug('Fetching notifications', {
      userId: session.user.id,
      unreadOnly,
      type,
      limit,
    });

    // Build where clause
    const where: Prisma.NotificationWhereInput = {
      userId: session.user.id,
    };

    if (!includeArchived) {
      where.isArchived = false;
    }

    if (unreadOnly) {
      where.isRead = false;
    }

    if (type && Object.values(NotificationType).includes(type)) {
      where.type = type;
    }

    if (channel && Object.values(NotificationChannel).includes(channel)) {
      where.channel = channel;
    }

    if (priority && Object.values(NotificationPriority).includes(priority)) {
      where.priority = priority;
    }

    // Exclude expired notifications
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ];

    // Fetch notifications with cursor pagination
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: [
        { priority: 'desc' }, // URGENT > HIGH > NORMAL > LOW
        { createdAt: 'desc' },
      ],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        type: true,
        channel: true,
        priority: true,
        title: true,
        message: true,
        shortMessage: true,
        actionUrl: true,
        actionLabel: true,
        entityType: true,
        entityId: true,
        imageUrl: true,
        metadata: true,
        isRead: true,
        readAt: true,
        isArchived: true,
        archivedAt: true,
        isDismissed: true,
        dismissedAt: true,
        isDelivered: true,
        deliveredAt: true,
        scheduledFor: true,
        sentAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Check if there are more results
    const hasMore = notifications.length > limit;
    if (hasMore) {
      notifications.pop();
    }

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
        isArchived: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    // Get counts by priority for unread
    const priorityCounts = await prisma.notification.groupBy({
      by: ['priority'],
      where: {
        userId: session.user.id,
        isRead: false,
        isArchived: false,
      },
      _count: true,
    });

    const priorityMap = priorityCounts.reduce((acc, item) => {
      acc[item.priority] = item._count;
      return acc;
    }, {} as Record<string, number>);

    logger.info('Notifications fetched', {
      userId: session.user.id,
      count: notifications.length,
      unreadCount,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        priorityCounts: {
          urgent: priorityMap['URGENT'] || 0,
          high: priorityMap['HIGH'] || 0,
          normal: priorityMap['NORMAL'] || 0,
          low: priorityMap['LOW'] || 0,
        },
      },
      pagination: {
        hasMore,
        nextCursor: hasMore && notifications.length > 0
          ? notifications[notifications.length - 1].id
          : null,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch notifications', { duration: Date.now() - startTime }, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Create notification (system/admin use)
// =============================================================================

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized notification create attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validated = createNotificationSchema.parse(body);

    logger.debug('Creating notification', {
      userId: session.user.id,
      type: validated.type,
      priority: validated.priority,
    });

    // Handle metadata properly for Prisma JSON field
    let metadataValue: Prisma.InputJsonValue | typeof Prisma.JsonNull = Prisma.JsonNull;
    if (validated.metadata && Object.keys(validated.metadata).length > 0) {
      metadataValue = validated.metadata as Prisma.InputJsonValue;
    }

    const isScheduled = validated.scheduledFor && new Date(validated.scheduledFor) > new Date();

    const notification = await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: validated.type,
        channel: validated.channel,
        priority: validated.priority,
        title: validated.title,
        message: validated.message,
        shortMessage: validated.shortMessage || null,
        actionUrl: validated.actionUrl || null,
        actionLabel: validated.actionLabel || null,
        entityType: validated.entityType || null,
        entityId: validated.entityId || null,
        imageUrl: validated.imageUrl || null,
        metadata: metadataValue,
        scheduledFor: validated.scheduledFor ? new Date(validated.scheduledFor) : null,
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
        // Status
        isRead: false,
        isArchived: false,
        isDismissed: false,
        // Delivery
        isDelivered: !isScheduled,
        deliveredAt: !isScheduled ? new Date() : null,
        sentAt: !isScheduled ? new Date() : null,
      },
    });

    logger.info('Notification created', {
      notificationId: notification.id,
      type: notification.type,
      isScheduled,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        data: notification,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid notification data', { errors: error.errors });
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Failed to create notification', { duration: Date.now() - startTime }, error);
    return NextResponse.json(
      { success: false, error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT - Mark notifications as read
// =============================================================================

export async function PUT(req: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized notification update attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validated = markReadSchema.parse(body);

    logger.debug('Marking notifications as read', {
      userId: session.user.id,
      markAllAsRead: validated.markAllAsRead,
      count: validated.notificationIds?.length,
    });

    let updatedCount = 0;

    if (validated.markAllAsRead) {
      const result = await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
      updatedCount = result.count;
    } else if (validated.notificationIds && validated.notificationIds.length > 0) {
      const result = await prisma.notification.updateMany({
        where: {
          id: { in: validated.notificationIds },
          userId: session.user.id,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
      updatedCount = result.count;
    } else {
      logger.warn('No notifications specified to mark as read');
      return NextResponse.json(
        { success: false, error: 'No notifications specified' },
        { status: 400 }
      );
    }

    logger.info('Notifications marked as read', {
      userId: session.user.id,
      updatedCount,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: { updatedCount },
      message: `${updatedCount} notification(s) marked as read`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid mark read request', { errors: error.errors });
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Failed to mark notifications as read', { duration: Date.now() - startTime }, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH - Dismiss notification
// =============================================================================

export async function PATCH(req: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized notification dismiss attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'Notification ID required' },
        { status: 400 }
      );
    }

    logger.debug('Dismissing notification', { notificationId });

    // Verify ownership
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: session.user.id,
      },
    });

    if (!notification) {
      logger.warn('Notification not found', { notificationId });
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isDismissed: true,
        dismissedAt: new Date(),
      },
    });

    logger.info('Notification dismissed', {
      notificationId,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      message: 'Notification dismissed',
    });
  } catch (error) {
    logger.error('Failed to dismiss notification', { duration: Date.now() - startTime }, error);
    return NextResponse.json(
      { success: false, error: 'Failed to dismiss notification' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Delete/archive notification
// =============================================================================

export async function DELETE(req: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized notification delete attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const notificationId = searchParams.get('id');
    const archiveOnly = searchParams.get('archive') === 'true';
    const deleteAll = searchParams.get('deleteAll') === 'true';

    if (deleteAll) {
      // Delete all read and archived notifications
      const result = await prisma.notification.deleteMany({
        where: {
          userId: session.user.id,
          OR: [
            { isRead: true },
            { isArchived: true },
          ],
        },
      });

      logger.info('All read/archived notifications deleted', {
        deletedCount: result.count,
        duration: Date.now() - startTime,
      });

      return NextResponse.json({
        success: true,
        message: `Deleted ${result.count} notifications`,
      });
    }

    if (!notificationId) {
      logger.warn('Delete requested without notification ID');
      return NextResponse.json(
        { success: false, error: 'Notification ID required' },
        { status: 400 }
      );
    }

    logger.debug('Deleting notification', {
      notificationId,
      archiveOnly,
    });

    // Verify ownership
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: session.user.id,
      },
    });

    if (!notification) {
      logger.warn('Notification not found or not owned by user', { notificationId });
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    if (archiveOnly) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          isArchived: true,
          archivedAt: new Date(),
        },
      });
    } else {
      await prisma.notification.delete({
        where: { id: notificationId },
      });
    }

    logger.info('Notification deleted/archived', {
      notificationId,
      archiveOnly,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      message: archiveOnly ? 'Notification archived' : 'Notification deleted',
    });
  } catch (error) {
    logger.error('Failed to delete notification', { duration: Date.now() - startTime }, error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}