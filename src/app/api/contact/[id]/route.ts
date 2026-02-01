// src/app/api/contact/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter } from '@/lib/rateLimit';
import { supportService } from '@/services/supportService';
import { TicketStatus, TicketPriority } from '@prisma/client';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const updateTicketSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  resolution: z.string().max(2000).optional(),
});

const rateTicketSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

const addReplySchema = z.object({
  message: z.string().min(1).max(5000),
  attachments: z.array(z.string()).max(5).optional(),
});

// =============================================================================
// GET - Get Specific Ticket
// =============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // ✅ Authentication Required
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized ticket access', { requestId });
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // ✅ Rate Limiting
    const rateLimitResult = await apiRateLimiter.check(
      100,
      `contact:get:${session.user.id}`
    );

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded', { userId: session.user.id, requestId });
      return apiResponse.rateLimited(60, requestId);
    }

    const ticketId = params.id;

    logger.debug('Fetching ticket', {
      userId: session.user.id,
      ticketId,
      requestId,
    });

    // ✅ Get Ticket (with ownership check)
    const ticket = await supportService.getById(ticketId, session.user.id);

    if (!ticket) {
      logger.warn('Ticket not found or access denied', {
        userId: session.user.id,
        ticketId,
        requestId,
      });
      return apiResponse.notFound('Ticket', requestId);
    }

    const duration = Date.now() - startTime;

    logger.info('Ticket fetched', {
      userId: session.user.id,
      ticketId,
      ticketNumber: ticket.ticketNumber,
      duration,
      requestId,
    });

    return apiResponse.success(ticket, {
      meta: { requestId, duration },
    });
  } catch (error) {
    logger.error('Failed to fetch ticket', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// PATCH - Update Ticket
// =============================================================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // ✅ Authentication Required
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized ticket update', { requestId });
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // ✅ Rate Limiting
    const rateLimitResult = await apiRateLimiter.check(
      20,
      `contact:update:${session.user.id}`
    );

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded', { userId: session.user.id, requestId });
      return apiResponse.rateLimited(60, requestId);
    }

    // ✅ Parse Body
    const body = await req.json();
    const { action } = body;

    const ticketId = params.id;

    logger.info('Updating ticket', {
      userId: session.user.id,
      ticketId,
      action,
      requestId,
    });

    let updatedTicket;

    // ✅ Handle Different Actions
    switch (action) {
      case 'update': {
        const validated = updateTicketSchema.parse(body);
        updatedTicket = await supportService.updateTicket(
          ticketId,
          validated,
          session.user.id
        );
        break;
      }

      case 'rate': {
        const validated = rateTicketSchema.parse(body);
        updatedTicket = await supportService.rateTicket(
          ticketId,
          session.user.id,
          validated.rating,
          validated.comment
        );
        break;
      }

      case 'reply': {
        const validated = addReplySchema.parse(body);
        await supportService.addReply({
          ticketId,
          userId: session.user.id,
          message: validated.message,
          attachments: validated.attachments,
        });
        updatedTicket = await supportService.getById(ticketId, session.user.id);
        break;
      }

      case 'close': {
        updatedTicket = await supportService.closeTicket(
          ticketId,
          body.resolution,
          session.user.id
        );
        break;
      }

      default:
        return apiResponse.validationError(
          'Invalid action. Use: update, rate, reply, or close',
          undefined,
          requestId
        );
    }

    // ✅ Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        category: 'support',
        entityType: 'support_ticket',
        entityId: ticketId,
        description: `Updated ticket: ${action}`,
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: req.headers.get('user-agent'),
      },
    });

    const duration = Date.now() - startTime;

    logger.info('Ticket updated', {
      userId: session.user.id,
      ticketId,
      action,
      duration,
      requestId,
    });

    return apiResponse.success(updatedTicket, {
      meta: { requestId, duration },
      message: 'Ticket updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid update data', { errors: error.errors, requestId });
      return apiResponse.validationError(
        'Invalid update data',
        error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        requestId
      );
    }

    logger.error('Failed to update ticket', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// DELETE - Close/Delete Ticket
// =============================================================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // ✅ Authentication Required
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized ticket deletion', { requestId });
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // ✅ Rate Limiting
    const rateLimitResult = await apiRateLimiter.check(
      10,
      `contact:delete:${session.user.id}`
    );

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded', { userId: session.user.id, requestId });
      return apiResponse.rateLimited(60, requestId);
    }

    const ticketId = params.id;

    logger.info('Closing ticket', {
      userId: session.user.id,
      ticketId,
      requestId,
    });

    // ✅ Close Ticket (soft delete)
    const closedTicket = await supportService.closeTicket(
      ticketId,
      'Closed by user',
      session.user.id
    );

    if (!closedTicket) {
      logger.warn('Ticket not found or access denied', {
        userId: session.user.id,
        ticketId,
        requestId,
      });
      return apiResponse.notFound('Ticket', requestId);
    }

    // ✅ Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        category: 'support',
        entityType: 'support_ticket',
        entityId: ticketId,
        description: 'Closed ticket',
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: req.headers.get('user-agent'),
      },
    });

    const duration = Date.now() - startTime;

    logger.info('Ticket closed', {
      userId: session.user.id,
      ticketId,
      duration,
      requestId,
    });

    return apiResponse.success(
      { id: ticketId, status: 'CLOSED' },
      {
        meta: { requestId, duration },
        message: 'Ticket closed successfully',
      }
    );
  } catch (error) {
    logger.error('Failed to close ticket', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// OPTIONS - CORS Preflight
// =============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}