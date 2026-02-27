// src/app/api/sse/route.ts
/**
 * Main SSE API Route
 * 
 * GET     /api/sse - Get SSE system info and endpoints
 * POST    /api/sse - Send test event to self (debug)
 * HEAD    /api/sse - Check SSE availability
 * OPTIONS /api/sse - Get allowed methods
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { UnauthorizedError, toApiError } from '@/lib/apiError';
import { sseConnectionManager } from '@/services/sseConnectionManager';
import { SSEEventTypes, generateEventId } from '@/lib/sse';
import { rateLimiters, checkRateLimit } from '@/lib/rateLimiter';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sse' });
const ALLOWED_METHODS = ['GET', 'POST', 'HEAD', 'OPTIONS'];

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
    {
      success: false,
      error: apiError.message,
      code: apiError.code,
      timestamp: apiError.timestamp,
      requestId,
    },
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
// GET - SSE System Information
// =============================================================================

export async function GET(req: NextRequest) {
  const { requestId } = getRequestContext(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;
    const isAdmin = session.user.isAdmin;

    // Get user's connections
    const userConnections = sseConnectionManager.getUserConnections(userId);

    // Build endpoints info
    const endpoints = [
      {
        path: '/api/sse/notifications',
        method: 'GET',
        description: 'Subscribe to real-time notifications',
        type: 'stream',
        events: [
          SSEEventTypes.NOTIFICATION,
          SSEEventTypes.NOTIFICATION_READ,
          SSEEventTypes.NOTIFICATION_COUNT,
          SSEEventTypes.ACHIEVEMENT_UNLOCKED,
          SSEEventTypes.GOAL_COMPLETED,
          SSEEventTypes.GOAL_REMINDER,
          SSEEventTypes.STREAK_ALERT,
        ],
      },
      {
        path: '/api/sse/sync',
        method: 'GET',
        description: 'Subscribe to sync status updates',
        type: 'stream',
        events: [
          SSEEventTypes.SYNC_STARTED,
          SSEEventTypes.SYNC_PROGRESS,
          SSEEventTypes.SYNC_COMPLETED,
          SSEEventTypes.SYNC_FAILED,
          SSEEventTypes.PLATFORM_SYNCED,
        ],
      },
      {
        path: '/api/sse/notifications',
        method: 'POST',
        description: 'Mark notification as read via SSE',
        type: 'action',
      },
      {
        path: '/api/sse/sync',
        method: 'POST',
        description: 'Trigger platform sync',
        type: 'action',
      },
      {
        path: '/api/sse/connections',
        method: 'GET',
        description: 'List active SSE connections',
        type: 'rest',
      },
      {
        path: '/api/sse/analytics',
        method: 'GET',
        description: 'Get SSE analytics',
        type: 'rest',
      },
    ];

    const response = {
      status: 'available',
      version: '1.0.0',
      endpoints,
      userConnections: {
        active: userConnections.length,
        maxAllowed: 5,
        details: userConnections.map(c => ({
          id: c.id,
          channel: c.channel,
          createdAt: c.createdAt,
          lastPing: c.lastPing,
          messageCount: c.messageCount,
        })),
      },
      systemEvents: [
        SSEEventTypes.CONNECTED,
        SSEEventTypes.HEARTBEAT,
        SSEEventTypes.CLOSE,
        SSEEventTypes.ERROR,
        SSEEventTypes.SYSTEM_MESSAGE,
        SSEEventTypes.MAINTENANCE,
      ],
      ...(isAdmin && {
        adminStats: sseConnectionManager.getStats(),
      }),
    };

    log.debug('SSE info requested', { userId });

    return successResponse(response, 200, {
      'X-Request-ID': requestId,
      'Cache-Control': 'no-cache',
    });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// POST - Send Test Event to Self
// =============================================================================

export async function POST(req: NextRequest) {
  const { requestId } = getRequestContext(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // Rate limiting
    const rateLimitResult = await checkRateLimit(`sse:test:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many test requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429, headers: { 'Retry-After': '60', 'X-Request-ID': requestId } }
      );
    }

    // Parse body
    let body: { message?: string; channel?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Use defaults
    }

    const message = body.message || 'Test SSE message';
    const channel = body.channel;

    // Send test event
    let result;
    if (channel) {
      const userConns = sseConnectionManager.getUserConnections(userId);
      const channelConns = userConns.filter(c => c.channel === channel);
      result = { sent: 0, failed: 0 };
      for (const conn of channelConns) {
        if (sseConnectionManager.sendToConnection(conn.id, {
          id: generateEventId(),
          event: 'test',
          data: { message, timestamp: new Date().toISOString() },
        })) {
          result.sent++;
        } else {
          result.failed++;
        }
      }
    } else {
      result = sseConnectionManager.sendToUser(userId, {
        id: generateEventId(),
        event: 'test',
        data: { message, timestamp: new Date().toISOString() },
      });
    }

    log.info('Test SSE event sent', { userId, channel, ...result });

    return successResponse(
      {
        message: 'Test event sent',
        ...result,
      },
      200,
      { 'X-Request-ID': requestId }
    );

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// HEAD - Check SSE Availability
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
        'X-SSE-Status': 'available',
        'X-SSE-Total-Connections': String(stats.totalConnections),
        'X-SSE-User-Connections': String(userConns.length),
        'X-SSE-Unique-Users': String(stats.uniqueUsers),
      },
    });
  } catch {
    return new NextResponse(null, { status: 500, headers: { 'X-Request-ID': requestId } });
  }
}

// =============================================================================
// OPTIONS - CORS
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