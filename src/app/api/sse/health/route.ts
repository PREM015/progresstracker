// src/app/api/sse/health/route.ts
/**
 * SSE Health Check Route
 * 
 * GET     /api/sse/health - Get SSE system health
 * POST    /api/sse/health - Run health check
 * PUT     /api/sse/health - Update health check settings (Admin)
 * DELETE  /api/sse/health - Force cleanup (Admin)
 * HEAD    /api/sse/health - Quick health status
 * OPTIONS /api/sse/health - CORS
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
import { checkDatabaseConnection } from '@/lib/prisma';
import { cache } from '@/lib/redis';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sse/health' });
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'];

// =============================================================================
// VALIDATION
// =============================================================================

const cleanupSchema = z.object({
  closeStale: z.boolean().default(true),
  staleThresholdMinutes: z.number().int().min(1).max(60).default(5),
  notifyUsers: z.boolean().default(false),
});

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

// =============================================================================
// GET - Get Health Status
// =============================================================================

export async function GET(req: NextRequest) {
  const { requestId } = getRequestContext(req);
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');

    const isAdmin = session.user.isAdmin;

    // Get SSE stats
    const stats = sseConnectionManager.getStats();
    const analytics = sseConnectionManager.getAnalytics();

    // Determine health status
    const errorRateThreshold = 0.1; // 10%
    const connectionThreshold = 10000; // Max reasonable connections

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const issues: string[] = [];

    if (analytics.errorRate > errorRateThreshold) {
      status = 'degraded';
      issues.push(`High error rate: ${(analytics.errorRate * 100).toFixed(2)}%`);
    }

    if (stats.totalConnections > connectionThreshold) {
      status = 'degraded';
      issues.push(`High connection count: ${stats.totalConnections}`);
    }

    // Check dependencies (admin only for detailed info)
    let dependencies: Record<string, unknown> = {};
    if (isAdmin) {
      const [dbHealth, redisHealth] = await Promise.allSettled([
        checkDatabaseConnection(),
        (async () => {
          await cache.set('__healthcheck__', 'ok', 10);
          const ok = await cache.get<string>('__healthcheck__');
          if (ok !== 'ok') throw new Error('Redis health check failed');
          return { connected: true };
        })(),
      ]);

dependencies = {
  database:
    dbHealth.status === 'fulfilled'
      ? dbHealth.value
      : { connected: false, error: 'Check failed' },

  redis:
    redisHealth.status === 'fulfilled'
      ? { connected: true }
      : { connected: false, error: 'Check failed' },
};
if (!cache) throw new Error('Redis cache not configured');

      // Update status based on dependencies
      if (dbHealth.status === 'rejected' || (dbHealth.status === 'fulfilled' && !dbHealth.value.connected)) {
        status = 'unhealthy';
        issues.push('Database connection failed');
      }
    }

    const responseTime = Date.now() - startTime;

    const response: Record<string, unknown> = {
      status,
      responseTime,
      issues: issues.length > 0 ? issues : undefined,
      sse: {
        totalConnections: stats.totalConnections,
        uniqueUsers: stats.uniqueUsers,
        channels: Object.keys(stats.connectionsByChannel),
        errorRate: Math.round(analytics.errorRate * 10000) / 100,
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };

    if (isAdmin) {
      response.details = {
        peakConnections: stats.peakConnections,
        peakConnectionsTime: stats.peakConnectionsTime?.toISOString(),
        totalMessagesSent: stats.totalMessagesSent,
        totalBytesTransferred: stats.totalBytesTransferred,
        averageConnectionDuration: Math.round(stats.averageConnectionDuration / 1000),
        connectionsByChannel: stats.connectionsByChannel,
      };
      response.dependencies = dependencies;
      response.memory = process.memoryUsage();
    }

    const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

    return successResponse(response, httpStatus, {
      'X-Request-ID': requestId,
      'X-Health-Status': status,
      'X-Response-Time': `${responseTime}ms`,
      'Cache-Control': 'no-cache',
    });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// POST - Run Health Check
// =============================================================================

export async function POST(req: NextRequest) {
  const { requestId } = getRequestContext(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');

    const startTime = Date.now();

    // Test SSE by sending ping to all user's connections
    const userConns = sseConnectionManager.getUserConnections(session.user.id);
    let successCount = 0;
    let failCount = 0;

    for (const conn of userConns) {
      const success = sseConnectionManager.sendToConnection(conn.id, {
        id: generateEventId(),
        event: 'health:ping',
        data: { timestamp: new Date().toISOString() },
      });
      if (success) successCount++;
      else failCount++;
    }

    const responseTime = Date.now() - startTime;

    return successResponse({
      message: 'Health check completed',
      connectionsTested: userConns.length,
      successful: successCount,
      failed: failCount,
      responseTime,
    }, 200, { 'X-Request-ID': requestId });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// PUT - Update Health Check Settings (Admin)
// =============================================================================

export async function PUT(req: NextRequest) {
  const { requestId } = getRequestContext(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');
    if (!session.user.isAdmin) throw new ForbiddenError('Admin access required');

    // Placeholder for settings update
    return successResponse({
      message: 'Health check settings updated',
      note: 'Settings persistence not yet implemented',
    }, 200, { 'X-Request-ID': requestId });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// DELETE - Force Cleanup (Admin)
// =============================================================================

export async function DELETE(req: NextRequest) {
  const { requestId } = getRequestContext(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');
    if (!session.user.isAdmin) throw new ForbiddenError('Admin access required');

    let body: unknown;
    try { body = await req.json(); } catch { body = {}; }

    const validated = cleanupSchema.safeParse(body);
    if (!validated.success) {
      throw new ValidationError('Validation failed', validated.error.errors.map(e => ({
        field: e.path.join('.'), message: e.message,
      })));
    }

    const { closeStale, staleThresholdMinutes, notifyUsers } = validated.data;

    let closedCount = 0;

    if (closeStale) {
      const now = Date.now();
      const threshold = staleThresholdMinutes * 60 * 1000;
      const connections = sseConnectionManager.getAllConnections();

      for (const conn of connections) {
        if (now - conn.lastPing.getTime() > threshold) {
          if (notifyUsers) {
            sseConnectionManager.sendToConnection(conn.id, {
              id: generateEventId(),
              event: SSEEventTypes.CLOSE,
              data: { reason: 'Connection timeout', closedAt: new Date().toISOString() },
            });
          }
          sseConnectionManager.removeConnection(conn.id);
          closedCount++;
        }
      }
    }

    log.info('SSE cleanup performed', {
      adminId: session.user.id,
      closedCount,
      staleThresholdMinutes,
    });

    return successResponse({
      message: 'Cleanup completed',
      closedConnections: closedCount,
      remainingConnections: sseConnectionManager.getStats().totalConnections,
    }, 200, { 'X-Request-ID': requestId });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// HEAD - Quick Health Status
// =============================================================================

export async function HEAD(req: NextRequest) {
  const { requestId } = getRequestContext(req);

  try {
    const stats = sseConnectionManager.getStats();
    const analytics = sseConnectionManager.getAnalytics();

    // Determine status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (analytics.errorRate > 0.1) status = 'degraded';
    if (stats.totalConnections > 10000) status = 'degraded';

    const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

    return new NextResponse(null, {
      status: httpStatus,
      headers: {
        'X-Request-ID': requestId,
        'X-Health-Status': status,
        'X-Total-Connections': String(stats.totalConnections),
        'X-Unique-Users': String(stats.uniqueUsers),
        'X-Error-Rate': String(Math.round(analytics.errorRate * 10000) / 100),
        'X-Uptime': String(Math.round(process.uptime())),
      },
    });
  } catch {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'X-Request-ID': requestId,
        'X-Health-Status': 'unhealthy',
      },
    });
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