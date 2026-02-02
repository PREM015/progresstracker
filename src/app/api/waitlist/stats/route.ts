// src/app/api/waitlist/stats/route.ts
// =============================================================================
// WAITLIST STATISTICS ROUTES
// Handles: GET, OPTIONS, HEAD
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { waitlistService } from '@/services/waitlistService';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT_PUBLIC = 30;
const RATE_LIMIT_ADMIN = 100;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=60', // Cache for 1 minute
};

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function addSecurityHeaders(response: NextResponse, requestId: string): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);
  return response;
}

// =============================================================================
// OPTIONS - CORS Preflight
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();

  const response = new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });

  return addSecurityHeaders(response, requestId);
}

// =============================================================================
// HEAD - Quick stats check
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT_PUBLIC, ip);

    if (!rateLimitResult.success) {
      return addSecurityHeaders(new NextResponse(null, { status: 429 }), requestId);
    }

    const total = await prisma.waitlist.count();

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Total-Signups': String(total),
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });

    return addSecurityHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD waitlist/stats failed', { requestId }, error);
    return addSecurityHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// GET - Get waitlist statistics
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    
    // Check for admin session
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.isAdmin || session?.user?.role === 'admin';

    // Different rate limits for admin vs public
    const rateLimit = isAdmin ? RATE_LIMIT_ADMIN : RATE_LIMIT_PUBLIC;
    const rateLimitResult = await checkLimit(apiRateLimiter, rateLimit, ip);

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for waitlist stats', { ip, requestId });
      return addSecurityHeaders(apiResponse.rateLimited(60, requestId), requestId);
    }

    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    logger.debug('Fetching waitlist stats', {
      requestId,
      isAdmin,
      detailed,
    });

    // Basic stats (available to everyone)
    const basicStats = await waitlistService.getStats();

    // If not admin or not requesting detailed stats, return basic public stats
    if (!isAdmin && !detailed) {
      const publicStats = {
        total: basicStats.total,
        message: 'Join the waitlist to see your position!',
      };

      const response = apiResponse.success(publicStats, {
        meta: { requestId },
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      });

      return addSecurityHeaders(response, requestId);
    }

    // Detailed stats (admin only)
    if (detailed && !isAdmin) {
      return addSecurityHeaders(
        apiResponse.forbidden('Admin access required for detailed stats', requestId),
        requestId
      );
    }

    // Get additional detailed stats for admins
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      recentSignups,
      weeklyGrowth,
      monthlyGrowth,
      conversionData,
      topSources,
    ] = await Promise.all([
      // Recent signups
      prisma.waitlist.findMany({
        where: { createdAt: { gte: weekAgo } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          email: true,
          name: true,
          source: true,
          status: true,
          position: true,
          createdAt: true,
        },
      }),
      // Weekly growth
      prisma.waitlist.count({
        where: { createdAt: { gte: weekAgo } },
      }),
      // Monthly growth
      prisma.waitlist.count({
        where: { createdAt: { gte: monthAgo } },
      }),
      // Conversion data
      prisma.waitlist.findMany({
        where: { status: 'joined' },
        select: { createdAt: true, joinedAt: true },
      }),
      // Top sources
      prisma.waitlist.groupBy({
        by: ['source'],
        _count: true,
        where: { source: { not: null } },
        orderBy: { _count: { source: 'desc' } },
        take: 10,
      }),
    ]);

    // Calculate average wait time
    let avgWaitTimeDays = 0;
    if (conversionData.length > 0) {
      const totalWaitTime = conversionData.reduce((sum, entry) => {
        if (entry.joinedAt) {
          const waitMs = entry.joinedAt.getTime() - entry.createdAt.getTime();
          return sum + waitMs / (1000 * 60 * 60 * 24); // Convert to days
        }
        return sum;
      }, 0);
      avgWaitTimeDays = Math.round(totalWaitTime / conversionData.length);
    }

    // Calculate conversion rate
    const conversionRate = basicStats.total > 0
      ? Math.round((basicStats.joined / basicStats.total) * 100)
      : 0;

    // Daily signups for the last 7 days
    const dailySignups: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const count = await prisma.waitlist.count({
        where: {
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      });

      dailySignups.push({
        date: dayStart.toISOString().split('T')[0],
        count,
      });
    }

    const detailedStats = {
      ...basicStats,
      conversionRate,
      avgWaitTimeDays,
      growthThisWeek: weeklyGrowth,
      growthThisMonth: monthlyGrowth,
      topSources: topSources.map((s) => ({
        source: s.source || 'unknown',
        count: s._count,
      })),
      dailySignups,
      recentSignups: recentSignups.map((s) => ({
        ...s,
        email: maskEmail(s.email), // Mask email for privacy
      })),
    };

    logger.info('Waitlist stats fetched', {
      requestId,
      isAdmin,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(detailedStats, {
      meta: { requestId },
      headers: {
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });

    return addSecurityHeaders(response, requestId);
  } catch (error) {
    logger.error('GET waitlist/stats failed', { requestId }, error);
    return addSecurityHeaders(
      apiResponse.internalError('Failed to fetch waitlist stats', requestId),
      requestId
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***.***';
  
  const maskedLocal = local.length > 2
    ? `${local[0]}***${local[local.length - 1]}`
    : '***';
  
  return `${maskedLocal}@${domain}`;
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';