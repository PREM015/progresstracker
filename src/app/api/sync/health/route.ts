// =============================================================================
// src/app/api/sync/health/route.ts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, checkDatabaseConnection } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { SyncQueue } from '@/services/sync/syncQueue';
import { SyncScheduler } from '@/services/sync/syncScheduler';
import { sseConnectionManager } from '@/services/sseConnectionManager';
import { ScraperFactory } from '@/services/scrapers';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { SyncStatus } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sync/health' });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-cache, max-age=0',
};

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  rateLimitResult?: { limit: number; remaining: number }
): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);
  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }
  return response;
}

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

function determineOverallStatus(checks: Record<string, { status: HealthStatus }>): HealthStatus {
  const statuses = Object.values(checks).map(c => c.status);
  if (statuses.every(s => s === 'healthy')) return 'healthy';
  if (statuses.some(s => s === 'unhealthy')) return 'unhealthy';
  return 'degraded';
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return addHeaders(new NextResponse(null, { status: 204 }), generateRequestId());
}

// =============================================================================
// HEAD
// =============================================================================

export async function HEAD(): Promise<NextResponse> {
  const requestId = generateRequestId();
  
  try {
    const dbCheck = await checkDatabaseConnection();
    const status = dbCheck.connected ? 200 : 503;

    const response = new NextResponse(null, { status });
    response.headers.set('X-Health-Status', dbCheck.connected ? 'healthy' : 'unhealthy');
    response.headers.set('X-DB-Latency', String(dbCheck.latency || 0));
    
    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 503 });
  }
}

// =============================================================================
// GET - Health Check
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 120, `sync:health:${ip}`);
    
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    // Check authentication for detailed info
    const session = await getServerSession(authOptions);
    const isAuthenticated = !!session?.user?.id;
    const isAdmin = session?.user?.isAdmin;

    // Run health checks in parallel
    const [dbCheck, redisCheck, queueStats, schedulerStats] = await Promise.all([
      checkDatabaseConnection(),
      checkRedisConnection(),
      SyncQueue.getStats(),
      SyncScheduler.getStats(),
    ]);

    // Build checks object
    const checks: Record<string, { status: HealthStatus; latency?: number; message?: string; details?: unknown }> = {
      database: {
        status: dbCheck.connected ? 'healthy' : 'unhealthy',
        latency: dbCheck.latency,
        message: dbCheck.error || 'Connected',
      },
      redis: {
        status: redisCheck.connected ? 'healthy' : 'degraded',
        latency: redisCheck.latency,
        message: redisCheck.error || 'Connected',
      },
      queue: {
        status: queueStats.pending < 1000 ? 'healthy' : queueStats.pending < 5000 ? 'degraded' : 'unhealthy',
        message: `${queueStats.pending} pending, ${queueStats.inProgress} in progress`,
        details: isAuthenticated ? queueStats : undefined,
      },
      scheduler: {
        status: 'healthy',
        message: `${schedulerStats.totalScheduled} scheduled, ${schedulerStats.dueNow} due`,
        details: isAuthenticated ? schedulerStats : undefined,
      },
    };

    // Add scraper health if admin
    if (isAdmin) {
      const summary = ScraperFactory.getHealthSummary();
      const workingScrapers = summary.working;
      const totalScrapers = summary.total;

      checks.scrapers = {
        status:
          workingScrapers === totalScrapers
            ? 'healthy'
            : workingScrapers > totalScrapers / 2
            ? 'degraded'
            : 'unhealthy',
        message: `${workingScrapers}/${totalScrapers} scrapers operational`,
        details: summary,
      };
    }

    // Add SSE connections info
    const sseStats = sseConnectionManager.getStats();
    checks.sse = {
      status: 'healthy',
      message: `${sseStats.totalConnections} active connections`,
      details: sseStats,
    };

    // Add recent sync failures
    const recentFailures = await prisma.syncLog.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        status: SyncStatus.FAILED,
      },
    });

    const recentTotal = await prisma.syncLog.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });

    const failureRate = recentTotal > 0 ? (recentFailures / recentTotal) * 100 : 0;

    checks.syncHealth = {
      status: failureRate < 10 ? 'healthy' : failureRate < 30 ? 'degraded' : 'unhealthy',
      message: `${failureRate.toFixed(1)}% failure rate (last hour)`,
      details: {
        recentTotal,
        recentFailures,
        failureRate: Math.round(failureRate * 100) / 100,
      },
    };

    const overallStatus = determineOverallStatus(checks);
    const duration = Date.now() - startTime;

    const response = apiResponse.success(
      {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.APP_VERSION || '1.0.0',
        checks,
      },
      { 
        meta: { requestId, duration },
        status: overallStatus === 'unhealthy' ? 503 : 200,
      }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    log.error('GET health failed', { requestId }, error);
    
    const response = apiResponse.success(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        checks: {},
      },
      { meta: { requestId }, status: 503 }
    );

    return addHeaders(response, requestId);
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function checkRedisConnection(): Promise<{ connected: boolean; latency?: number; error?: string }> {
  const start = Date.now();
  try {
    await redis.ping();
    return {
      connected: true,
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Redis connection failed',
    };
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
