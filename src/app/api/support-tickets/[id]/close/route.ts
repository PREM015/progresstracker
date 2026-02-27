// src/app/api/support-tickets/[id]/close/route.ts
// =============================================================================
// CLOSE TICKET API
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
// CONSTANTS & HEADERS
// =============================================================================

const RATE_LIMIT = 20;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const closeTicketSchema = z.object({
  resolution: z.string().max(5000).optional(),
  reason: z.enum(['resolved', 'duplicate', 'not_applicable', 'no_response', 'user_requested', 'other']).optional(),
  feedback: z.string().max(1000).optional(),
  notifyUser: z.boolean().default(true),
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  rateLimitResult?: { limit: number; remaining: number; reset: number }
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

function mapToAuditAction(action: string): AuditAction {
  const actionMap: Record<string, AuditAction> = {
    UPDATE: 'UPDATE',
  };
  return actionMap[action.toUpperCase()] || 'UPDATE';
}

async function createAuditLog(
  userId: string,
  action: string,
  description: string,
  request: NextRequest,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: mapToAuditAction(action),
        category: 'support',
        entityType: 'supportTicket',
        entityId,
        description,
        changes: metadata as Prisma.InputJsonValue,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent')?.substring(0, 500),
        status: 'success',
      },
    });
  } catch (error) {
    logger.error('Failed to create audit log', { userId, action, entityId }, error);
  }
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

// =============================================================================
// POST - Close Ticket
// =============================================================================

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Rate limit
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `ticket-close:${ip}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    // Auth
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return addHeaders(
        apiResponse.unauthorized('Authentication required', requestId),
        requestId,
        rateLimitResult
      );
    }

    const { id } = await params;
    const userId = session.user.id;
    const isAdmin = Boolean(session.user.isAdmin || session.user.role === 'admin');

    // Parse body
    let body: unknown = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Empty body is fine
    }

    const validation = closeTicketSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { resolution, reason, feedback } = validation.data;

    // Get ticket
    const ticket = await prisma.supportTicket.findFirst({
      where: id.startsWith('TKT-') ? { ticketNumber: id } : { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!ticket) {
      return addHeaders(apiResponse.notFound('Ticket', requestId), requestId, rateLimitResult);
    }

    // Check permissions
    if (!isAdmin && ticket.userId !== userId) {
      return addHeaders(
        apiResponse.forbidden('You can only close your own tickets', requestId),
        requestId,
        rateLimitResult
      );
    }

    // Check if already closed
    if (ticket.status === 'CLOSED') {
      return addHeaders(
        apiResponse.validationError('Ticket is already closed', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Build resolution message
    let finalResolution = resolution || '';
    if (reason) {
      const reasonLabels: Record<string, string> = {
        resolved: 'Issue resolved',
        duplicate: 'Duplicate ticket',
        not_applicable: 'Not applicable',
        no_response: 'No response from user',
        user_requested: 'Closed by user request',
        other: 'Other',
      };
      finalResolution = `${reasonLabels[reason]}${resolution ? `: ${resolution}` : ''}`;
    }

    // Close ticket
    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: 'CLOSED',
        resolution: finalResolution || 'Closed',
        updatedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { replies: true } },
      },
    });

    // Add system reply
    await prisma.ticketReply.create({
      data: {
        ticketId: ticket.id,
        userId,
        message: `**Ticket Closed**${finalResolution ? `\n\nReason: ${finalResolution}` : ''}${feedback ? `\n\nFeedback: ${feedback}` : ''}`,
        isStaffReply: isAdmin,
        isInternal: false,
      },
    });

    // Audit log
    await createAuditLog(
      userId,
      'UPDATE',
      `Closed ticket: ${ticket.ticketNumber}`,
      request,
      ticket.id,
      { reason, hasResolution: !!resolution, closedBy: isAdmin ? 'admin' : 'user' }
    );

    logger.info('Ticket closed', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      userId,
      isAdmin,
      reason,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        ...updatedTicket,
        message: 'Ticket closed successfully',
      },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST close failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to close ticket', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';