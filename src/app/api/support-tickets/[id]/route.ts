// src/app/api/support-tickets/[id]/route.ts
// =============================================================================
// INDIVIDUAL SUPPORT TICKET ROUTES
// Handles: GET, PUT, PATCH, DELETE, OPTIONS, HEAD
// =============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { TicketPriority, Prisma } from '@prisma/client';
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

const RATE_LIMIT = 60;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, PUT, PATCH, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const updateTicketSchema = z.object({
  subject: z.string().min(5).max(200).optional(),
  description: z.string().min(20).max(5000).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assignedTo: z.string().cuid().nullable().optional(),
  resolution: z.string().max(2000).optional(),
  attachments: z.array(z.string().url()).max(5).optional(),
});

const rateTicketSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});


const actionSchema = z.object({
  action: z.enum(['close', 'resolve', 'reopen', 'rate', 'assign', 'priority']),
  resolution: z.string().max(2000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
  assignedTo: z.string().cuid().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

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

async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, ip);

  if (!rateLimitResult.success) {
    return { error: apiResponse.rateLimited(60, requestId), session: null, rateLimitResult, isAdmin: false };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: apiResponse.unauthorized('Authentication required', requestId), session: null, rateLimitResult, isAdmin: false };
  }

  const isAdmin = session.user.isAdmin || session.user.role === 'admin';

  return { error: null, session, rateLimitResult, isAdmin };
}

async function getTicketWithAccess(
  id: string,
  userId: string,
  isAdmin: boolean,
  includeReplies = false
) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      ...(includeReplies
        ? {
            replies: {
              orderBy: { createdAt: 'asc' },
              where: isAdmin ? {} : { isInternal: false },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
            },
          }
        : {}),
      _count: {
        select: { replies: true },
      },
    },
  });

  if (!ticket) return null;

  // Check access
  if (!isAdmin && ticket.userId !== userId) {
    return null;
  }

  return ticket;
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
        action: action as any,
        category: 'support',
        entityType: 'supportTicket',
        entityId,
        description,
        metadata: metadata as Prisma.InputJsonValue,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent'),
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
  return addSecurityHeaders(new NextResponse(null, { status: 204, headers: CORS_HEADERS }), requestId);
}

// =============================================================================
// HEAD
// =============================================================================

export async function HEAD(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, isAdmin } = await validateSession(request, requestId);

    if (error) {
      return addSecurityHeaders(new NextResponse(null, { status: 401 }), requestId);
    }

    const { id } = await params;
    const ticket = await getTicketWithAccess(id, session!.user.id, isAdmin);

    if (!ticket) {
      return addSecurityHeaders(new NextResponse(null, { status: 404 }), requestId);
    }

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Ticket-Status': ticket.status,
        'X-Ticket-Priority': ticket.priority,
        'X-Reply-Count': String(ticket._count.replies),
        'Last-Modified': ticket.updatedAt.toUTCString(),
        'ETag': `"ticket-${ticket.id}-${ticket.updatedAt.getTime()}"`,
      },
    });

    return addSecurityHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD support-tickets/[id] failed', { requestId }, error);
    return addSecurityHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// GET - Get single ticket with replies
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult, isAdmin } = await validateSession(request, requestId);

    if (error) return addSecurityHeaders(error, requestId);

    const { id } = await params;
    const userId = session!.user.id;

    logger.debug('Fetching ticket', { ticketId: id, userId, requestId });

    const ticket = await getTicketWithAccess(id, userId, isAdmin, true);

    if (!ticket) {
      return addSecurityHeaders(apiResponse.notFound('Ticket', requestId), requestId);
    }

    // Calculate SLA status
    const slaStatus = calculateSLAStatus(ticket);

    logger.info('Ticket fetched', {
      ticketId: id,
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        ...ticket,
        slaStatus,
      },
      {
        meta: { requestId },
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );

    return addSecurityHeaders(response, requestId);
  } catch (error) {
    logger.error('GET support-tickets/[id] failed', { requestId }, error);
    return addSecurityHeaders(
      apiResponse.internalError('Failed to fetch ticket', requestId),
      requestId
    );
  }
}

// =============================================================================
// PUT - Full update of ticket
// =============================================================================

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult, isAdmin } = await validateSession(request, requestId);

    if (error) return addSecurityHeaders(error, requestId);

    const { id } = await params;
    const userId = session!.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addSecurityHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId
      );
    }

    const validation = updateTicketSchema.safeParse(body);

    if (!validation.success) {
      return addSecurityHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId
      );
    }

    // Get ticket with access check
    const ticket = await getTicketWithAccess(id, userId, isAdmin);

    if (!ticket) {
      return addSecurityHeaders(apiResponse.notFound('Ticket', requestId), requestId);
    }

    const data = validation.data;

    // Non-admin users can only update subject and description
    if (!isAdmin) {
      const allowedFields = ['subject', 'description', 'attachments'];
      const attemptedFields = Object.keys(data);
      const disallowedFields = attemptedFields.filter((f) => !allowedFields.includes(f));

      if (disallowedFields.length > 0) {
        return addSecurityHeaders(
          apiResponse.forbidden(`Cannot update fields: ${disallowedFields.join(', ')}`, requestId),
          requestId
        );
      }
    }

    // Handle status change
    if (data.status && data.status !== ticket.status) {
      if (data.status === 'RESOLVED' && !data.resolution && !ticket.resolution) {
        return addSecurityHeaders(
          apiResponse.validationError('Resolution is required when marking as resolved', undefined, requestId),
          requestId
        );
      }
    }

    // Update ticket
    const updated = await prisma.supportTicket.update({
      where: { id },
      data: {
        ...data,
        ...(data.status === 'RESOLVED' ? { resolvedAt: new Date() } : {}),
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        _count: { select: { replies: true } },
      },
    });

    await createAuditLog(
      userId,
      'UPDATE',
      `Ticket updated: ${ticket.ticketNumber}`,
      request,
      id,
      { changes: Object.keys(data) }
    );

    logger.info('Ticket updated', {
      ticketId: id,
      userId,
      changes: Object.keys(data),
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(updated, {
      meta: { requestId },
      message: 'Ticket updated successfully',
      headers: {
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });

    return addSecurityHeaders(response, requestId);
  } catch (error) {
    logger.error('PUT support-tickets/[id] failed', { requestId }, error);
    return addSecurityHeaders(
      apiResponse.internalError('Failed to update ticket', requestId),
      requestId
    );
  }
}

// =============================================================================
// PATCH - Quick actions on ticket
// =============================================================================
async function handleRateTicketAction(
  ticketId: string,
  request: NextRequest,
  userId: string,
  requestId: string
) {
  // Parse JSON
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiResponse.validationError('Invalid JSON body', undefined, requestId);
  }

  // Validate rating + comment using rateTicketSchema
  const validation = rateTicketSchema.safeParse(body);

  if (!validation.success) {
    return apiResponse.validationError(
      'Validation failed',
      validation.error.errors,
      requestId
    );
  }

  const { rating, comment } = validation.data;

  // Ensure ticket exists + belongs to user
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, userId: true, status: true, ticketNumber: true },
  });

  if (!ticket) {
    return apiResponse.notFound('Ticket', requestId);
  }

  if (ticket.userId !== userId) {
    return apiResponse.forbidden('Only the ticket owner can rate', requestId);
  }

  if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
    return apiResponse.validationError(
      'Can only rate resolved or closed tickets',
      undefined,
      requestId
    );
  }

  // Update using service
  const updated = await supportService.rateTicket(ticketId, userId, rating, comment);

  return apiResponse.success(updated, {
    meta: { requestId },
    message: 'Ticket rated successfully',
  });
}


























export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult, isAdmin } = await validateSession(request, requestId);

    if (error) return addSecurityHeaders(error, requestId);

    const { id } = await params;
    const userId = session!.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addSecurityHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId
      );
    }

    // Get ticket with access check
    const ticket = await getTicketWithAccess(id, userId, isAdmin);

    if (!ticket) {
      return addSecurityHeaders(apiResponse.notFound('Ticket', requestId), requestId);
    }

    // Check if this is an action request
    const actionValidation = actionSchema.safeParse(body);

    if (actionValidation.success) {
      const { action, resolution, rating, assignedTo, priority } = actionValidation.data;
      let updated;

      switch (action) {
        case 'close':
          if (!isAdmin && ticket.status === 'IN_PROGRESS') {
            return addSecurityHeaders(
              apiResponse.validationError('Cannot close ticket while in progress', undefined, requestId),
              requestId
            );
          }
          updated = await supportService.closeTicket(id, resolution, isAdmin ? undefined : userId);
          break;

        case 'resolve':
          if (!isAdmin) {
            return addSecurityHeaders(
              apiResponse.forbidden('Only staff can resolve tickets', requestId),
              requestId
            );
          }
          if (!resolution) {
            return addSecurityHeaders(
              apiResponse.validationError('Resolution is required', undefined, requestId),
              requestId
            );
          }
          updated = await supportService.resolveTicket(id, resolution);
          break;

        case 'reopen':
          if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
            return addSecurityHeaders(
              apiResponse.validationError('Can only reopen resolved or closed tickets', undefined, requestId),
              requestId
            );
          }
          updated = await prisma.supportTicket.update({
            where: { id },
            data: { status: 'OPEN', resolvedAt: null, updatedAt: new Date() },
          });
          break;

        case 'rate':
          if (ticket.userId !== userId) {
            return addSecurityHeaders(
              apiResponse.forbidden('Only the ticket owner can rate', requestId),
              requestId
            );
          }
          if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
            return addSecurityHeaders(
              apiResponse.validationError('Can only rate resolved or closed tickets', undefined, requestId),
              requestId
            );
          }
          if (!rating) {
            return addSecurityHeaders(
              apiResponse.validationError('Rating is required', undefined, requestId),
              requestId
            );
          }
         const res = await handleRateTicketAction(id, request, userId, requestId);
return addSecurityHeaders(res, requestId);


        case 'assign':
          if (!isAdmin) {
            return addSecurityHeaders(
              apiResponse.forbidden('Only admins can assign tickets', requestId),
              requestId
            );
          }
          updated = await prisma.supportTicket.update({
            where: { id },
            data: {
              assignedTo: assignedTo || null,
              status: assignedTo ? 'IN_PROGRESS' : ticket.status,
              updatedAt: new Date(),
            },
          });
          break;

        case 'priority':
          if (!isAdmin) {
            return addSecurityHeaders(
              apiResponse.forbidden('Only admins can change priority', requestId),
              requestId
            );
          }
          if (!priority) {
            return addSecurityHeaders(
              apiResponse.validationError('Priority is required', undefined, requestId),
              requestId
            );
          }
          updated = await prisma.supportTicket.update({
            where: { id },
            data: { priority: priority as TicketPriority, updatedAt: new Date() },
          });
          break;
      }

      await createAuditLog(userId, 'UPDATE', `Ticket ${action}: ${ticket.ticketNumber}`, request, id, {
        action,
      });

      logger.info('Ticket action completed', {
        ticketId: id,
        action,
        userId,
        requestId,
        duration: Date.now() - startTime,
      });

      const response = apiResponse.success(updated, {
        meta: { requestId },
        message: `Ticket ${action} successful`,
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      });

      return addSecurityHeaders(response, requestId);
    }

    // Regular partial update
    const updateValidation = updateTicketSchema.partial().safeParse(body);

    if (!updateValidation.success) {
      return addSecurityHeaders(
        apiResponse.validationError('Validation failed', updateValidation.error.errors, requestId),
        requestId
      );
    }

    const updated = await prisma.supportTicket.update({
      where: { id },
      data: {
        ...updateValidation.data,
        updatedAt: new Date(),
      },
    });

    logger.info('Ticket patched', {
      ticketId: id,
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(updated, {
      meta: { requestId },
      headers: {
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });

    return addSecurityHeaders(response, requestId);
  } catch (error) {
    logger.error('PATCH support-tickets/[id] failed', { requestId }, error);
    return addSecurityHeaders(
      apiResponse.internalError('Failed to update ticket', requestId),
      requestId
    );
  }
}

// =============================================================================
// DELETE - Delete ticket
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult, isAdmin } = await validateSession(request, requestId);

    if (error) return addSecurityHeaders(error, requestId);

    const { id } = await params;
    const userId = session!.user.id;

    // Get ticket
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: { _count: { select: { replies: true } } },
    });

    if (!ticket) {
      return addSecurityHeaders(apiResponse.notFound('Ticket', requestId), requestId);
    }

    // Access check
    if (!isAdmin && ticket.userId !== userId) {
      return addSecurityHeaders(
        apiResponse.forbidden('You can only delete your own tickets', requestId),
        requestId
      );
    }

    // Non-admin restrictions
    if (!isAdmin) {
      if (ticket.status !== 'OPEN') {
        return addSecurityHeaders(
          apiResponse.validationError('You can only delete open tickets', undefined, requestId),
          requestId
        );
      }

      if (ticket._count.replies > 0) {
        return addSecurityHeaders(
          apiResponse.validationError('Cannot delete tickets with replies', undefined, requestId),
          requestId
        );
      }
    }

    // Delete ticket
    await prisma.supportTicket.delete({ where: { id } });

    await createAuditLog(userId, 'DELETE', `Ticket deleted: ${ticket.ticketNumber}`, request, id, {
      subject: ticket.subject,
    });

    logger.info('Ticket deleted', {
      ticketId: id,
      ticketNumber: ticket.ticketNumber,
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      { message: 'Ticket deleted successfully', ticketNumber: ticket.ticketNumber },
      {
        meta: { requestId },
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );

    return addSecurityHeaders(response, requestId);
  } catch (error) {
    logger.error('DELETE support-tickets/[id] failed', { requestId }, error);
    return addSecurityHeaders(
      apiResponse.internalError('Failed to delete ticket', requestId),
      requestId
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateSLAStatus(ticket: any): {
  responseStatus: 'pending' | 'met' | 'breached';
  resolutionStatus: 'pending' | 'met' | 'breached' | 'not_applicable';
  responseDeadline?: Date;
  resolutionDeadline?: Date;
} {
  const priorityHours: Record<string, { response: number; resolution: number }> = {
    LOW: { response: 48, resolution: 168 },
    MEDIUM: { response: 24, resolution: 72 },
    HIGH: { response: 8, resolution: 24 },
    CRITICAL: { response: 2, resolution: 8 },
  };

  const hours = priorityHours[ticket.priority] || priorityHours.MEDIUM;
  const createdAt = new Date(ticket.createdAt);

  const responseDeadline = new Date(createdAt.getTime() + hours.response * 60 * 60 * 1000);
  const resolutionDeadline = new Date(createdAt.getTime() + hours.resolution * 60 * 60 * 1000);

  const now = new Date();
  const hasFirstResponse = ticket.replies?.some((r: any) => r.isStaffReply) || false;
  const isResolved = ['RESOLVED', 'CLOSED'].includes(ticket.status);

  let responseStatus: 'pending' | 'met' | 'breached';
  if (hasFirstResponse) {
    const firstResponse = ticket.replies?.find((r: any) => r.isStaffReply);
    responseStatus = new Date(firstResponse.createdAt) <= responseDeadline ? 'met' : 'breached';
  } else {
    responseStatus = now <= responseDeadline ? 'pending' : 'breached';
  }

  let resolutionStatus: 'pending' | 'met' | 'breached' | 'not_applicable';
  if (isResolved) {
    const resolvedAt = ticket.resolvedAt ? new Date(ticket.resolvedAt) : now;
    resolutionStatus = resolvedAt <= resolutionDeadline ? 'met' : 'breached';
  } else if (['OPEN', 'IN_PROGRESS', 'WAITING'].includes(ticket.status)) {
    resolutionStatus = now <= resolutionDeadline ? 'pending' : 'breached';
  } else {
    resolutionStatus = 'not_applicable';
  }

  return {
    responseStatus,
    resolutionStatus,
    responseDeadline,
    resolutionDeadline,
  };
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';