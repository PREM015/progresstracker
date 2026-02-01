// src/app/api/sse/notifications/route.ts
/**
 * SSE Notifications Route
 * 
 * GET     /api/sse/notifications - Subscribe to notification stream
 * POST    /api/sse/notifications - Mark notifications as read
 * PUT     /api/sse/notifications - Update notification preferences
 * DELETE  /api/sse/notifications - Clear/archive notifications
 * PATCH   /api/sse/notifications - Batch update notifications
 * HEAD    /api/sse/notifications - Get unread count
 * OPTIONS /api/sse/notifications - CORS
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { 
  createSSEStream, 
  getSSEHeaders, 
  SSEEventTypes,
  generateEventId,
  parseLastEventId,
  SSENotificationPayload,
} from '@/lib/sse';
import { sseConnectionManager } from '@/services/sseConnectionManager';
import { UnauthorizedError, ValidationError, toApiError } from '@/lib/apiError';
import { rateLimiters, checkRateLimit } from '@/lib/rateLimiter';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sse/notifications' });
const CHANNEL = 'notifications';
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const markReadSchema = z.object({
  notificationIds: z.array(z.string().cuid()).min(1).max(100).optional(),
  markAllRead: z.boolean().optional(),
});

const updatePreferencesSchema = z.object({
  enabled: z.boolean().optional(),
  types: z.array(z.string()).optional(),
  channels: z.array(z.enum(['in_app', 'email', 'push'])).optional(),
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  }).optional(),
});

const batchUpdateSchema = z.object({
  notificationIds: z.array(z.string().cuid()).min(1).max(100),
  action: z.enum(['read', 'unread', 'archive', 'delete', 'pin', 'unpin']),
});

const deleteSchema = z.object({
  notificationIds: z.array(z.string().cuid()).min(1).max(100).optional(),
  deleteAll: z.boolean().optional(),
  olderThan: z.string().datetime().optional(),
  archived: z.boolean().optional(),
});

// =============================================================================
// HELPERS
// =============================================================================

function getRequestContext(req: NextRequest) {
  return {
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
    requestId: req.headers.get('x-request-id') || crypto.randomUUID(),
    lastEventId: req.headers.get('Last-Event-ID'),
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

async function getUnreadCount(userId: string) {
  const [unreadCount, totalCount] = await Promise.all([
    prisma.notification.count({ where: { userId, isRead: false, isArchived: false } }),
    prisma.notification.count({ where: { userId, isArchived: false } }),
  ]);
  return { unreadCount, totalCount };
}

async function getMissedNotifications(userId: string, lastEventId: string | null): Promise<SSENotificationPayload[]> {
  const parsed = parseLastEventId(lastEventId);
  if (!parsed) return [];

  const notifications = await prisma.notification.findMany({
    where: { userId, createdAt: { gt: new Date(parsed.timestamp) }, isArchived: false },
    orderBy: { createdAt: 'asc' },
    take: 50,
    select: {
      id: true, type: true, title: true, message: true, priority: true,
      actionUrl: true, actionLabel: true, metadata: true, createdAt: true,
    },
  });

  return notifications.map(n => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    priority: n.priority.toLowerCase() as 'low' | 'normal' | 'high' | 'urgent',
    actionUrl: n.actionUrl || undefined,
    actionLabel: n.actionLabel || undefined,
    metadata: n.metadata as Record<string, unknown> | undefined,
    createdAt: n.createdAt.toISOString(),
  }));
}

// =============================================================================
// GET - Subscribe to Notification Stream
// =============================================================================

export async function GET(req: NextRequest) {
  const { requestId, lastEventId, userAgent, ip } = getRequestContext(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Authentication required', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId } }
      );
    }

    const userId = session.user.id;
    const clientId = crypto.randomUUID();

    log.info('SSE notifications connection', { userId, clientId, lastEventId });

    const { stream, send, close, getStats } = createSSEStream({
      heartbeatInterval: 30000,
      retryInterval: 5000,
      onClose: () => {
      
        sseConnectionManager.removeConnection(clientId);
        log.info('SSE notifications closed', { userId, clientId });
        log.debug('user stats is ',{getStats})
      },
    });

    // Register connection
    const addResult = sseConnectionManager.addConnection({
      id: clientId,
      userId,
      controller: { enqueue: () => send({ data: '' }), close } as unknown as ReadableStreamDefaultController<Uint8Array>,
      createdAt: new Date(),
      lastPing: new Date(),
      channel: CHANNEL,
      metadata: { userAgent, ip },
      messageCount: 0,
      bytesTransferred: 0,
    });

    if (!addResult.success) {
      return new NextResponse(
        JSON.stringify({ success: false, error: addResult.error, code: 'CONNECTION_LIMIT' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId } }
      );
    }

    // Send initial data
    setTimeout(async () => {
      try {
        const counts = await getUnreadCount(userId);
        send({ id: generateEventId(), event: SSEEventTypes.NOTIFICATION_COUNT, data: counts });

        if (lastEventId) {
          const missed = await getMissedNotifications(userId, lastEventId);
          for (const notification of missed) {
            send({ id: generateEventId(), event: SSEEventTypes.NOTIFICATION, data: notification });
          }
        }
      } catch (error) {
        log.error('Failed to send initial data', { userId, clientId }, error);
      }
    }, 100);

    return new Response(stream, {
      status: 200,
      headers: getSSEHeaders({ 'X-Request-ID': requestId, 'X-Client-ID': clientId }),
    });

  } catch (error) {
    log.error('SSE notifications failed', {}, error);
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Connection failed', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId } }
    );
  }
}

// =============================================================================
// POST - Mark Notifications as Read
// =============================================================================

export async function POST(req: NextRequest) {
  const { requestId } = getRequestContext(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');

    const userId = session.user.id;

    const rateLimitResult = await checkRateLimit(`sse:notifications:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429, headers: { 'Retry-After': '60', 'X-Request-ID': requestId } }
      );
    }

    let body: unknown;
    try { body = await req.json(); } catch { throw new ValidationError('Invalid JSON'); }

    const validated = markReadSchema.safeParse(body);
    if (!validated.success) {
      throw new ValidationError('Validation failed', validated.error.errors.map(e => ({
        field: e.path.join('.'), message: e.message,
      })));
    }

    const { notificationIds, markAllRead } = validated.data;

    let updatedCount = 0;

    if (markAllRead) {
      const result = await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      updatedCount = result.count;
    } else if (notificationIds && notificationIds.length > 0) {
      const result = await prisma.notification.updateMany({
        where: { id: { in: notificationIds }, userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      updatedCount = result.count;
    }

    // Send SSE update
    const counts = await getUnreadCount(userId);
    sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: SSEEventTypes.NOTIFICATION_COUNT,
      data: counts,
    });

    if (notificationIds) {
      sseConnectionManager.sendToUser(userId, {
        id: generateEventId(),
        event: SSEEventTypes.NOTIFICATION_READ,
        data: { notificationIds, readAt: new Date().toISOString() },
      });
    }

    log.info('Notifications marked read', { userId, updatedCount });

    return successResponse({ updatedCount, ...counts }, 200, { 'X-Request-ID': requestId });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// PUT - Update Notification Preferences
// =============================================================================

export async function PUT(req: NextRequest) {
  const { requestId } = getRequestContext(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');

    const userId = session.user.id;

    let body: unknown;
    try { body = await req.json(); } catch { throw new ValidationError('Invalid JSON'); }

    const validated = updatePreferencesSchema.safeParse(body);
    if (!validated.success) {
      throw new ValidationError('Validation failed', validated.error.errors.map(e => ({
        field: e.path.join('.'), message: e.message,
      })));
    }

    const data = validated.data;

    const preferences = await prisma.notificationPreferences.upsert({
      where: { userId },
      update: {
        enabled: data.enabled,
        inAppEnabled: data.channels?.includes('in_app'),
        emailEnabled: data.channels?.includes('email'),
        pushEnabled: data.channels?.includes('push'),
        quietHoursEnabled: data.quietHours?.enabled,
        quietHoursStart: data.quietHours?.start,
        quietHoursEnd: data.quietHours?.end,
        updatedAt: new Date(),
      },
      create: {
        userId,
        enabled: data.enabled ?? true,
        inAppEnabled: data.channels?.includes('in_app') ?? true,
        emailEnabled: data.channels?.includes('email') ?? true,
        pushEnabled: data.channels?.includes('push') ?? false,
        quietHoursEnabled: data.quietHours?.enabled ?? false,
        quietHoursStart: data.quietHours?.start ?? '22:00',
        quietHoursEnd: data.quietHours?.end ?? '08:00',
      },
    });

    log.info('Notification preferences updated', { userId });

    return successResponse({ preferences }, 200, { 'X-Request-ID': requestId });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// PATCH - Batch Update Notifications
// =============================================================================

export async function PATCH(req: NextRequest) {
  const { requestId } = getRequestContext(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');

    const userId = session.user.id;

    let body: unknown;
    try { body = await req.json(); } catch { throw new ValidationError('Invalid JSON'); }

    const validated = batchUpdateSchema.safeParse(body);
    if (!validated.success) {
      throw new ValidationError('Validation failed', validated.error.errors.map(e => ({
        field: e.path.join('.'), message: e.message,
      })));
    }

    const { notificationIds, action } = validated.data;

    let updateData: Record<string, unknown> = {};
    switch (action) {
      case 'read':
        updateData = { isRead: true, readAt: new Date() };
        break;
      case 'unread':
        updateData = { isRead: false, readAt: null };
        break;
      case 'archive':
        updateData = { isArchived: true, archivedAt: new Date() };
        break;
      case 'delete':
        await prisma.notification.deleteMany({
          where: { id: { in: notificationIds }, userId },
        });
        const counts = await getUnreadCount(userId);
        sseConnectionManager.sendToUser(userId, {
          id: generateEventId(),
          event: SSEEventTypes.NOTIFICATION_COUNT,
          data: counts,
        });
        return successResponse({ deletedCount: notificationIds.length, ...counts }, 200, { 'X-Request-ID': requestId });
      default:
        throw new ValidationError(`Unknown action: ${action}`);
    }

    const result = await prisma.notification.updateMany({
      where: { id: { in: notificationIds }, userId },
      data: updateData,
    });

    const counts = await getUnreadCount(userId);
    sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: SSEEventTypes.NOTIFICATION_COUNT,
      data: counts,
    });

    log.info('Batch notification update', { userId, action, count: result.count });

    return successResponse({ updatedCount: result.count, action, ...counts }, 200, { 'X-Request-ID': requestId });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// DELETE - Delete/Archive Notifications
// =============================================================================

export async function DELETE(req: NextRequest) {
  const { requestId } = getRequestContext(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');

    const userId = session.user.id;

    let body: unknown;
    try { body = await req.json(); } catch { throw new ValidationError('Invalid JSON'); }

    const validated = deleteSchema.safeParse(body);
    if (!validated.success) {
      throw new ValidationError('Validation failed', validated.error.errors.map(e => ({
        field: e.path.join('.'), message: e.message,
      })));
    }

    const { notificationIds, deleteAll, olderThan, archived } = validated.data;

    let deletedCount = 0;

    if (deleteAll) {
      const where: Record<string, unknown> = { userId };
      if (olderThan) where.createdAt = { lt: new Date(olderThan) };
      if (archived !== undefined) where.isArchived = archived;

      const result = await prisma.notification.deleteMany({ where });
      deletedCount = result.count;
    } else if (notificationIds && notificationIds.length > 0) {
      const result = await prisma.notification.deleteMany({
        where: { id: { in: notificationIds }, userId },
      });
      deletedCount = result.count;
    }

    const counts = await getUnreadCount(userId);
    sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: SSEEventTypes.NOTIFICATION_COUNT,
      data: counts,
    });

    log.info('Notifications deleted', { userId, deletedCount });

    return successResponse({ deletedCount, ...counts }, 200, { 'X-Request-ID': requestId });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// HEAD - Get Unread Count
// =============================================================================

export async function HEAD(req: NextRequest) {
  const { requestId } = getRequestContext(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401, headers: { 'X-Request-ID': requestId } });
    }

    const counts = await getUnreadCount(session.user.id);

    return new NextResponse(null, {
      status: counts.unreadCount > 0 ? 200 : 204,
      headers: {
        'X-Request-ID': requestId,
        'X-Unread-Count': String(counts.unreadCount),
        'X-Total-Count': String(counts.totalCount),
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Last-Event-ID',
      'Access-Control-Max-Age': '86400',
    },
  });
}