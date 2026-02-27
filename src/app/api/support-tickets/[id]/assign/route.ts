// src/app/api/support-tickets/[id]/assign/route.ts
// =============================================================================
// TICKET ASSIGNMENT API (Admin Only)
// Methods: GET, POST, DELETE, OPTIONS
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

const RATE_LIMIT = 30;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION
// =============================================================================

const assignTicketSchema = z.object({
  assignedTo: z.string().cuid('Invalid user ID'),
  note: z.string().max(500).optional(),
  autoChangeStatus: z.boolean().default(true),
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
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `ticket-assign:${ip}`);

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
// GET - Get Current Assignment
// =============================================================================

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const { id } = await params;

    const ticket = await prisma.supportTicket.findFirst({
      where: id.startsWith('TKT-') ? { ticketNumber: id } : { id },
      select: {
        id: true,
        ticketNumber: true,
        assignedTo: true,
      },
    });

    if (!ticket) {
      return addHeaders(apiResponse.notFound('Ticket', requestId), requestId, rateLimitResult);
    }

    // Get assigned user details if assigned
    let assignedUser = null;
    if (ticket.assignedTo) {
      assignedUser = await prisma.user.findUnique({
        where: { id: ticket.assignedTo },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          isAdmin: true,
        },
      });
    }

    // Get available staff for assignment
    const availableStaff = await prisma.user.findMany({
      where: {
        OR: [{ isAdmin: true }, { role: 'admin' }],
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
      orderBy: { name: 'asc' },
    });

    const response = apiResponse.success(
      {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        assignedTo: ticket.assignedTo,
        assignedUser,
        availableStaff,
      },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET assign failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to get assignment', requestId), requestId);
  }
}

// =============================================================================
// POST - Assign Ticket
// =============================================================================

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

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

    const validation = assignTicketSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { assignedTo, note, autoChangeStatus } = validation.data;

    // Get ticket
    const ticket = await prisma.supportTicket.findFirst({
      where: id.startsWith('TKT-') ? { ticketNumber: id } : { id },
    });

    if (!ticket) {
      return addHeaders(apiResponse.notFound('Ticket', requestId), requestId, rateLimitResult);
    }

    // Verify assignee exists and is staff
    const assignee = await prisma.user.findFirst({
      where: {
        id: assignedTo,
        OR: [{ isAdmin: true }, { role: 'admin' }],
        isActive: true,
      },
      select: { id: true, name: true, email: true },
    });

    if (!assignee) {
      return addHeaders(
        apiResponse.validationError('Invalid assignee - must be an active staff member', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Update ticket
    const updateData: Prisma.SupportTicketUpdateInput = {
      assignedTo,
      updatedAt: new Date(),
    };

    if (autoChangeStatus && ticket.status === 'OPEN') {
      updateData.status = 'IN_PROGRESS';
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { replies: true } },
      },
    });

    // Add internal note about assignment
    await prisma.ticketReply.create({
      data: {
        ticketId: ticket.id,
        userId,
        message: `**Ticket Assigned**\n\nAssigned to: ${assignee.name || assignee.email}${note ? `\n\nNote: ${note}` : ''}`,
        isStaffReply: true,
        isInternal: true,
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
        description: `Assigned ticket ${ticket.ticketNumber} to ${assignee.name || assignee.email}`,
        changes: { assignedTo, previousAssignee: ticket.assignedTo } as Prisma.InputJsonValue,
        ipAddress: getClientIp(request),
        status: 'success',
      },
    });

    logger.info('Ticket assigned', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      assignedTo,
      assignedBy: userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        ...updatedTicket,
        assignedUser: assignee,
        message: `Ticket assigned to ${assignee.name || assignee.email}`,
      },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST assign failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to assign ticket', requestId), requestId);
  }
}

// =============================================================================
// DELETE - Unassign Ticket
// =============================================================================

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const { id } = await params;
    const userId = session!.user.id;

    // Get ticket
    const ticket = await prisma.supportTicket.findFirst({
      where: id.startsWith('TKT-') ? { ticketNumber: id } : { id },
    });

    if (!ticket) {
      return addHeaders(apiResponse.notFound('Ticket', requestId), requestId, rateLimitResult);
    }

    if (!ticket.assignedTo) {
      return addHeaders(
        apiResponse.validationError('Ticket is not assigned to anyone', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const previousAssignee = ticket.assignedTo;

    // Unassign ticket
    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        assignedTo: null,
        updatedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { replies: true } },
      },
    });

    // Add internal note
    await prisma.ticketReply.create({
      data: {
        ticketId: ticket.id,
        userId,
        message: '**Ticket Unassigned**',
        isStaffReply: true,
        isInternal: true,
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
        description: `Unassigned ticket ${ticket.ticketNumber}`,
        changes: { previousAssignee } as Prisma.InputJsonValue,
        ipAddress: getClientIp(request),
        status: 'success',
      },
    });

    logger.info('Ticket unassigned', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      unassignedBy: userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        ...updatedTicket,
        message: 'Ticket unassigned successfully',
      },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE assign failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to unassign ticket', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';