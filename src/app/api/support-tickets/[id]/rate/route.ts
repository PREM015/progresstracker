// src/app/api/support-tickets/[id]/rate/route.ts
// =============================================================================
// TICKET RATING API
// Methods: GET, POST, PUT, DELETE, OPTIONS, HEAD
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
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
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

const rateTicketSchema = z.object({
  rating: z
    .number()
    .int('Rating must be a whole number')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
  comment: z
    .string()
    .max(1000, 'Comment must be less than 1000 characters')
    .optional()
    .transform((val) => val?.trim()),
});

const updateRatingSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional().transform((val) => val?.trim()),
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
    response.headers.set('X-RateLimit-Reset', String(rateLimitResult.reset));
  }

  return response;
}

async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `ticket-rate:${ip}`);

  if (!rateLimitResult.success) {
    return {
      error: addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult),
      session: null,
      rateLimitResult,
    };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      error: addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId, rateLimitResult),
      session: null,
      rateLimitResult,
    };
  }

  return { error: null, session, rateLimitResult };
}

async function getTicketForRating(ticketId: string, userId: string) {
  const ticket = await prisma.supportTicket.findFirst({
    where: ticketId.startsWith('TKT-') ? { ticketNumber: ticketId } : { id: ticketId },
    select: {
      id: true,
      userId: true,
      ticketNumber: true,
      subject: true,
      status: true,
      satisfactionRating: true,
      feedbackComment: true,
      resolvedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!ticket) return { ticket: null, error: 'Ticket not found' };
  if (ticket.userId !== userId) return { ticket: null, error: 'You can only rate your own tickets' };

  return { ticket, error: null };
}

function mapToAuditAction(action: string): AuditAction {
  const actionMap: Record<string, AuditAction> = {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
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
    logger.error('Failed to create audit log', { userId, action, entityId, metadata }, error);
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
// HEAD - Check if ticket can be rated
// =============================================================================

export async function HEAD(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) return new NextResponse(null, { status: 401 });

    const { id } = await params;
    const { ticket, error: ticketError } = await getTicketForRating(id, session!.user.id);

    if (ticketError || !ticket) {
      return new NextResponse(null, { status: 404 });
    }

    const canRate = ['RESOLVED', 'CLOSED'].includes(ticket.status) && !ticket.satisfactionRating;
    const hasRated = !!ticket.satisfactionRating;

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Ticket-Number': ticket.ticketNumber,
        'X-Can-Rate': String(canRate),
        'X-Has-Rated': String(hasRated),
        'X-Current-Rating': ticket.satisfactionRating ? String(ticket.satisfactionRating) : '',
      },
    });

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD rate failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get current rating for a ticket
// =============================================================================

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) return error;

    const { id } = await params;
    const userId = session!.user.id;

    const { ticket, error: ticketError } = await getTicketForRating(id, userId);

    if (ticketError) {
      return addHeaders(
        apiResponse.notFound(ticketError, requestId),
        requestId,
        rateLimitResult
      );
    }

    if (!ticket) {
      return addHeaders(apiResponse.notFound('Ticket', requestId), requestId, rateLimitResult);
    }

    const ratingData = {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      status: ticket.status,
      rating: ticket.satisfactionRating,
      comment: ticket.feedbackComment,
      hasRated: !!ticket.satisfactionRating,
      canRate: ['RESOLVED', 'CLOSED'].includes(ticket.status) && !ticket.satisfactionRating,
      resolvedAt: ticket.resolvedAt,
    };

    logger.info('Rating fetched', {
      ticketId: ticket.id,
      userId,
      hasRating: !!ticket.satisfactionRating,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(ratingData, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET rate failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch rating', requestId), requestId);
  }
}

// =============================================================================
// POST - Submit a new rating
// =============================================================================

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) return error;

    const { id } = await params;
    const userId = session!.user.id;

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

    // Validate using rateTicketSchema
    const validation = rateTicketSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { rating, comment } = validation.data;

    // Get ticket and check permissions
    const { ticket, error: ticketError } = await getTicketForRating(id, userId);

    if (ticketError) {
      return addHeaders(
        apiResponse.forbidden(ticketError, requestId),
        requestId,
        rateLimitResult
      );
    }

    if (!ticket) {
      return addHeaders(apiResponse.notFound('Ticket', requestId), requestId, rateLimitResult);
    }

    // Check if ticket is resolved or closed
    if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      return addHeaders(
        apiResponse.validationError(
          'Only resolved or closed tickets can be rated',
          [{ field: 'status', message: `Current status: ${ticket.status}` }],
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    // Check if already rated
    if (ticket.satisfactionRating) {
      return addHeaders(
        apiResponse.validationError(
          'This ticket has already been rated',
          [{ field: 'rating', message: `Current rating: ${ticket.satisfactionRating}/5` }],
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    // Submit rating
    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        satisfactionRating: rating,
        feedbackComment: comment || null,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        status: true,
        satisfactionRating: true,
        feedbackComment: true,
        resolvedAt: true,
      },
    });

    // Create audit log
    await createAuditLog(
      userId,
      'UPDATE',
      `Rated ticket ${ticket.ticketNumber}: ${rating}/5`,
      request,
      ticket.id,
      { rating, hasComment: !!comment }
    );

    logger.info('Ticket rated', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      userId,
      rating,
      hasComment: !!comment,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        ...updatedTicket,
        message: 'Thank you for your feedback!',
      },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST rate failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to submit rating', requestId), requestId);
  }
}

// =============================================================================
// PUT - Update an existing rating (within 24 hours)
// =============================================================================

export async function PUT(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) return error;

    const { id } = await params;
    const userId = session!.user.id;

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

    // Validate using updateRatingSchema
    const validation = updateRatingSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { rating, comment } = validation.data;

    if (rating === undefined && comment === undefined) {
      return addHeaders(
        apiResponse.validationError('At least rating or comment is required', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Get ticket
    const { ticket, error: ticketError } = await getTicketForRating(id, userId);

    if (ticketError) {
      return addHeaders(apiResponse.forbidden(ticketError, requestId), requestId, rateLimitResult);
    }

    if (!ticket) {
      return addHeaders(apiResponse.notFound('Ticket', requestId), requestId, rateLimitResult);
    }

    // Check if ticket has been rated
    if (!ticket.satisfactionRating) {
      return addHeaders(
        apiResponse.validationError('This ticket has not been rated yet. Use POST to submit a rating.', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Check if within 24-hour edit window
    const editWindow = 24 * 60 * 60 * 1000; // 24 hours
    const resolvedAt = ticket.resolvedAt || ticket.updatedAt;
    const timeSinceResolution = Date.now() - new Date(resolvedAt).getTime();

    if (timeSinceResolution > editWindow) {
      return addHeaders(
        apiResponse.validationError(
          'Rating can only be updated within 24 hours of resolution',
          undefined,
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    // Update rating
    const updateData: Prisma.SupportTicketUpdateInput = {
      updatedAt: new Date(),
    };

    if (rating !== undefined) {
      updateData.satisfactionRating = rating;
    }
    if (comment !== undefined) {
      updateData.feedbackComment = comment || null;
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: updateData,
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        status: true,
        satisfactionRating: true,
        feedbackComment: true,
        resolvedAt: true,
      },
    });

    // Create audit log
    await createAuditLog(
      userId,
      'UPDATE',
      `Updated rating for ticket ${ticket.ticketNumber}`,
      request,
      ticket.id,
      {
        oldRating: ticket.satisfactionRating,
        newRating: rating || ticket.satisfactionRating,
        commentUpdated: comment !== undefined,
      }
    );

    logger.info('Ticket rating updated', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      userId,
      oldRating: ticket.satisfactionRating,
      newRating: rating,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        ...updatedTicket,
        message: 'Rating updated successfully',
      },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PUT rate failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update rating', requestId), requestId);
  }
}

// =============================================================================
// DELETE - Remove rating (Admin only or within 1 hour)
// =============================================================================

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) return error;

    const { id } = await params;
    const userId = session!.user.id;
    const isAdmin = Boolean(session!.user.isAdmin || session!.user.role === 'admin');

    // Get ticket
    const ticket = await prisma.supportTicket.findFirst({
      where: id.startsWith('TKT-') ? { ticketNumber: id } : { id },
      select: {
        id: true,
        userId: true,
        ticketNumber: true,
        satisfactionRating: true,
        feedbackComment: true,
        updatedAt: true,
      },
    });

    if (!ticket) {
      return addHeaders(apiResponse.notFound('Ticket', requestId), requestId, rateLimitResult);
    }

    // Check ownership (unless admin)
    if (!isAdmin && ticket.userId !== userId) {
      return addHeaders(
        apiResponse.forbidden('You can only remove ratings from your own tickets', requestId),
        requestId,
        rateLimitResult
      );
    }

    // Check if has rating
    if (!ticket.satisfactionRating) {
      return addHeaders(
        apiResponse.validationError('This ticket has no rating to remove', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Non-admins can only delete within 1 hour
    if (!isAdmin) {
      const deleteWindow = 60 * 60 * 1000; // 1 hour
      const timeSinceRating = Date.now() - new Date(ticket.updatedAt).getTime();

      if (timeSinceRating > deleteWindow) {
        return addHeaders(
          apiResponse.validationError(
            'Rating can only be removed within 1 hour of submission',
            undefined,
            requestId
          ),
          requestId,
          rateLimitResult
        );
      }
    }


     
    


    // Store old values for audit
    const oldRating = ticket.satisfactionRating;
    const oldComment = ticket.feedbackComment;

    // Remove rating
    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        satisfactionRating: null,
        feedbackComment: null,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        status: true,
        satisfactionRating: true,
        feedbackComment: true,
      },
    });

    // Create audit log
    await createAuditLog(
      userId,
      'DELETE',
      `Removed rating from ticket ${ticket.ticketNumber}`,
      request,
      ticket.id,
      {
        removedRating: oldRating,
        hadComment: !!oldComment,
        removedByAdmin: isAdmin && ticket.userId !== userId,
      }
    );

    logger.info('Ticket rating removed', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      userId,
      removedRating: oldRating,
      isAdmin,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        ...updatedTicket,
        message: 'Rating removed successfully',
        canRate: true,
      },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE rate failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to remove rating', requestId), requestId);
  }
}

// =============================================================================
// RUNTIME CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';