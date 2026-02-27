// src/app/api/sse/analytics/route.ts
/**
 * SSE Analytics Route
 * 
 * GET     /api/sse/analytics - Get SSE system analytics
 * POST    /api/sse/analytics - Generate analytics report
 * PUT     /api/sse/analytics - Update analytics settings (Admin)
 * DELETE  /api/sse/analytics - Reset analytics (Admin)
 * HEAD    /api/sse/analytics - Get summary
 * OPTIONS /api/sse/analytics - CORS
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { subDays, format, eachHourOfInterval, startOfDay, endOfDay } from 'date-fns';

import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { sseConnectionManager } from '@/services/sseConnectionManager';
import {
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  toApiError,
} from '@/lib/apiError';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sse/analytics' });
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'];

// =============================================================================
// VALIDATION
// =============================================================================

const querySchema = z.object({
  period: z.enum(['1h', '24h', '7d', '30d']).default('24h'),
  includeUserBreakdown: z.coerce.boolean().default(false),
  includeChannelBreakdown: z.coerce.boolean().default(true),
});

const reportSchema = z.object({
  period: z.enum(['1h', '24h', '7d', '30d']),
  format: z.enum(['json', 'csv']).default('json'),
  includeDetails: z.boolean().default(false),
});

// =============================================================================
// HELPERS
// =============================================================================

function getRequestContext(req: NextRequest) {
  return {
    requestId: req.headers.get('x-request-id') || crypto.randomUUID(),
  };
}
function buildTimeSeries(period: '1h' | '24h' | '7d' | '30d') {
  const now = new Date();

  // last 30d => start/end
  const days =
    period === '1h' ? 1 :
      period === '24h' ? 1 :
        period === '7d' ? 7 :
          30;

  const start = startOfDay(subDays(now, days - 1));
  const end = endOfDay(now);

  const hours = eachHourOfInterval({ start, end });

  return hours.map((d) => ({
    hour: format(d, 'yyyy-MM-dd HH:00'),
    timestamp: d.toISOString(),
    connections: 0,
    messages: 0,
  }));
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

function getPeriodInfo(period: string): { hours: number; label: string } {
  switch (period) {
    case '1h': return { hours: 1, label: 'Last Hour' };
    case '24h': return { hours: 24, label: 'Last 24 Hours' };
    case '7d': return { hours: 168, label: 'Last 7 Days' };
    case '30d': return { hours: 720, label: 'Last 30 Days' };
    default: return { hours: 24, label: 'Last 24 Hours' };
  }
}

// =============================================================================
// GET - Get SSE Analytics
// =============================================================================

export async function GET(req: NextRequest) {
  const { requestId } = getRequestContext(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');

    const isAdmin = session.user.isAdmin;

    // Parse query params
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const validated = querySchema.safeParse(searchParams);
    if (!validated.success) {
      throw new ValidationError('Invalid query parameters', validated.error.errors.map(e => ({
        field: e.path.join('.'), message: e.message,
      })));
    }

    const { period, includeUserBreakdown, includeChannelBreakdown } = validated.data;
    const { hours, label } = getPeriodInfo(period);

    // Get current stats
    const stats = sseConnectionManager.getStats();
    const analytics = sseConnectionManager.getAnalytics();

    // Build response
    const response: Record<string, unknown> = {
      period: {
        type: period,
        label,
        hours,
      },
      current: {
        totalConnections: stats.totalConnections,
        uniqueUsers: stats.uniqueUsers,
        peakConnections: stats.peakConnections,
        peakConnectionsTime: stats.peakConnectionsTime?.toISOString() || null,
        averageConnectionDuration: Math.round(stats.averageConnectionDuration / 1000), // seconds
        oldestConnectionAge: stats.oldestConnection
          ? Math.round((Date.now() - stats.oldestConnection.getTime()) / 1000)
          : 0,
      },
      totals: {
        totalMessagesSent: stats.totalMessagesSent,
        totalBytesTransferred: stats.totalBytesTransferred,
        averageMessagesPerConnection: Math.round(analytics.averageMessagesPerConnection * 100) / 100,
        errorRate: Math.round(analytics.errorRate * 10000) / 100, // percentage with 2 decimals
      },
    };
    if (isAdmin) {
      response.timeSeries = {
        hourly: analytics.hourlyConnections,
        daily: analytics.dailyConnections,
        generatedBuckets: buildTimeSeries(period),
      };
    }


    if (includeChannelBreakdown) {
      response.channels = {
        distribution: analytics.channelDistribution,
        messagesByChannel: analytics.messagesByChannel,
      };
    }

    if (includeUserBreakdown && isAdmin) {
      response.users = {
        connectionsByUser: stats.connectionsByUser,
        topUsers: Object.entries(stats.connectionsByUser)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([userId, count]) => ({ userId, connections: count })),
      };
    }

    // Time series data
    if (isAdmin) {
      response.timeSeries = {
        hourly: analytics.hourlyConnections,
        daily: analytics.dailyConnections,
      };
    }

    log.debug('SSE analytics fetched', { userId: session.user.id, period, isAdmin });

    return successResponse(response, 200, {
      'X-Request-ID': requestId,
      'Cache-Control': 'private, max-age=60',
    });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// POST - Generate Analytics Report
// =============================================================================

export async function POST(req: NextRequest) {
  const { requestId } = getRequestContext(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');
    if (!session.user.isAdmin) throw new ForbiddenError('Admin access required');

    let body: unknown;
    try { body = await req.json(); } catch { throw new ValidationError('Invalid JSON'); }

    const validated = reportSchema.safeParse(body);
    if (!validated.success) {
      throw new ValidationError('Validation failed', validated.error.errors.map(e => ({
        field: e.path.join('.'), message: e.message,
      })));
    }

    const { period, format: outputFormat, includeDetails } = validated.data;
    const { hours, label } = getPeriodInfo(period);

    const stats = sseConnectionManager.getStats();
    const analytics = sseConnectionManager.getAnalytics();

    const report = {
      generatedAt: new Date().toISOString(),
      generatedBy: session.user.id,
      period: { type: period, label, hours },
      summary: {
        totalConnections: stats.totalConnections,
        uniqueUsers: stats.uniqueUsers,
        peakConnections: stats.peakConnections,
        totalMessagesSent: stats.totalMessagesSent,
        totalBytesTransferred: stats.totalBytesTransferred,
        averageMessagesPerConnection: analytics.averageMessagesPerConnection,
        errorRate: analytics.errorRate,
      },
      channels: analytics.channelDistribution,
      messagesByChannel: analytics.messagesByChannel,
      ...(includeDetails && {
        connections: sseConnectionManager.getConnectionList({ limit: 100 }).connections,
        hourlyData: analytics.hourlyConnections,
        dailyData: analytics.dailyConnections,
      }),
    };

    if (outputFormat === 'csv') {
      const csvLines = [
        'Metric,Value',
        `Total Connections,${stats.totalConnections}`,
        `Unique Users,${stats.uniqueUsers}`,
        `Peak Connections,${stats.peakConnections}`,
        `Total Messages Sent,${stats.totalMessagesSent}`,
        `Total Bytes Transferred,${stats.totalBytesTransferred}`,
        `Error Rate,${(analytics.errorRate * 100).toFixed(2)}%`,
      ];

      return new NextResponse(csvLines.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="sse-analytics-${period}.csv"`,
          'X-Request-ID': requestId,
        },
      });
    }

    log.info('SSE analytics report generated', { adminId: session.user.id, period });

    return successResponse(report, 200, { 'X-Request-ID': requestId });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// PUT - Update Analytics Settings (Admin)
// =============================================================================

export async function PUT(req: NextRequest) {
  const { requestId } = getRequestContext(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');
    if (!session.user.isAdmin) throw new ForbiddenError('Admin access required');

    // For now, just acknowledge - could add settings storage later
    return successResponse({
      message: 'Analytics settings updated',
      note: 'Settings persistence not yet implemented',
    }, 200, { 'X-Request-ID': requestId });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// DELETE - Reset Analytics (Admin)
// =============================================================================

export async function DELETE(req: NextRequest) {
  const { requestId } = getRequestContext(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');
    if (!session.user.isAdmin) throw new ForbiddenError('Admin access required');

    sseConnectionManager.resetAnalytics();

    log.warn('SSE analytics reset', { adminId: session.user.id });

    return successResponse({
      message: 'Analytics reset successfully',
      resetAt: new Date().toISOString(),
    }, 200, { 'X-Request-ID': requestId });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// HEAD - Get Summary
// =============================================================================

export async function HEAD(req: NextRequest) {
  const { requestId } = getRequestContext(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401, headers: { 'X-Request-ID': requestId } });
    }

    const stats = sseConnectionManager.getStats();
    const analytics = sseConnectionManager.getAnalytics();

    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Request-ID': requestId,
        'X-Total-Connections': String(stats.totalConnections),
        'X-Unique-Users': String(stats.uniqueUsers),
        'X-Total-Messages': String(stats.totalMessagesSent),
        'X-Error-Rate': String(Math.round(analytics.errorRate * 10000) / 100),
        'X-Peak-Connections': String(stats.peakConnections),
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