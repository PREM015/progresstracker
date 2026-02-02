// src/app/api/support-tickets/stats/route.ts
// =============================================================================
// SUPPORT TICKET STATISTICS API
// Methods: GET, OPTIONS, HEAD
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { supportService } from '@/services/supportService';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=60', // Cache for 1 minute
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  breakdown: z.enum(['daily', 'weekly', 'monthly']).optional(),
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(response: NextResponse, requestId: string, rateLimitResult?: { limit: number; remaining: number }): NextResponse {
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

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

// =============================================================================
// HEAD
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('X-Request-ID', requestId);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Cache-Control', 'private, max-age=60');
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
  response.headers.set('Access-Control-Max-Age', '86400');
    logger.info('request is ', { request })

    

  return addHeaders(response, requestId);
}

// =============================================================================
// GET - Get Statistics
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `support-stats:${ip}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId, rateLimitResult);
    }

    const userId = session.user.id;
    const isAdmin = Boolean(session.user.isAdmin || session.user.role === 'admin');

    // Parse query params
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      days: searchParams.get('days') || 30,
      breakdown: searchParams.get('breakdown') || undefined,
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { days, breakdown } = queryValidation.data;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Base where clause
    const baseWhere: Prisma.SupportTicketWhereInput = isAdmin ? {} : { userId };
    const periodWhere: Prisma.SupportTicketWhereInput = { ...baseWhere, createdAt: { gte: startDate } };

    // Get basic stats using service
    const basicStats = await supportService.getStats(isAdmin ? undefined : userId);

    // Get additional stats
    const [
      ticketsByCategory,
      ticketsByPriority,
      ticketsByStatus,
      recentTickets,
      avgResolutionTime,
      responseTimeStats,
    ] = await Promise.all([
      // By category
      prisma.supportTicket.groupBy({
        by: ['category'],
        where: periodWhere,
        _count: { id: true },
      }),

      // By priority
      prisma.supportTicket.groupBy({
        by: ['priority'],
        where: periodWhere,
        _count: { id: true },
      }),

      // By status
      prisma.supportTicket.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { id: true },
      }),

      // Recent tickets (last 5)
      prisma.supportTicket.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          status: true,
          priority: true,
          createdAt: true,
        },
      }),

      // Average resolution time (admin only)
      isAdmin
        ? prisma.$queryRaw<{ avgHours: number | null }[]>`
            SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600) as "avgHours"
            FROM "SupportTicket"
            WHERE "resolvedAt" IS NOT NULL
            AND "createdAt" >= ${startDate}
          `
        : [{ avgHours: null }],

      // Response time stats (admin only)
      isAdmin
        ? prisma.$queryRaw<{ avgResponseHours: number | null }[]>`
            SELECT AVG(EXTRACT(EPOCH FROM (
              (SELECT MIN("createdAt") FROM "TicketReply" WHERE "ticketId" = t.id AND "isStaffReply" = true)
              - t."createdAt"
            )) / 3600) as "avgResponseHours"
            FROM "SupportTicket" t
            WHERE EXISTS (SELECT 1 FROM "TicketReply" WHERE "ticketId" = t.id AND "isStaffReply" = true)
            AND t."createdAt" >= ${startDate}
          `
        : [{ avgResponseHours: null }],
    ]);

    // Calculate daily/weekly/monthly breakdown if requested
    let timeBreakdown: { date: string; count: number }[] = [];

    if (breakdown) {
      const tickets = await prisma.supportTicket.findMany({
        where: periodWhere,
        select: { createdAt: true },
      });

      const grouped = new Map<string, number>();

      tickets.forEach((ticket) => {
        let key: string;
        const date = ticket.createdAt;

        switch (breakdown) {
          case 'daily':
            key = date.toISOString().split('T')[0];
            break;
          case 'weekly':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().split('T')[0];
            break;
          case 'monthly':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
        }

        grouped.set(key, (grouped.get(key) || 0) + 1);
      });

      timeBreakdown = Array.from(grouped.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    const stats = {
      ...basicStats,
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
      byCategory: ticketsByCategory.reduce(
        (acc, item) => ({ ...acc, [item.category]: item._count.id }),
        {} as Record<string, number>
      ),
      byPriority: ticketsByPriority.reduce(
        (acc, item) => ({ ...acc, [item.priority]: item._count.id }),
        {} as Record<string, number>
      ),
      byStatus: ticketsByStatus.reduce(
        (acc, item) => ({ ...acc, [item.status]: item._count.id }),
        {} as Record<string, number>
      ),
      recentTickets,
      ...(isAdmin
        ? {
            avgResolutionTimeHours: avgResolutionTime[0]?.avgHours ?? null,
            avgFirstResponseTimeHours: responseTimeStats[0]?.avgResponseHours ?? null,
          }
        : {}),
      ...(breakdown ? { timeBreakdown } : {}),
    };

    logger.info('Stats fetched', {
      userId,
      isAdmin,
      days,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(stats, { meta: { requestId, isAdmin } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET support-tickets/stats failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch statistics', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';