// src/app/api/sse/connections/route.ts
/**
 * SSE Connections Management Route
 * 
 * GET     /api/sse/connections - List active connections
 * POST    /api/sse/connections - Broadcast to connections (Admin)
 * DELETE  /api/sse/connections - Close connections (Admin)
 * HEAD    /api/sse/connections - Get connection count
 * OPTIONS /api/sse/connections - CORS
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { sseConnectionManager } from '@/services/sseConnectionManager';
import { generateEventId, SSEEventTypes } from '@/lib/sse';
import {
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  toApiError,
} from '@/lib/apiError';
import { rateLimiters, checkRateLimit } from '@/lib/rateLimiter';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sse/connections' });
const ALLOWED_METHODS = ['GET', 'POST', 'DELETE', 'HEAD', 'OPTIONS'];

// =============================================================================
// VALIDATION
// =============================================================================

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  channel: z.enum(['notifications', 'sync']).optional(),
  userId: z.string().cuid().optional(),
  sortBy: z.enum(['createdAt', 'lastPing', 'messageCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const broadcastSchema = z.object({
  message: z.string().min(1).max(1000),
  title: z.string().max(100).optional(),
  type: z.enum(['info', 'warning', 'error', 'maintenance']).default('info'),
  targetUserIds: z.array(z.string().cuid()).optional(),
  targetChannel: z.enum(['notifications', 'sync']).optional(),
  targetConnectionIds: z.array(z.string().uuid()).optional(),
});

const closeSchema = z.object({
  connectionIds: z.array(z.string().uuid()).optional(),
  userIds: z.array(z.string().cuid()).optional(),
  channel: z.enum(['notifications', 'sync']).optional(),
  closeAll: z.boolean().default(false),
  reason: z.string().max(200).optional(),
});

// =============================================================================
// HELPERS
// =============================================================================

function getRequestContext(req: NextRequest) {
  return {
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
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

// =============================================================================
// GET - List Connections
// =============================================================================

export async function GET(req: NextRequest) {
  const { requestId } = getRequestContext(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');

    const userId = session.user.id;
    const isAdmin = session.user.isAdmin;

    // Parse query params
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const validated = querySchema.safeParse(searchParams);
    if (!validated.success) {
      throw new ValidationError('Invalid query parameters', validated.error.errors.map(e => ({
        field: e.path.join('.'), message: e.message,
      })));
    }

    const { page, limit, channel, userId: filterUserId, sortBy, sortOrder } = validated.data;

    // Non-admins can only see their own connections
    const effectiveUserId = isAdmin && filterUserId ? filterUserId : (isAdmin ? undefined : userId);

    const result = sseConnectionManager.getConnectionList({
      page,
      limit,
      channel,
      userId: effectiveUserId,
      sortBy,
      sortOrder,
    });

    // Mask user IDs for non-admins
    const connections = isAdmin ? result.connections : result.connections.map(c => ({
      ...c,
      userId: c.userId === userId ? c.userId : '[hidden]',
    }));

    return successResponse({
      connections,
      pagination: {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      ...(isAdmin && { stats: sseConnectionManager.getStats() }),
    }, 200, { 'X-Request-ID': requestId });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// POST - Broadcast Message (Admin Only)
// =============================================================================

export async function POST(req: NextRequest) {
  const { requestId, ip } = getRequestContext(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');
    if (!session.user.isAdmin) throw new ForbiddenError('Admin access required');
if (ip && ip !== "unknown") {
  const safeIp = ip.split(",")[0]?.trim();
  logger.info("Admin POST request IP captured", {
    requestId,
    adminId: session.user.id,
    ip: safeIp,
  });
}
if (ip && ip !== "unknown") {
  const safeIp = ip.split(",")[0]?.trim();

  const allowedAdminIps = new Set([
    "103.21.244.0",   // example
    "49.36.120.10",   // your home ip
    "127.0.0.1",      // local dev
  ]);

  if (safeIp && !allowedAdminIps.has(safeIp)) {
    logger.warn("Admin route blocked (IP not allowed)", {
      requestId,
      adminId: session.user.id,
      ip: safeIp,
    });

    throw new ForbiddenError("Admin access allowed only from trusted IPs");
  }
}
if (ip && ip !== "unknown") {
  const safeIp = ip.split(",")[0]?.trim();

  const allowed = (process.env.ADMIN_ALLOWED_IPS ?? "")
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);

  if (allowed.length > 0 && safeIp && !allowed.includes(safeIp)) {
    logger.warn("Admin route blocked (ENV allowlist)", {
      requestId,
      adminId: session.user.id,
      ip: safeIp,
    });

    throw new ForbiddenError("Admin access denied (IP not allowed)");
  }
}

    // Rate limiting
    const rateLimitResult = await checkRateLimit(`sse:broadcast:${session.user.id}`, rateLimiters.sync);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many broadcast requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429, headers: { 'Retry-After': '60', 'X-Request-ID': requestId } }
      );
    }

    let body: unknown;
    try { body = await req.json(); } catch { throw new ValidationError('Invalid JSON'); }

    const validated = broadcastSchema.safeParse(body);
    if (!validated.success) {
      throw new ValidationError('Validation failed', validated.error.errors.map(e => ({
        field: e.path.join('.'), message: e.message,
      })));
    }

    const { message, title, type, targetUserIds, targetChannel, targetConnectionIds } = validated.data;

    const event = {
      id: generateEventId(),
      event: type === 'maintenance' ? SSEEventTypes.MAINTENANCE : SSEEventTypes.SYSTEM_MESSAGE,
      data: {
        type,
        title: title || (type === 'maintenance' ? 'Maintenance Notice' : 'System Message'),
        message,
        sentBy: session.user.id,
        sentAt: new Date().toISOString(),
      },
    };

    let result = { sent: 0, failed: 0 };

    if (targetConnectionIds && targetConnectionIds.length > 0) {
      for (const connId of targetConnectionIds) {
        if (sseConnectionManager.sendToConnection(connId, event)) {
          result.sent++;
        } else {
          result.failed++;
        }
      }
    } else if (targetUserIds && targetUserIds.length > 0) {
      const r = sseConnectionManager.sendToUsers(targetUserIds, event);
      result = { sent: r.sent, failed: r.failed };
    } else if (targetChannel) {
      result = sseConnectionManager.sendToChannel(targetChannel, event);
    } else {
      result = sseConnectionManager.broadcast(event);
    }

    log.info('SSE broadcast sent', {
      adminId: session.user.id,
      type,
      target: targetConnectionIds ? 'connections' : targetUserIds ? 'users' : targetChannel || 'all',
      ...result,
    });

    return successResponse({
      message: 'Broadcast sent',
      eventId: event.id,
      ...result,
    }, 200, { 'X-Request-ID': requestId });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// DELETE - Close Connections (Admin Only)
// =============================================================================

export async function DELETE(req: NextRequest) {
  const { requestId } = getRequestContext(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');
    if (!session.user.isAdmin) throw new ForbiddenError('Admin access required');

    let body: unknown;
    try { body = await req.json(); } catch { throw new ValidationError('Invalid JSON'); }

    const validated = closeSchema.safeParse(body);
    if (!validated.success) {
      throw new ValidationError('Validation failed', validated.error.errors.map(e => ({
        field: e.path.join('.'), message: e.message,
      })));
    }

    const { connectionIds, userIds, channel, closeAll, reason } = validated.data;

    let closedCount = 0;

    if (closeAll) {
      closedCount = sseConnectionManager.closeAll();
      log.warn('All SSE connections closed by admin', { adminId: session.user.id, closedCount });
    } else if (connectionIds && connectionIds.length > 0) {
      closedCount = sseConnectionManager.closeConnections(connectionIds);
    } else if (userIds && userIds.length > 0) {
      for (const uid of userIds) {
        closedCount += sseConnectionManager.closeUserConnections(uid);
      }
    } else if (channel) {
      closedCount = sseConnectionManager.closeChannelConnections(channel);
    } else {
      throw new ValidationError('Provide connectionIds, userIds, channel, or set closeAll to true');
    }

    log.info('SSE connections closed by admin', {
      adminId: session.user.id,
      closedCount,
      reason,
      target: closeAll ? 'all' : { connectionIds, userIds, channel },
    });

    return successResponse({
      closedCount,
      reason,
    }, 200, { 'X-Request-ID': requestId });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}
// src/app/api/sse/connections/route.ts (continued)

// =============================================================================
// HEAD - Get Connection Count
// =============================================================================

export async function HEAD(req: NextRequest) {
  const { requestId } = getRequestContext(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401, headers: { 'X-Request-ID': requestId } });
    }

    const stats = sseConnectionManager.getStats();
    const userConns = sseConnectionManager.getUserConnections(session.user.id);

    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Request-ID': requestId,
        'X-Total-Connections': String(stats.totalConnections),
        'X-User-Connections': String(userConns.length),
        'X-Unique-Users': String(stats.uniqueUsers),
        'X-Peak-Connections': String(stats.peakConnections),
        'X-Channels': Object.keys(stats.connectionsByChannel).join(','),
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