// src/app/api/support-tickets/sla/route.ts
// =============================================================================
// SLA TRACKING API
// Methods: GET, OPTIONS
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { TicketPriority, Prisma } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { getPriorityConfig, SUPPORT_PRIORITIES } from '@/config/support';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 20;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'private, max-age=60',
};

// =============================================================================
// VALIDATION
// =============================================================================

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
  priority: z.nativeEnum(TicketPriority).optional(),
  breachedOnly: z.coerce.boolean().default(false),
});

// =============================================================================
// HELPERS
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

interface SLAStatus {
  ticketId: string;
  ticketNumber: string;
  priority: TicketPriority;
  status: string;
  createdAt: Date;
  firstResponseAt: Date | null;
  resolvedAt: Date | null;
  responseDeadline: Date;
  resolutionDeadline: Date;
  responseBreached: boolean;
  resolutionBreached: boolean;
  responseTimeHours: number | null;
  resolutionTimeHours: number | null;
  responseTimeRemaining: number | null;
  resolutionTimeRemaining: number | null;
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

// =============================================================================
// GET - Get SLA Status
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `sla:${ip}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId, rateLimitResult);
    }

    const isAdmin = Boolean(session.user.isAdmin || session.user.role === 'admin');

    // Only admins can view SLA data
    if (!isAdmin) {
      return addHeaders(apiResponse.forbidden('Admin access required', requestId), requestId, rateLimitResult);
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      days: searchParams.get('days') || 30,
      priority: searchParams.get('priority') || undefined,
      breachedOnly: searchParams.get('breachedOnly') || 'false',
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { days, priority, breachedOnly } = queryValidation.data;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build where clause
    const where: Prisma.SupportTicketWhereInput = {
      createdAt: { gte: startDate },
    };

    if (priority) {
      where.priority = priority;
    }

    // Get tickets with first reply info
    const tickets = await prisma.supportTicket.findMany({
      where,
      select: {
        id: true,
        ticketNumber: true,
        priority: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        replies: {
          where: { isStaffReply: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const slaStatuses: SLAStatus[] = [];

    for (const ticket of tickets) {
      const config = getPriorityConfig(ticket.priority);
      if (!config) continue;

      const responseDeadline = new Date(ticket.createdAt.getTime() + config.responseTimeHours * 60 * 60 * 1000);
      const resolutionDeadline = new Date(ticket.createdAt.getTime() + config.resolutionTimeHours * 60 * 60 * 1000);

      const firstResponse = ticket.replies[0]?.createdAt || null;
      const isResolved = ['RESOLVED', 'CLOSED'].includes(ticket.status);

      const responseBreached = firstResponse
        ? firstResponse > responseDeadline
        : now > responseDeadline;

      const resolutionBreached = isResolved
        ? (ticket.resolvedAt || now) > resolutionDeadline
        : now > resolutionDeadline;

      // Skip non-breached if breachedOnly is true
      if (breachedOnly && !responseBreached && !resolutionBreached) {
        continue;
      }

      const responseTimeHours = firstResponse
        ? (firstResponse.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60)
        : null;

      const resolutionTimeHours = ticket.resolvedAt
        ? (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60)
        : null;

      const responseTimeRemaining = !firstResponse && !isResolved
        ? (responseDeadline.getTime() - now.getTime()) / (1000 * 60 * 60)
        : null;

      const resolutionTimeRemaining = !isResolved
        ? (resolutionDeadline.getTime() - now.getTime()) / (1000 * 60 * 60)
        : null;

      slaStatuses.push({
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt,
        firstResponseAt: firstResponse,
        resolvedAt: ticket.resolvedAt,
        responseDeadline,
        resolutionDeadline,
        responseBreached,
        resolutionBreached,
        responseTimeHours: responseTimeHours ? Math.round(responseTimeHours * 100) / 100 : null,
        resolutionTimeHours: resolutionTimeHours ? Math.round(resolutionTimeHours * 100) / 100 : null,
        responseTimeRemaining: responseTimeRemaining ? Math.round(responseTimeRemaining * 100) / 100 : null,
        resolutionTimeRemaining: resolutionTimeRemaining ? Math.round(resolutionTimeRemaining * 100) / 100 : null,
      });
    }

    // Calculate summary stats
    const totalTickets = slaStatuses.length;
    const responseBreaches = slaStatuses.filter((s) => s.responseBreached).length;
    const resolutionBreaches = slaStatuses.filter((s) => s.resolutionBreached).length;

    const avgResponseTime = slaStatuses
      .filter((s) => s.responseTimeHours !== null)
      .reduce((sum, s) => sum + (s.responseTimeHours || 0), 0) / (slaStatuses.filter((s) => s.responseTimeHours !== null).length || 1);

    const avgResolutionTime = slaStatuses
      .filter((s) => s.resolutionTimeHours !== null)
      .reduce((sum, s) => sum + (s.resolutionTimeHours || 0), 0) / (slaStatuses.filter((s) => s.resolutionTimeHours !== null).length || 1);

    // Group by priority
    const byPriority: Record<string, { total: number; responseBreaches: number; resolutionBreaches: number }> = {};
    for (const status of slaStatuses) {
      if (!byPriority[status.priority]) {
        byPriority[status.priority] = { total: 0, responseBreaches: 0, resolutionBreaches: 0 };
      }
      byPriority[status.priority].total++;
      if (status.responseBreached) byPriority[status.priority].responseBreaches++;
      if (status.resolutionBreached) byPriority[status.priority].resolutionBreaches++;
    }

    // At-risk tickets (within 2 hours of breach)
    const atRiskTickets = slaStatuses.filter(
      (s) =>
        (s.responseTimeRemaining !== null && s.responseTimeRemaining > 0 && s.responseTimeRemaining <= 2) ||
        (s.resolutionTimeRemaining !== null && s.resolutionTimeRemaining > 0 && s.resolutionTimeRemaining <= 2)
    );

    logger.info('SLA data fetched', {
      totalTickets,
      responseBreaches,
      resolutionBreaches,
      atRiskCount: atRiskTickets.length,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        summary: {
          period: { days, startDate: startDate.toISOString(), endDate: now.toISOString() },
          totalTickets,
          responseBreaches,
          resolutionBreaches,
          responseComplianceRate: totalTickets > 0 ? Math.round((1 - responseBreaches / totalTickets) * 100) : 100,
          resolutionComplianceRate: totalTickets > 0 ? Math.round((1 - resolutionBreaches / totalTickets) * 100) : 100,
          avgResponseTimeHours: Math.round(avgResponseTime * 100) / 100,
          avgResolutionTimeHours: Math.round(avgResolutionTime * 100) / 100,
        },
        byPriority,
        slaConfig: SUPPORT_PRIORITIES.map((p) => ({
          priority: p.value,
          name: p.name,
          responseTimeHours: p.responseTimeHours,
          resolutionTimeHours: p.resolutionTimeHours,
        })),
        atRiskTickets: atRiskTickets.slice(0, 20),
        breachedTickets: breachedOnly ? slaStatuses : slaStatuses.filter((s) => s.responseBreached || s.resolutionBreached).slice(0, 50),
        tickets: breachedOnly ? undefined : slaStatuses.slice(0, 100),
      },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET SLA failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch SLA data', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';