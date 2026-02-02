// src/app/api/support-tickets/route.ts
// =============================================================================
// SUPPORT TICKETS API - Main Collection Endpoint
// Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { TicketStatus, TicketPriority, Prisma, AuditAction } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { supportService } from '@/services/supportService';
import { supportConfig, SUPPORT_CATEGORIES, getPriorityConfig } from '@/config/support';

// =============================================================================
// CONSTANTS & HEADERS
// =============================================================================

const RATE_LIMIT_USER = 30;
const RATE_LIMIT_ADMIN = 100;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID, X-API-Key',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true',
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createTicketSchema = z.object({
  subject: z
    .string()
    .min(5, 'Subject must be at least 5 characters')
    .max(200, 'Subject must be less than 200 characters')
    .transform((val) => val.trim()),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(10000, 'Description must be less than 10000 characters')
    .transform((val) => val.trim()),
  category: z.enum(['bug', 'feature', 'account', 'billing', 'sync', 'data', 'security', 'other'], {
    errorMap: () => ({ message: 'Invalid category' }),
  }),
  priority: z.nativeEnum(TicketPriority).optional().default('MEDIUM'),
  attachments: z
    .array(z.string().url('Invalid attachment URL'))
    .max(5, 'Maximum 5 attachments')
    .optional()
    .default([]),
  metadata: z.record(z.unknown()).optional(),
});

const querySchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  category: z.string().max(50).optional(),
  assignedTo: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status', 'ticketNumber']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().max(200).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

const bulkUpdateSchema = z.object({
  ids: z.array(z.string().cuid()).min(1, 'At least one ID required').max(100, 'Maximum 100 IDs'),
  action: z.enum(['close', 'resolve', 'reopen', 'delete', 'updateStatus', 'updatePriority', 'assign']),
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  assignedTo: z.string().cuid().nullable().optional(),
  resolution: z.string().max(5000).optional(),
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(50),
  permanent: z.boolean().default(false),
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
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('true-client-ip') ||
    'unknown'
  );
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  rateLimitResult?: { limit: number; remaining: number; reset: number }
): NextResponse {
  // Security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // CORS headers
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Request tracking
  response.headers.set('X-Request-ID', requestId);
  response.headers.set('X-Response-Time', `${Date.now()}ms`);

  // Rate limit headers
  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    response.headers.set('X-RateLimit-Reset', String(rateLimitResult.reset));
  }

  return response;
}

function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:/gi, '')
    .trim();
}

async function validateAndGetSession(request: NextRequest, requestId: string, requireAdmin = false) {
  const ip = getClientIp(request);
  const rateLimit = requireAdmin ? RATE_LIMIT_ADMIN : RATE_LIMIT_USER;
  const rateLimitResult = await checkLimit(apiRateLimiter, rateLimit, `support:${ip}`);

  if (!rateLimitResult.success) {
    logger.warn('Rate limit exceeded', { ip, requestId, endpoint: 'support-tickets' });
    return {
      error: addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult),
      session: null,
      rateLimitResult,
      isAdmin: false,
    };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    logger.debug('Unauthorized access attempt', { ip, requestId });
    return {
      error: addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId, rateLimitResult),
      session: null,
      rateLimitResult,
      isAdmin: false,
    };
  }

  const isAdmin = Boolean(session.user.isAdmin || session.user.role === 'admin');

  if (requireAdmin && !isAdmin) {
    logger.warn('Non-admin access attempt to admin endpoint', { userId: session.user.id, requestId });
    return {
      error: addHeaders(apiResponse.forbidden('Admin access required', requestId), requestId, rateLimitResult),
      session: null,
      rateLimitResult,
      isAdmin: false,
    };
  }

  return { error: null, session, rateLimitResult, isAdmin };
}

/**
 * Map string action to AuditAction enum
 */
function mapToAuditAction(action: string): AuditAction {
  const actionMap: Record<string, AuditAction> = {
    CREATE: 'CREATE',
    READ: 'READ',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    ADMIN_ACTION: 'ADMIN_ACTION',
  };

  return actionMap[action.toUpperCase()] || 'UPDATE';
}

async function createAuditLog(
  userId: string,
  action: string,
  description: string,
  request: NextRequest,
  entityId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
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
        requestPath: request.nextUrl.pathname,
        requestMethod: request.method,
        status: 'success',
      },
    });
  } catch (error) {
    logger.error('Failed to create audit log', { userId, action, entityId, metadata }, error);
  }
}

// =============================================================================
// OPTIONS - CORS Preflight
// =============================================================================

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  logger.debug('OPTIONS request', { requestId, path: request.nextUrl.pathname });

  const response = new NextResponse(null, { status: 204 });
  return addHeaders(response, requestId);
}

// =============================================================================
// HEAD - Get Collection Metadata
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult, isAdmin } = await validateAndGetSession(request, requestId);

    if (error) {
      return new NextResponse(null, { status: 401 });
    }

    const userId = session!.user.id;
    const where: Prisma.SupportTicketWhereInput = isAdmin ? {} : { userId };

    const [total, open, inProgress, waiting, resolved, closed] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.count({ where: { ...where, status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.supportTicket.count({ where: { ...where, status: 'WAITING' } }),
      prisma.supportTicket.count({ where: { ...where, status: 'RESOLVED' } }),
      prisma.supportTicket.count({ where: { ...where, status: 'CLOSED' } }),
    ]);

    logger.debug('HEAD request completed', { requestId, total, duration: Date.now() - startTime });

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Total-Count': String(total),
        'X-Open-Count': String(open),
        'X-In-Progress-Count': String(inProgress),
        'X-Waiting-Count': String(waiting),
        'X-Resolved-Count': String(resolved),
        'X-Closed-Count': String(closed),
        'X-Is-Admin': String(isAdmin),
        'Last-Modified': new Date().toUTCString(),
      },
    });

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - List Tickets
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult, isAdmin } = await validateAndGetSession(request, requestId);

    if (error) return error;

    const userId = session!.user.id;

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      category: searchParams.get('category') || undefined,
      assignedTo: searchParams.get('assignedTo') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
      search: searchParams.get('search') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { status, priority, category, assignedTo, page, limit, sortBy, sortOrder, search, dateFrom, dateTo } =
      queryValidation.data;

    // Build where clause
    const where: Prisma.SupportTicketWhereInput = isAdmin ? {} : { userId };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (assignedTo) where.assignedTo = assignedTo;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Execute queries
    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          _count: {
            select: { replies: true },
          },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    logger.info('Tickets fetched', {
      userId,
      isAdmin,
      count: tickets.length,
      total,
      page,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.paginated(
      tickets,
      {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      { meta: { requestId, isAdmin } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET support-tickets failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch tickets', requestId), requestId);
  }
}

// =============================================================================
// POST - Create Ticket or Bulk Action
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult, isAdmin } = await validateAndGetSession(request, requestId);

    if (error) return error;

    const userId = session!.user.id;

    // Check if support system is enabled
    if (!supportConfig.enabled) {
      return addHeaders(
        apiResponse.validationError('Support system is currently disabled', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Parse request body
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

    // Check if this is a bulk action (admin only)
    if (typeof body === 'object' && body !== null && 'action' in body && 'ids' in body) {
      if (!isAdmin) {
        return addHeaders(
          apiResponse.forbidden('Admin access required for bulk actions', requestId),
          requestId,
          rateLimitResult
        );
      }

      return handleBulkUpdate(body, userId, request, requestId, rateLimitResult);
    }

    // Validate ticket creation
    const validation = createTicketSchema.safeParse(body);

    if (!validation.success) {
      logger.warn('Ticket validation failed', { userId, errors: validation.error.errors, requestId });
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { subject, description, category, priority, attachments, metadata } = validation.data;

    // Validate category config
    const categoryConfig = SUPPORT_CATEGORIES.find((c) => c.id === category);
    if (!categoryConfig) {
      return addHeaders(
        apiResponse.validationError(`Invalid category: ${category}`, undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Sanitize inputs
    const sanitizedSubject = sanitizeInput(subject);
    const sanitizedDescription = sanitizeInput(description);

    // Build ticket metadata
    const ticketMetadata = {
      ...metadata,
      browser: request.headers.get('user-agent'),
      ipAddress: getClientIp(request),
      referrer: request.headers.get('referer'),
      acceptLanguage: request.headers.get('accept-language'),
      submittedAt: new Date().toISOString(),
      source: 'web',
    };

    // Create ticket using service
    const ticket = await supportService.createTicket({
      userId,
      subject: sanitizedSubject,
      description: sanitizedDescription,
      category,
      priority,
      attachments,
      metadata: ticketMetadata,
    });

    // Create auto-reply if enabled
    if (supportConfig.autoResponse.enabled && supportConfig.autoResponse.acknowledgementEnabled) {
      const priorityConfig = getPriorityConfig(priority);
      const responseTime = priorityConfig?.responseTimeHours || 24;

      await prisma.ticketReply.create({
        data: {
          ticketId: ticket.id,
          message: `Thank you for contacting support. We have received your ticket and will respond within ${responseTime} hours.\n\n**Ticket Details:**\n- Ticket Number: ${ticket.ticketNumber}\n- Priority: ${priority}\n- Category: ${categoryConfig.name}\n\nPlease do not submit duplicate tickets for the same issue. You can track this ticket's status anytime.`,
          isAutoReply: true,
          isStaffReply: true,
        },
      });
    }

    // Create audit log
    await createAuditLog(userId, 'CREATE', `Created support ticket: ${ticket.ticketNumber}`, request, ticket.id, {
      category,
      priority,
      subject: sanitizedSubject.substring(0, 100),
    });

    logger.info('Support ticket created', {
      userId,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      category,
      priority,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.created(ticket, { requestId });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST support-tickets failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to create ticket', requestId), requestId);
  }
}

// =============================================================================
// PUT - Bulk Update (Admin Only)
// =============================================================================

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateAndGetSession(request, requestId, true);

    if (error) return error;

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

    return handleBulkUpdate(body, userId, request, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PUT support-tickets failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to process bulk update', requestId), requestId);
  }
}

// =============================================================================
// PATCH - Partial Bulk Update
// =============================================================================

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult, isAdmin } = await validateAndGetSession(request, requestId);

    if (error) return error;

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

    // Check if bulk action
    if (typeof body === 'object' && body !== null && 'ids' in body) {
      if (!isAdmin) {
        return addHeaders(
          apiResponse.forbidden('Admin access required for bulk operations', requestId),
          requestId,
          rateLimitResult
        );
      }

      return handleBulkUpdate(body, userId, request, requestId, rateLimitResult);
    }

    // Single ticket update - requires id
    const { id, ticketNumber, ...updateData } = body as { id?: string; ticketNumber?: string } & Record<
      string,
      unknown
    >;

    if (!id && !ticketNumber) {
      return addHeaders(
        apiResponse.validationError('Ticket ID or ticket number is required', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: id ? { id } : { ticketNumber: ticketNumber! },
    });

    if (!ticket) {
      return addHeaders(apiResponse.notFound('Ticket', requestId), requestId, rateLimitResult);
    }

    // Check ownership
    if (!isAdmin && ticket.userId !== userId) {
      return addHeaders(
        apiResponse.forbidden('You can only update your own tickets', requestId),
        requestId,
        rateLimitResult
      );
    }

    // Filter allowed fields
    const allowedUserFields = ['subject', 'description', 'attachments'];
    const allowedAdminFields = [
      'subject',
      'description',
      'status',
      'priority',
      'assignedTo',
      'resolution',
      'attachments',
      'category',
    ];
    const allowedFields = isAdmin ? allowedAdminFields : allowedUserFields;

    const filteredData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        filteredData[key] = value;
      }
    }

    if (Object.keys(filteredData).length === 0) {
      return addHeaders(
        apiResponse.validationError('No valid fields to update', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Add timestamps for status changes
    if (filteredData.status === 'RESOLVED' && !ticket.resolvedAt) {
      filteredData.resolvedAt = new Date();
    }

    const updated = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        ...filteredData,
        updatedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { replies: true } },
      },
    });

    await createAuditLog(userId, 'UPDATE', `Updated ticket: ${ticket.ticketNumber}`, request, ticket.id, {
      changes: Object.keys(filteredData),
    });

    logger.info('Ticket patched', {
      ticketId: ticket.id,
      userId,
      changes: Object.keys(filteredData),
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(updated, { meta: { requestId }, message: 'Ticket updated successfully' });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PATCH support-tickets failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update ticket', requestId), requestId);
  }
}

// =============================================================================
// DELETE - Bulk Delete (Admin Only)
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult, isAdmin } = await validateAndGetSession(request, requestId);

    if (error) return error;

    const userId = session!.user.id;

    // Check for query params (single delete)
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ticketNumber = searchParams.get('ticketNumber');

    if (id || ticketNumber) {
      // Single ticket delete
      const ticket = await prisma.supportTicket.findFirst({
        where: id ? { id } : { ticketNumber: ticketNumber! },
        include: { _count: { select: { replies: true } } },
      });

      if (!ticket) {
        return addHeaders(apiResponse.notFound('Ticket', requestId), requestId, rateLimitResult);
      }

      // Non-admin restrictions
      if (!isAdmin) {
        if (ticket.userId !== userId) {
          return addHeaders(
            apiResponse.forbidden('You can only delete your own tickets', requestId),
            requestId,
            rateLimitResult
          );
        }

        if (ticket.status !== 'OPEN') {
          return addHeaders(
            apiResponse.validationError('You can only delete open tickets', undefined, requestId),
            requestId,
            rateLimitResult
          );
        }

        if (ticket._count.replies > 0) {
          return addHeaders(
            apiResponse.validationError('Cannot delete tickets with replies. Please close it instead.', undefined, requestId),
            requestId,
            rateLimitResult
          );
        }
      }

      await prisma.supportTicket.delete({ where: { id: ticket.id } });

      await createAuditLog(userId, 'DELETE', `Deleted ticket: ${ticket.ticketNumber}`, request, ticket.id, {
        subject: ticket.subject,
        status: ticket.status,
      });

      logger.info('Ticket deleted', {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        userId,
        requestId,
        duration: Date.now() - startTime,
      });

      const response = apiResponse.success(
        { message: 'Ticket deleted successfully', ticketNumber: ticket.ticketNumber },
        { meta: { requestId } }
      );
      return addHeaders(response, requestId, rateLimitResult);
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
        apiResponse.validationError('Invalid JSON body or missing query parameters', undefined, requestId),
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

    const { ids, permanent } = validation.data;

    if (permanent) {
      // Hard delete with cascade
      await prisma.$transaction([
        prisma.ticketReply.deleteMany({ where: { ticketId: { in: ids } } }),
        prisma.supportTicket.deleteMany({ where: { id: { in: ids } } }),
      ]);
    } else {
      // Soft delete (close tickets)
      await prisma.supportTicket.updateMany({
        where: { id: { in: ids } },
        data: { status: 'CLOSED', resolution: 'Bulk closed by admin', updatedAt: new Date() },
      });
    }

    await createAuditLog(
      userId,
      'DELETE',
      `Bulk ${permanent ? 'deleted' : 'closed'} ${ids.length} tickets`,
      request,
      undefined,
      { ids, permanent }
    );

    logger.info('Bulk delete completed', {
      userId,
      count: ids.length,
      permanent,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        message: `${ids.length} tickets ${permanent ? 'permanently deleted' : 'closed'}`,
        affected: ids.length,
        permanent,
      },
      { meta: { requestId } }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE support-tickets failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to delete tickets', requestId), requestId);
  }
}

// =============================================================================
// BULK UPDATE HANDLER
// =============================================================================

async function handleBulkUpdate(
  body: unknown,
  userId: string,
  request: NextRequest,
  requestId: string,
  rateLimitResult: { limit: number; remaining: number; reset: number }
): Promise<NextResponse> {
  const startTime = Date.now();

  const validation = bulkUpdateSchema.safeParse(body);

  if (!validation.success) {
    return addHeaders(
      apiResponse.validationError('Invalid bulk action', validation.error.errors, requestId),
      requestId,
      rateLimitResult
    );
  }

  const { ids, action, status, priority, assignedTo, resolution } = validation.data;

  let updateData: Prisma.SupportTicketUpdateManyMutationInput = { updatedAt: new Date() };
  let affectedCount = 0;

  try {
    switch (action) {
      case 'close':
        updateData = {
          ...updateData,
          status: 'CLOSED',
          resolution: resolution || 'Closed by admin',
        };
        break;

      case 'resolve':
        if (!resolution) {
          return addHeaders(
            apiResponse.validationError('Resolution is required for resolve action', undefined, requestId),
            requestId,
            rateLimitResult
          );
        }
        updateData = {
          ...updateData,
          status: 'RESOLVED',
          resolution,
          resolvedAt: new Date(),
        };
        break;

      case 'reopen':
        updateData = {
          ...updateData,
          status: 'OPEN',
          resolvedAt: null,
        };
        break;

      case 'updateStatus':
        if (!status) {
          return addHeaders(
            apiResponse.validationError('Status is required for updateStatus action', undefined, requestId),
            requestId,
            rateLimitResult
          );
        }
        updateData = { ...updateData, status };
        if (status === 'RESOLVED') {
          updateData.resolvedAt = new Date();
        }
        break;

      case 'updatePriority':
        if (!priority) {
          return addHeaders(
            apiResponse.validationError('Priority is required for updatePriority action', undefined, requestId),
            requestId,
            rateLimitResult
          );
        }
        updateData = { ...updateData, priority };
        break;

      case 'assign':
        updateData = {
          ...updateData,
          assignedTo: assignedTo || null,
          status: assignedTo ? 'IN_PROGRESS' : undefined,
        };
        break;

      case 'delete':
        await prisma.$transaction([
          prisma.ticketReply.deleteMany({ where: { ticketId: { in: ids } } }),
          prisma.supportTicket.deleteMany({ where: { id: { in: ids } } }),
        ]);
        affectedCount = ids.length;

        await createAuditLog(userId, 'DELETE', `Bulk deleted ${ids.length} tickets`, request, undefined, { ids });

        logger.info('Bulk delete completed', { userId, count: ids.length, requestId, duration: Date.now() - startTime });

        const deleteResponse = apiResponse.success(
          { message: `${ids.length} tickets deleted`, affected: ids.length, action },
          { meta: { requestId } }
        );
        return addHeaders(deleteResponse, requestId, rateLimitResult);

      default:
        return addHeaders(
          apiResponse.validationError(`Unknown action: ${action}`, undefined, requestId),
          requestId,
          rateLimitResult
        );
    }

    const result = await prisma.supportTicket.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    affectedCount = result.count;

    await createAuditLog(userId, 'UPDATE', `Bulk ${action} on ${ids.length} tickets`, request, undefined, {
      action,
      ids,
      affected: affectedCount,
    });

    logger.info('Bulk action completed', {
      userId,
      action,
      requested: ids.length,
      affected: affectedCount,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        message: `${action} completed on ${affectedCount} ticket(s)`,
        action,
        requested: ids.length,
        affected: affectedCount,
      },
      { meta: { requestId } }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('Bulk action failed', { action, ids, requestId }, error);
    return addHeaders(apiResponse.internalError(`Failed to ${action} tickets`, requestId), requestId, rateLimitResult);
  }
}

// =============================================================================
// RUNTIME CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;