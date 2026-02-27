// src/app/api/sse/notifications/[id]/route.ts
/**
 * Single Notification SSE Route
 * 
 * GET     /api/sse/notifications/[id] - Get single notification
 * PUT     /api/sse/notifications/[id] - Update notification
 * PATCH   /api/sse/notifications/[id] - Partial update
 * DELETE  /api/sse/notifications/[id] - Delete notification
 * HEAD    /api/sse/notifications/[id] - Check if exists
 * OPTIONS /api/sse/notifications/[id] - CORS
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { SSEEventTypes, generateEventId } from '@/lib/sse';
import { sseConnectionManager } from '@/services/sseConnectionManager';
import {
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  toApiError,
} from '@/lib/apiError';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sse/notifications/[id]' });
const ALLOWED_METHODS = ['GET', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

// =============================================================================
// VALIDATION
// =============================================================================

const idSchema = z.string().cuid();

const updateSchema = z.object({
  isRead: z.boolean(),
  isArchived: z.boolean().optional(),
  isDismissed: z.boolean().optional(),
});

const patchSchema = updateSchema.partial();

// =============================================================================
// TYPES
// =============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

// =============================================================================
// HELPERS
// =============================================================================

function getRequestContext(req: NextRequest) {
  return {
    requestId: req.headers.get('x-request-id') || crypto.randomUUID(),
  };
}

function errorResponse(error: unknown, requestId: string): NextResponse {
  const apiError = toApiError(error, requestId);
  apiError.log();
  return NextResponse.json(
    { success: false, error: apiError.message, code: apiError.code, requestId },
    { status: apiError.statusCode, headers: { 'X-Request-ID': requestId } }
  );
}

function successResponse<T>(data: T, status = 200, headers: Record<string, string> = {}): NextResponse {
  return NextResponse.json(
    { success: true, data, timestamp: new Date().toISOString() },
    { status, headers: { 'Content-Type': 'application/json', ...headers } }
  );
}

async function validateOwnership(notificationId: string, userId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) throw new NotFoundError('Notification');
  if (notification.userId !== userId) throw new ForbiddenError('Access denied');

  return notification;
}

async function getUnreadCount(userId: string) {
  const [unreadCount, totalCount] = await Promise.all([
    prisma.notification.count({ where: { userId, isRead: false, isArchived: false } }),
    prisma.notification.count({ where: { userId, isArchived: false } }),
  ]);
  return { unreadCount, totalCount };
}

// =============================================================================
// GET - Get Single Notification
// =============================================================================

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { requestId } = getRequestContext(req);

  try {
    const { id } = await params;
    const validatedId = idSchema.safeParse(id);
    if (!validatedId.success) throw new ValidationError('Invalid notification ID');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');

    const notification = await validateOwnership(validatedId.data, session.user.id);

    return successResponse({ notification }, 200, { 'X-Request-ID': requestId });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// PUT - Full Update Notification
// =============================================================================

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { requestId } = getRequestContext(req);

  try {
    const { id } = await params;
    const validatedId = idSchema.safeParse(id);
    if (!validatedId.success) throw new ValidationError('Invalid notification ID');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');

    const userId = session.user.id;
    await validateOwnership(validatedId.data, userId);

    let body: unknown;
    try { body = await req.json(); } catch { throw new ValidationError('Invalid JSON'); }

    const validated = updateSchema.safeParse(body);
    if (!validated.success) {
      throw new ValidationError('Validation failed', validated.error.errors.map(e => ({
        field: e.path.join('.'), message: e.message,
      })));
    }

    const notification = await prisma.notification.update({
      where: { id: validatedId.data },
      data: {
        isRead: validated.data.isRead,
        readAt: validated.data.isRead ? new Date() : null,
        isArchived: validated.data.isArchived ?? false,
        archivedAt: validated.data.isArchived ? new Date() : null,
        isDismissed: validated.data.isDismissed ?? false,
        dismissedAt: validated.data.isDismissed ? new Date() : null,
      },
    });

    // Send SSE update
    const counts = await getUnreadCount(userId);
    sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: SSEEventTypes.NOTIFICATION_COUNT,
      data: counts,
    });

    log.info('Notification updated', { notificationId: id, userId });

    return successResponse({ notification, ...counts }, 200, { 'X-Request-ID': requestId });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// PATCH - Partial Update
// =============================================================================

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { requestId } = getRequestContext(req);

  try {
    const { id } = await params;
    const validatedId = idSchema.safeParse(id);
    if (!validatedId.success) throw new ValidationError('Invalid notification ID');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');

    const userId = session.user.id;
    await validateOwnership(validatedId.data, userId);

    let body: unknown;
    try { body = await req.json(); } catch { throw new ValidationError('Invalid JSON'); }

    const validated = patchSchema.safeParse(body);
    if (!validated.success) {
      throw new ValidationError('Validation failed', validated.error.errors.map(e => ({
        field: e.path.join('.'), message: e.message,
      })));
    }

    const updateData: Record<string, unknown> = {};
    if (validated.data.isRead !== undefined) {
      updateData.isRead = validated.data.isRead;
      updateData.readAt = validated.data.isRead ? new Date() : null;
    }
    if (validated.data.isArchived !== undefined) {
      updateData.isArchived = validated.data.isArchived;
      updateData.archivedAt = validated.data.isArchived ? new Date() : null;
    }
    if (validated.data.isDismissed !== undefined) {
      updateData.isDismissed = validated.data.isDismissed;
      updateData.dismissedAt = validated.data.isDismissed ? new Date() : null;
    }

    const notification = await prisma.notification.update({
      where: { id: validatedId.data },
      data: updateData,
    });

    const counts = await getUnreadCount(userId);
    sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: SSEEventTypes.NOTIFICATION_COUNT,
      data: counts,
    });

    return successResponse({ notification, ...counts }, 200, { 'X-Request-ID': requestId });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// DELETE - Delete Notification
// =============================================================================

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { requestId } = getRequestContext(req);

  try {
    const { id } = await params;
    const validatedId = idSchema.safeParse(id);
    if (!validatedId.success) throw new ValidationError('Invalid notification ID');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');

    const userId = session.user.id;
    await validateOwnership(validatedId.data, userId);

    await prisma.notification.delete({ where: { id: validatedId.data } });

    const counts = await getUnreadCount(userId);
    sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: SSEEventTypes.NOTIFICATION_DELETED,
      data: { notificationId: validatedId.data },
    });
    sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: SSEEventTypes.NOTIFICATION_COUNT,
      data: counts,
    });

    log.info('Notification deleted', { notificationId: id, userId });

    return new NextResponse(null, { status: 204, headers: { 'X-Request-ID': requestId } });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}
// src/app/api/sse/notifications/[id]/route.ts (continued)

// =============================================================================
// HEAD - Check Existence
// =============================================================================

export async function HEAD(req: NextRequest, { params }: RouteParams) {
  const { requestId } = getRequestContext(req);

  try {
    const { id } = await params;
    const validatedId = idSchema.safeParse(id);
    if (!validatedId.success) {
      return new NextResponse(null, { status: 400, headers: { 'X-Request-ID': requestId } });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401, headers: { 'X-Request-ID': requestId } });
    }

    const notification = await prisma.notification.findFirst({
      where: { id: validatedId.data, userId: session.user.id },
      select: { id: true, isRead: true, isArchived: true, updatedAt: true },
    });

    if (!notification) {
      return new NextResponse(null, { status: 404, headers: { 'X-Request-ID': requestId } });
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Request-ID': requestId,
        'X-Is-Read': String(notification.isRead),
        'X-Is-Archived': String(notification.isArchived),
 'Last-Modified': notification?.updatedAt
  ? new Date(notification.updatedAt).toUTCString()
  : new Date().toUTCString(),




      },
    });
  } catch {
    return new NextResponse(null, { status: 500, headers: { 'X-Request-ID': requestId } });
  }
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': ALLOWED_METHODS.join(', '),
      'Access-Control-Allow-Methods': ALLOWED_METHODS.join(', '),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}