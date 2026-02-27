// src/app/api/admin/support-tickets/route.ts
// =============================================================================
// ADMIN SUPPORT TICKETS API
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


// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 100;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION
// =============================================================================

const querySchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  category: z.string().max(50).optional(),
  assignedTo: z.string().cuid().optional(),
  unassigned: z.coerce.boolean().default(false),
  userId: z.string().cuid().optional(),
  hasRating: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().max(200).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

const bulkActionSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
  action: z.enum(['close', 'resolve', 'reopen', 'delete', 'assign', 'updatePriority', 'updateStatus']),
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  assignedTo: z.string().cuid().nullable().optional(),
  resolution: z.string().max(5000).optional(),
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

async function validateAdminSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `admin-support:${ip}`);

  if (!rateLimitResult.success) {
    return { error: apiResponse.rateLimited(60, requestId), session: null, rateLimitResult };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: apiResponse.unauthorized('Authentication required', requestId), session: null, rateLimitResult };
  }

  const isAdmin = Boolean(session.user.isAdmin || session.user.role === 'admin');

  if (!isAdmin) {
    return { error: apiResponse.forbidden('Admin access required', requestId), session: null, rateLimitResult };
  }

  return { error: null, session, rateLimitResult };
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

  try {
    const { error, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return new NextResponse(null, { status: 403 });
    }

    const [total, open, inProgress, waiting, unassigned, critical] = await Promise.all([
      prisma.supportTicket.count(),
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.supportTicket.count({ where: { status: 'WAITING' } }),
      prisma.supportTicket.count({ where: { assignedTo: null, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.supportTicket.count({ where: { priority: 'CRITICAL', status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    ]);

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Total-Count': String(total),
        'X-Open-Count': String(open),
        'X-In-Progress-Count': String(inProgress),
        'X-Waiting-Count': String(waiting),
        'X-Unassigned-Count': String(unassigned),
        'X-Critical-Count': String(critical),
      },
    });

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD admin tickets failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - List All Tickets (Admin)
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      category: searchParams.get('category') || undefined,
      assignedTo: searchParams.get('assignedTo') || undefined,
      unassigned: searchParams.get('unassigned') || 'false',
      userId: searchParams.get('userId') || undefined,
      hasRating: searchParams.get('hasRating') !== null ? searchParams.get('hasRating') : undefined,
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

    const {
      status,
      priority,
      category,
      assignedTo,
      unassigned,
      userId,
      hasRating,
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      dateFrom,
      dateTo,
    } = queryValidation.data;

    // Build where clause
    const where: Prisma.SupportTicketWhereInput = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (userId) where.userId = userId;

    if (unassigned) {
      where.assignedTo = null;
    } else if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    if (hasRating !== undefined) {
      where.satisfactionRating = hasRating ? { not: null } : null;
    }

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
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Execute query
    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
          _count: { select: { replies: true } },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    logger.info('Admin tickets fetched', {
      total,
      page,
      filters: { status, priority, category, assignedTo, unassigned },
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
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET admin tickets failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch tickets', requestId), requestId);
  }
}

// =============================================================================
// POST - Bulk Actions
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

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

    const validation = bulkActionSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { ids, action, status, priority, assignedTo, resolution } = validation.data;

    let updateData: Prisma.SupportTicketUpdateManyMutationInput = { updatedAt: new Date() };
    let affectedCount = 0;

    switch (action) {
      case 'close':
        updateData = { ...updateData, status: 'CLOSED', resolution: resolution || 'Closed by admin' };
        break;

      case 'resolve':
        if (!resolution) {
          return addHeaders(
            apiResponse.validationError('Resolution is required', undefined, requestId),
            requestId,
            rateLimitResult
          );
        }
        updateData = { ...updateData, status: 'RESOLVED', resolution, resolvedAt: new Date() };
        break;

      case 'reopen':
        updateData = { ...updateData, status: 'OPEN', resolvedAt: null };
        break;

      case 'assign':
        updateData = { ...updateData, assignedTo: assignedTo || null };
        if (assignedTo) updateData.status = 'IN_PROGRESS';
        break;

      case 'updatePriority':
        if (!priority) {
          return addHeaders(
            apiResponse.validationError('Priority is required', undefined, requestId),
            requestId,
            rateLimitResult
          );
        }
        updateData = { ...updateData, priority };
        break;

      case 'updateStatus':
        if (!status) {
          return addHeaders(
            apiResponse.validationError('Status is required', undefined, requestId),
            requestId,
            rateLimitResult
          );
        }
        updateData = { ...updateData, status };
        if (status === 'RESOLVED') updateData.resolvedAt = new Date();
        break;

      case 'delete':
        await prisma.$transaction([
          prisma.ticketReply.deleteMany({ where: { ticketId: { in: ids } } }),
          prisma.supportTicket.deleteMany({ where: { id: { in: ids } } }),
        ]);
        affectedCount = ids.length;

        await prisma.auditLog.create({
          data: {
            userId,
            action: 'DELETE' as AuditAction,
            category: 'support',
            description: `Bulk deleted ${ids.length} tickets`,
            changes: { ids } as Prisma.InputJsonValue,
            ipAddress: getClientIp(request),
            status: 'success',
          },
        });

        logger.info('Bulk delete completed', { count: ids.length, requestId, duration: Date.now() - startTime });

        return addHeaders(
          apiResponse.success({ message: `${ids.length} tickets deleted`, affected: ids.length, action }, { meta: { requestId } }),
          requestId,
          rateLimitResult
        );

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

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE' as AuditAction,
        category: 'support',
        description: `Bulk ${action} on ${ids.length} tickets`,
        changes: { action, ids, affected: affectedCount } as Prisma.InputJsonValue,
        ipAddress: getClientIp(request),
        status: 'success',
      },
    });

    logger.info('Bulk action completed', {
      action,
      requested: ids.length,
      affected: affectedCount,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      { message: `${action} completed on ${affectedCount} ticket(s)`, action, requested: ids.length, affected: affectedCount },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST admin bulk action failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to perform bulk action', requestId), requestId);
  }
}

// =============================================================================
// PUT, PATCH, DELETE - Reuse POST for bulk actions
// =============================================================================

export { POST as PUT, POST as PATCH };

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      // Try body for bulk delete
      try {
        const body = await request.json();
        return POST(new NextRequest(request.url, { method: 'POST', body: JSON.stringify({ ...body, action: 'delete' }) }));
      } catch {
        return addHeaders(
          apiResponse.validationError('Ticket ID is required', undefined, requestId),
          requestId,
          rateLimitResult
        );
      }
    }

    // Single delete
    const ticket = await prisma.supportTicket.findUnique({ where: { id } });

    if (!ticket) {
      return addHeaders(apiResponse.notFound('Ticket', requestId), requestId, rateLimitResult);
    }

    await prisma.$transaction([
      prisma.ticketReply.deleteMany({ where: { ticketId: id } }),
      prisma.supportTicket.delete({ where: { id } }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: 'DELETE' as AuditAction,
        category: 'support',
        entityType: 'supportTicket',
        entityId: id,
        description: `Deleted ticket ${ticket.ticketNumber}`,
        ipAddress: getClientIp(request),
        status: 'success',
      },
    });

    logger.info('Ticket deleted by admin', { ticketId: id, ticketNumber: ticket.ticketNumber, requestId });

    return addHeaders(
      apiResponse.success({ message: 'Ticket deleted', ticketNumber: ticket.ticketNumber }, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('DELETE admin ticket failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to delete ticket', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';