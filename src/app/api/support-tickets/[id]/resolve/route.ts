// src/app/api/support-tickets/[id]/resolve/route.ts
// =============================================================================
// RESOLVE TICKET API (Admin/Staff Only)
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

const RATE_LIMIT = 20;

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

const resolveTicketSchema = z.object({
  resolution: z.string().min(10, 'Resolution must be at least 10 characters').max(5000),
  internalNotes: z.string().max(2000).optional(),
  sendNotification: z.boolean().default(true),
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
// POST - Resolve Ticket
// =============================================================================

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `ticket-resolve:${ip}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId, rateLimitResult);
    }

    const isAdmin = Boolean(session.user.isAdmin || session.user.role === 'admin');

    // Only admins/staff can resolve tickets
    if (!isAdmin) {
      return addHeaders(
        apiResponse.forbidden('Only staff can resolve tickets', requestId),
        requestId,
        rateLimitResult
      );
    }

    const { id } = await params;
    const userId = session.user.id;

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

    const validation = resolveTicketSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { resolution, internalNotes } = validation.data;

    // Get ticket
    const ticket = await prisma.supportTicket.findFirst({
      where: id.startsWith('TKT-') ? { ticketNumber: id } : { id },
    });

    if (!ticket) {
      return addHeaders(apiResponse.notFound('Ticket', requestId), requestId, rateLimitResult);
    }

    // Check if already resolved/closed
    if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      return addHeaders(
        apiResponse.validationError(`Ticket is already ${ticket.status.toLowerCase()}`, undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Resolve ticket
    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: 'RESOLVED',
        resolution,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { replies: true } },
      },
    });

    // Add resolution reply
    await prisma.ticketReply.create({
      data: {
        ticketId: ticket.id,
        userId,
        message: `**Ticket Resolved**\n\n${resolution}`,
        isStaffReply: true,
        isInternal: false,
      },
    });

    // Add internal notes if provided
    if (internalNotes) {
      await prisma.ticketReply.create({
        data: {
          ticketId: ticket.id,
          userId,
          message: `**Internal Notes:**\n\n${internalNotes}`,
          isStaffReply: true,
          isInternal: true,
        },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE' as AuditAction,
        category: 'support',
        entityType: 'supportTicket',
        entityId: ticket.id,
        description: `Resolved ticket: ${ticket.ticketNumber}`,
        changes: { resolution: resolution.substring(0, 200) } as Prisma.InputJsonValue,
        ipAddress: ip,
        status: 'success',
      },
    });

    logger.info('Ticket resolved', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      resolvedBy: userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        ...updatedTicket,
        message: 'Ticket resolved successfully',
      },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST resolve failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to resolve ticket', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';