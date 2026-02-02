// src/app/api/support-tickets/[id]/history/route.ts
// =============================================================================
// TICKET HISTORY/ACTIVITY LOG API
// Methods: GET, OPTIONS, HEAD
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// TYPES
// =============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface HistoryEvent {
  id: string;
  type: 'created' | 'status_changed' | 'priority_changed' | 'assigned' | 'unassigned' | 'reply_added' | 'resolved' | 'closed' | 'reopened' | 'rated' | 'attachment_added' | 'edited';
  description: string;
  actor: {
    id: string;
    name: string | null;
    image: string | null;
    isStaff: boolean;
  } | null;
  changes?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'private, max-age=30',
};

// =============================================================================
// VALIDATION
// =============================================================================

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  type: z.enum(['all', 'status', 'replies', 'assignments', 'changes']).default('all'),
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
// HEAD
// =============================================================================

export async function HEAD(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401 });
    }

    const { id } = await params;
    const isAdmin = Boolean(session.user.isAdmin || session.user.role === 'admin');

    const ticket = await prisma.supportTicket.findFirst({
      where: id.startsWith('TKT-') ? { ticketNumber: id } : { id },
      select: { id: true, userId: true },
    });

    if (!ticket || (!isAdmin && ticket.userId !== session.user.id)) {
      return new NextResponse(null, { status: 404 });
    }

    // Count history events
    const [auditCount, replyCount] = await Promise.all([
      prisma.auditLog.count({
        where: { entityId: ticket.id, entityType: 'supportTicket' },
      }),
      prisma.ticketReply.count({
        where: { ticketId: ticket.id },
      }),
    ]);

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Total-Events': String(auditCount + replyCount),
        'X-Audit-Events': String(auditCount),
        'X-Reply-Events': String(replyCount),
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD history failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Ticket History
// =============================================================================

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `ticket-history:${ip}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId, rateLimitResult);
    }

    const { id } = await params;
    const userId = session.user.id;
    const isAdmin = Boolean(session.user.isAdmin || session.user.role === 'admin');

    // Get ticket
    const ticket = await prisma.supportTicket.findFirst({
      where: id.startsWith('TKT-') ? { ticketNumber: id } : { id },
      select: {
        id: true,
        userId: true,
        ticketNumber: true,
        subject: true,
        createdAt: true,
      },
    });

    if (!ticket) {
      return addHeaders(apiResponse.notFound('Ticket', requestId), requestId, rateLimitResult);
    }

    // Check access
    if (!isAdmin && ticket.userId !== userId) {
      return addHeaders(apiResponse.forbidden('Access denied', requestId), requestId, rateLimitResult);
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 50,
      type: searchParams.get('type') || 'all',
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { page, limit, type } = queryValidation.data;

    // Build history from multiple sources
    const history: HistoryEvent[] = [];

    // 1. Ticket creation event
    history.push({
      id: `created-${ticket.id}`,
      type: 'created',
      description: 'Ticket created',
      actor: null, // Will be populated below
      createdAt: ticket.createdAt,
    });

    // 2. Audit logs
    if (type === 'all' || type === 'status' || type === 'changes' || type === 'assignments') {
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          entityId: ticket.id,
          entityType: 'supportTicket',
        },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, image: true, isAdmin: true },
          },
        },
      });

      for (const log of auditLogs) {
        let eventType: HistoryEvent['type'] = 'edited';
        
        const changes = log.changes as Record<string, unknown> | null;
        const description = log.description || '';
        
        if (description.includes('status')) eventType = 'status_changed';
        else if (description.includes('priority')) eventType = 'priority_changed';
        else if (description.includes('Assigned')) eventType = 'assigned';
        else if (description.includes('Unassigned')) eventType = 'unassigned';
        else if (description.includes('Resolved')) eventType = 'resolved';
        else if (description.includes('Closed')) eventType = 'closed';
        else if (description.includes('Reopened')) eventType = 'reopened';
        else if (description.includes('Rated')) eventType = 'rated';

        // Filter by type
        if (type === 'status' && !['status_changed', 'resolved', 'closed', 'reopened'].includes(eventType)) continue;
        if (type === 'assignments' && !['assigned', 'unassigned'].includes(eventType)) continue;

        history.push({
          id: log.id,
          type: eventType,
          description: log.description || 'Ticket updated',
          actor: log.user
            ? {
                id: log.user.id,
                name: log.user.name,
                image: log.user.image,
                isStaff: log.user.isAdmin,
              }
            : null,
          changes: changes
            ? Object.entries(changes).map(([field, value]) => ({
                field,
                oldValue: null,
                newValue: value,
              }))
            : undefined,
          metadata: {
            ipAddress: log.ipAddress,
            action: log.action,
          },
          createdAt: log.createdAt,
        });
      }
    }

    // 3. Replies
    if (type === 'all' || type === 'replies') {
      const replies = await prisma.ticketReply.findMany({
        where: {
          ticketId: ticket.id,
          // Non-admins can't see internal notes
          ...(isAdmin ? {} : { isInternal: false }),
        },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, image: true, isAdmin: true },
          },
        },
      });

      for (const reply of replies) {
        history.push({
          id: reply.id,
          type: 'reply_added',
          description: reply.isAutoReply
            ? 'Auto-reply sent'
            : reply.isInternal
            ? 'Internal note added'
            : reply.isStaffReply
            ? 'Staff replied'
            : 'Customer replied',
          actor: reply.user
            ? {
                id: reply.user.id,
                name: reply.user.name,
                image: reply.user.image,
                isStaff: reply.user.isAdmin || reply.isStaffReply,
              }
            : null,
          metadata: {
            messagePreview: reply.message.substring(0, 100) + (reply.message.length > 100 ? '...' : ''),
            isInternal: reply.isInternal,
            isAutoReply: reply.isAutoReply,
            hasAttachments: reply.attachments.length > 0,
          },
          createdAt: reply.createdAt,
        });
      }
    }

    // Sort by date descending
    history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginate
    const total = history.length;
    const paginatedHistory = history.slice((page - 1) * limit, page * limit);
    const totalPages = Math.ceil(total / limit);

    logger.info('History fetched', {
      ticketId: ticket.id,
      userId,
      eventCount: paginatedHistory.length,
      total,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        history: paginatedHistory,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET history failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch history', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';