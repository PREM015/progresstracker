// src/app/api/support-tickets/[id]/reopen/route.ts
// =============================================================================
// REOPEN TICKET API
// Methods: POST, OPTIONS
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { Prisma, AuditAction } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// TYPES
// =============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 10;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION
// =============================================================================

const reopenTicketSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000),
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

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

// =============================================================================
// POST - Reopen Ticket
// =============================================================================

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `ticket-reopen:${ip}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(300, requestId), requestId, rateLimitResult);
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId, rateLimitResult);
    }

    const { id } = await params;
    const userId = session.user.id;
    const isAdmin = Boolean(session.user.isAdmin || session.user.role === 'admin');

    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const validation = reopenTicketSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { reason } = validation.data;

    // Get ticket
    const ticket = await prisma.supportTicket.findFirst({
      where: id.startsWith('TKT-') ? { ticketNumber: id } : { id },
    });

    if (!ticket) {
      return addHeaders(apiResponse.notFound('Ticket', requestId), requestId, rateLimitResult);
    }

    // Check ownership (unless admin)
    if (!isAdmin && ticket.userId !== userId) {
      return addHeaders(
        apiResponse.forbidden('You can only reopen your own tickets', requestId),
        requestId,
        rateLimitResult
      );
    }

    // Check if ticket can be reopened
    if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      return addHeaders(
        apiResponse.validationError(`Cannot reopen ticket with status: ${ticket.status}`, undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Check reopen limit (max 3 reopens for non-admins)
    if (!isAdmin) {
      const reopenCount = await prisma.ticketReply.count({
        where: {
          ticketId: ticket.id,
          message: { contains: '**Ticket Reopened**' },
        },
      });

      if (reopenCount >= 3) {
        return addHeaders(
          apiResponse.validationError(
            'This ticket has been reopened too many times. Please create a new ticket.',
            undefined,
            requestId
          ),
          requestId,
          rateLimitResult
        );
      }
    }

    // Reopen ticket
    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: 'OPEN',
        resolvedAt: null,
        updatedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { replies: true } },
      },
    });

    // Add reopen reply
    await prisma.ticketReply.create({
      data: {
        ticketId: ticket.id,
        userId,
        message: `**Ticket Reopened**\n\nReason: ${reason}`,
        isStaffReply: isAdmin,
        isInternal: false,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE' as AuditAction,
        category: 'support',
        entityType: 'supportTicket',
        entityId: ticket.id,
        description: `Reopened ticket: ${ticket.ticketNumber}`,
        changes: { reason, previousStatus: ticket.status } as Prisma.InputJsonValue,
        ipAddress: ip,
        status: 'success',
      },
    });

    logger.info('Ticket reopened', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      reopenedBy: userId,
      isAdmin,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        ...updatedTicket,
        message: 'Ticket reopened successfully',
      },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST reopen failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to reopen ticket', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';