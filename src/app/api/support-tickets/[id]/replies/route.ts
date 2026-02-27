// src/app/api/support-tickets/[id]/replies/route.ts
// =============================================================================
// TICKET REPLIES API
// Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
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
import { supportService } from '@/services/supportService';

// =============================================================================
// TYPES
// =============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;
const MAX_REPLY_LENGTH = 10000;
const MAX_ATTACHMENTS = 5;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
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

const createReplySchema = z.object({
  message: z
    .string()
    .min(1, 'Message is required')
    .max(MAX_REPLY_LENGTH, `Message must be less than ${MAX_REPLY_LENGTH} characters`)
    .transform((val) => val.trim()),
  isInternal: z.boolean().default(false),
  attachments: z.array(z.string().url('Invalid attachment URL')).max(MAX_ATTACHMENTS).default([]),
});

const updateReplySchema = z.object({
  message: z.string().min(1).max(MAX_REPLY_LENGTH).transform((val) => val.trim()),
});

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  includeInternal: z.coerce.boolean().default(false),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

const bulkDeleteSchema = z.object({
  replyIds: z.array(z.string().cuid()).min(1).max(50),
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

function addHeaders(response: NextResponse, requestId: string, rateLimitResult?: { limit: number; remaining: number; reset: number }): NextResponse {
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

function sanitizeMessage(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `support-replies:${ip}`);

  if (!rateLimitResult.success) {
    return {
      error: addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult),
      session: null,
      rateLimitResult,
      isAdmin: false,
    };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      error: addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId, rateLimitResult),
      session: null,
      rateLimitResult,
      isAdmin: false,
    };
  }

  const isAdmin = Boolean(session.user.isAdmin || session.user.role === 'admin');

  return { error: null, session, rateLimitResult, isAdmin };
}

async function getTicketWithAccess(ticketId: string, userId: string, isAdmin: boolean) {
  const ticket = await prisma.supportTicket.findFirst({
    where: ticketId.startsWith('TKT-') ? { ticketNumber: ticketId } : { id: ticketId },
    select: {
      id: true,
      userId: true,
      ticketNumber: true,
      status: true,
      subject: true,
    },
  });

  if (!ticket) return null;
  if (!isAdmin && ticket.userId !== userId) return null;

  return ticket;
}

async function createAuditLog(
  userId: string,
  action: AuditAction,
  description: string,
  request: NextRequest,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        category: 'support',
        entityType: 'ticketReply',
        entityId,
        description,
        metadata: metadata ? metadata as Prisma.InputJsonValue : undefined,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent')?.substring(0, 500),
        status: 'success',
      },
    });
  } catch (error) {
    logger.error('Failed to create audit log', { userId, action }, error);
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
// HEAD
// =============================================================================

export async function HEAD(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult, isAdmin } = await validateSession(request, requestId);

    if (error) return new NextResponse(null, { status: 401 });

    const { id: ticketId } = await params;
    const ticket = await getTicketWithAccess(ticketId, session!.user.id, isAdmin);

    if (!ticket) return new NextResponse(null, { status: 404 });

    const [total, publicCount] = await Promise.all([
      prisma.ticketReply.count({ where: { ticketId: ticket.id } }),
      prisma.ticketReply.count({ where: { ticketId: ticket.id, isInternal: false } }),
    ]);

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Total-Replies': String(total),
        'X-Public-Replies': String(publicCount),
        'X-Ticket-Number': ticket.ticketNumber,
      },
    });

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD replies failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - List Replies
// =============================================================================

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult, isAdmin } = await validateSession(request, requestId);

    if (error) return error;

    const { id: ticketId } = await params;
    const userId = session!.user.id;

    const ticket = await getTicketWithAccess(ticketId, userId, isAdmin);

    if (!ticket) {
      return addHeaders(apiResponse.notFound('Ticket', requestId), requestId, rateLimitResult);
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 50,
      includeInternal: searchParams.get('includeInternal') || 'false',
      sortOrder: searchParams.get('sortOrder') || 'asc',
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { page, limit, includeInternal, sortOrder } = queryValidation.data;

    // Build where clause
    const where: Prisma.TicketReplyWhereInput = {
      ticketId: ticket.id,
      // Non-admins cannot see internal notes
      ...(isAdmin && includeInternal ? {} : { isInternal: false }),
    };

    const [replies, total] = await Promise.all([
      prisma.ticketReply.findMany({
        where,
        orderBy: { createdAt: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              isAdmin: true,
            },
          },
        },
      }),
      prisma.ticketReply.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    logger.info('Replies fetched', {
      ticketId: ticket.id,
      userId,
      count: replies.length,
      requestId,
    });

    const response = apiResponse.paginated(
      replies.map((reply) => ({
        ...reply,
        canEdit: isAdmin || (reply.userId === userId && !reply.isAutoReply),
        canDelete: isAdmin || (reply.userId === userId && !reply.isAutoReply),
      })),
      {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      { meta: { requestId, ticketId: ticket.id, ticketNumber: ticket.ticketNumber } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET replies failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch replies', requestId), requestId);
  }
}

// =============================================================================
// POST - Add Reply
// =============================================================================

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult, isAdmin } = await validateSession(request, requestId);

    if (error) return error;

    const { id: ticketId } = await params;
    const userId = session!.user.id;

    const ticket = await getTicketWithAccess(ticketId, userId, isAdmin);

    if (!ticket) {
      return addHeaders(apiResponse.notFound('Ticket', requestId), requestId, rateLimitResult);
    }

    // Check if ticket is closed (only admins can reply to closed tickets)
    if (ticket.status === 'CLOSED' && !isAdmin) {
      return addHeaders(
        apiResponse.validationError('Cannot reply to a closed ticket. Please reopen it first.', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

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

    const validation = createReplySchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { message, isInternal, attachments } = validation.data;

    // Only admins can create internal notes
    if (isInternal && !isAdmin) {
      return addHeaders(
        apiResponse.forbidden('Only staff can create internal notes', requestId),
        requestId,
        rateLimitResult
      );
    }

    const sanitizedMessage = sanitizeMessage(message);

    // Create reply using service
    const reply = await supportService.addReply({
      ticketId: ticket.id,
      userId,
      message: sanitizedMessage,
      isStaffReply: isAdmin,
      isInternal,
      attachments,
    });

    // Update ticket status based on who replied
    let statusUpdate = {};
    if (isAdmin && ticket.status === 'OPEN') {
      statusUpdate = { status: 'IN_PROGRESS' };
    } else if (!isAdmin && ticket.status === 'WAITING') {
      statusUpdate = { status: 'OPEN' };
    } else if (!isAdmin && ticket.status === 'CLOSED') {
      statusUpdate = { status: 'OPEN' };
    }

    if (Object.keys(statusUpdate).length > 0) {
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { ...statusUpdate, updatedAt: new Date() },
      });
    }

    await createAuditLog(userId, AuditAction.CREATE, `Reply added to ticket: ${ticket.ticketNumber}`, request, reply.id, {
      ticketId: ticket.id,
      isInternal,
      isStaffReply: isAdmin,
    });

    logger.info('Reply added', {
      replyId: reply.id,
      ticketId: ticket.id,
      userId,
      isInternal,
      isStaffReply: isAdmin,
      requestId,
    });

    const response = apiResponse.created(reply, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST reply failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to add reply', requestId), requestId);
  }
}

// =============================================================================
// PUT - Update Reply (Admin or owner within time limit)
// =============================================================================

export async function PUT(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult, isAdmin } = await validateSession(request, requestId);

    if (error) return error;

    const { id: ticketId } = await params;
    const userId = session!.user.id;

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

    const { replyId, ...updateData } = body as { replyId: string } & Record<string, unknown>;

    if (!replyId) {
      return addHeaders(
        apiResponse.validationError('replyId is required', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const validation = updateReplySchema.safeParse(updateData);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Get reply with ticket
    const reply = await prisma.ticketReply.findFirst({
      where: { id: replyId, ticketId },
      include: {
        ticket: {
          select: { id: true, userId: true, ticketNumber: true },
        },
      },
    });

    if (!reply) {
      return addHeaders(apiResponse.notFound('Reply', requestId), requestId, rateLimitResult);
    }

    // Check access
    if (!isAdmin && reply.userId !== userId) {
      return addHeaders(
        apiResponse.forbidden('You can only edit your own replies', requestId),
        requestId,
        rateLimitResult
      );
    }

    // Cannot edit auto-replies
    if (reply.isAutoReply) {
      return addHeaders(
        apiResponse.validationError('Cannot edit auto-generated replies', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Non-admins can only edit within 15 minutes
    if (!isAdmin) {
      const editWindow = 15 * 60 * 1000; // 15 minutes
      const timeSinceCreation = Date.now() - reply.createdAt.getTime();

      if (timeSinceCreation > editWindow) {
        return addHeaders(
          apiResponse.validationError('Reply can only be edited within 15 minutes of creation', undefined, requestId),
          requestId,
          rateLimitResult
        );
      }
    }

    const sanitizedMessage = sanitizeMessage(validation.data.message);

    const updated = await prisma.ticketReply.update({
      where: { id: replyId },
      data: {
        message: sanitizedMessage,
      },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // Store edit history in audit log
    await createAuditLog(userId, AuditAction.UPDATE, `Reply edited in ticket: ${reply.ticket.ticketNumber}`, request, replyId, {
      ticketId: reply.ticketId,
      editedAt: new Date().toISOString(),
      previousMessage: reply.message,
    });

    logger.info('Reply updated', {
      replyId,
      ticketId,
      userId,
      requestId,
    });

    const response = apiResponse.success(updated, {
      meta: { requestId },
      message: 'Reply updated successfully',
    });

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PUT reply failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update reply', requestId), requestId);
  }
}

// =============================================================================
// PATCH - Mark replies as read or other partial updates
// =============================================================================

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const { error, session, rateLimitResult, isAdmin } = await validateSession(request, requestId);

    if (error) return error;

    const { id: ticketId } = await params;
    const userId = session!.user.id;

    const ticket = await getTicketWithAccess(ticketId, userId, isAdmin);

    if (!ticket) {
      return addHeaders(apiResponse.notFound('Ticket', requestId), requestId, rateLimitResult);
    }

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

    const { action, replyId, replyIds } = body as { action?: string; replyId?: string; replyIds?: string[] };

    switch (action) {
      case 'markAsRead':
        // Mark specific reply or all replies as read (would need a separate table for this)
        // For now, just return success
        logger.info('Mark as read action', { ticketId, replyId, replyIds, requestId });
        break;

      case 'toggleInternal':
        if (!isAdmin) {
          return addHeaders(
            apiResponse.forbidden('Only admins can toggle internal status', requestId),
            requestId,
            rateLimitResult
          );
        }
        if (!replyId) {
          return addHeaders(
            apiResponse.validationError('replyId is required', undefined, requestId),
            requestId,
            rateLimitResult
          );
        }

        const reply = await prisma.ticketReply.findFirst({
          where: { id: replyId, ticketId: ticket.id },
        });

        if (!reply) {
          return addHeaders(apiResponse.notFound('Reply', requestId), requestId, rateLimitResult);
        }

        const toggledReply = await prisma.ticketReply.update({
          where: { id: replyId },
          data: { isInternal: !reply.isInternal },
        });

        logger.info('Reply internal status toggled', { replyId, isInternal: toggledReply.isInternal, requestId });

        return addHeaders(
          apiResponse.success(toggledReply, { meta: { requestId } }),
          requestId,
          rateLimitResult
        );

      default:
        return addHeaders(
          apiResponse.validationError('Invalid or missing action', undefined, requestId),
          requestId,
          rateLimitResult
        );
    }

    const response = apiResponse.success({ success: true }, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PATCH replies failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update replies', requestId), requestId);
  }
}

// =============================================================================
// DELETE - Delete Reply or Bulk Delete
// =============================================================================

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult, isAdmin } = await validateSession(request, requestId);

    if (error) return error;

    const { id: ticketId } = await params;
    const userId = session!.user.id;

    const ticket = await getTicketWithAccess(ticketId, userId, isAdmin);

    if (!ticket) {
      return addHeaders(apiResponse.notFound('Ticket', requestId), requestId, rateLimitResult);
    }

    // Check for single delete via query param
    const { searchParams } = new URL(request.url);
    const replyId = searchParams.get('replyId');

    if (replyId) {
      // Single reply delete
      const reply = await prisma.ticketReply.findFirst({
        where: { id: replyId, ticketId: ticket.id },
      });

      if (!reply) {
        return addHeaders(apiResponse.notFound('Reply', requestId), requestId, rateLimitResult);
      }

      // Check permissions
      if (!isAdmin && reply.userId !== userId) {
        return addHeaders(
          apiResponse.forbidden('You can only delete your own replies', requestId),
          requestId,
          rateLimitResult
        );
      }

      // Cannot delete auto-replies
      if (reply.isAutoReply) {
        return addHeaders(
          apiResponse.validationError('Cannot delete auto-generated replies', undefined, requestId),
          requestId,
          rateLimitResult
        );
      }

      // Non-admins can only delete within 5 minutes
      if (!isAdmin) {
        const deleteWindow = 5 * 60 * 1000; // 5 minutes
        const timeSinceCreation = Date.now() - reply.createdAt.getTime();

        if (timeSinceCreation > deleteWindow) {
          return addHeaders(
            apiResponse.validationError('Reply can only be deleted within 5 minutes of creation', undefined, requestId),
            requestId,
            rateLimitResult
          );
        }
      }

      await prisma.ticketReply.delete({ where: { id: replyId } });

      await createAuditLog(userId, AuditAction.DELETE, `Reply deleted from ticket: ${ticket.ticketNumber}`, request, replyId, {
        ticketId: ticket.id,
      });

      logger.info('Reply deleted', {
        replyId,
        ticketId: ticket.id,
        userId,
        requestId,
      });

      return addHeaders(
        apiResponse.success({ message: 'Reply deleted successfully', replyId }, { meta: { requestId } }),
        requestId,
        rateLimitResult
      );
    }

    // Bulk delete (admin only)
    if (!isAdmin) {
      return addHeaders(
        apiResponse.forbidden('Admin access required for bulk delete', requestId),
        requestId,
        rateLimitResult
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body or missing replyId query parameter', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const validation = bulkDeleteSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { replyIds } = validation.data;

    const result = await prisma.ticketReply.deleteMany({
      where: {
        id: { in: replyIds },
        ticketId: ticket.id,
        isAutoReply: false, // Cannot delete auto-replies
      },
    });

    await createAuditLog(userId, AuditAction.DELETE, `Bulk deleted ${result.count} replies from ticket: ${ticket.ticketNumber}`, request, ticket.id, {
      replyIds,
      deleted: result.count,
    });

    logger.info('Bulk replies deleted', {
      ticketId: ticket.id,
      requested: replyIds.length,
      deleted: result.count,
      userId,
      requestId,
    });

    return addHeaders(
      apiResponse.success(
        { message: `${result.count} replies deleted`, deleted: result.count },
        { meta: { requestId } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('DELETE replies failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to delete replies', requestId), requestId);
  }
}

// =============================================================================
// RUNTIME CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';