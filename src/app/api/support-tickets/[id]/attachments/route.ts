// src/app/api/support-tickets/[id]/attachments/route.ts
// =============================================================================
// TICKET ATTACHMENTS API
// Methods: GET, POST, DELETE, OPTIONS, HEAD
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
import { supportConfig } from '@/config/support';

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
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION
// =============================================================================

const addAttachmentSchema = z.object({
  url: z.string().url('Invalid URL'),
  name: z.string().max(255).optional(),
  size: z.number().int().positive().optional(),
  mimeType: z.string().max(100).optional(),
});

const addAttachmentsSchema = z.object({
  attachments: z.array(addAttachmentSchema).min(1).max(5),
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

async function getTicketWithAccess(ticketId: string, userId: string, isAdmin: boolean) {
  const ticket = await prisma.supportTicket.findFirst({
    where: ticketId.startsWith('TKT-') ? { ticketNumber: ticketId } : { id: ticketId },
    select: {
      id: true,
      userId: true,
      ticketNumber: true,
      status: true,
      attachments: true,
    },
  });

  if (!ticket) return null;
  if (!isAdmin && ticket.userId !== userId) return null;

  return ticket;
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
    const ticket = await getTicketWithAccess(id, session.user.id, isAdmin);

    if (!ticket) {
      return new NextResponse(null, { status: 404 });
    }

    const attachments = ticket.attachments as string[] || [];

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Attachment-Count': String(attachments.length),
        'X-Max-Attachments': String(supportConfig.ticketSettings.maxAttachments),
        'X-Can-Add-More': String(attachments.length < supportConfig.ticketSettings.maxAttachments),
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD attachments failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - List Attachments
// =============================================================================

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `ticket-attachments:${ip}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId, rateLimitResult);
    }

    const { id } = await params;
    const isAdmin = Boolean(session.user.isAdmin || session.user.role === 'admin');
    const ticket = await getTicketWithAccess(id, session.user.id, isAdmin);

    if (!ticket) {
      return addHeaders(apiResponse.notFound('Ticket', requestId), requestId, rateLimitResult);
    }

    const attachments = ticket.attachments as string[] || [];

    const response = apiResponse.success(
      {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        attachments,
        count: attachments.length,
        maxAttachments: supportConfig.ticketSettings.maxAttachments,
        canAddMore: attachments.length < supportConfig.ticketSettings.maxAttachments,
        allowedFileTypes: supportConfig.ticketSettings.allowedFileTypes,
        maxFileSize: supportConfig.ticketSettings.maxAttachmentSize,
      },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET attachments failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to get attachments', requestId), requestId);
  }
}

// =============================================================================
// POST - Add Attachments
// =============================================================================

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `ticket-attachments:${ip}`);

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

    const ticket = await getTicketWithAccess(id, userId, isAdmin);

    if (!ticket) {
      return addHeaders(apiResponse.notFound('Ticket', requestId), requestId, rateLimitResult);
    }

    // Check if ticket is closed
    if (ticket.status === 'CLOSED' && !isAdmin) {
      return addHeaders(
        apiResponse.validationError('Cannot add attachments to closed tickets', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

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

    const validation = addAttachmentsSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { attachments: newAttachments } = validation.data;
    const currentAttachments = ticket.attachments as string[] || [];

    // Check max attachments limit
    const totalCount = currentAttachments.length + newAttachments.length;
    if (totalCount > supportConfig.ticketSettings.maxAttachments) {
      return addHeaders(
        apiResponse.validationError(
          `Cannot exceed ${supportConfig.ticketSettings.maxAttachments} attachments. Current: ${currentAttachments.length}`,
          undefined,
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    // Extract URLs and add to attachments
    const newUrls = newAttachments.map((a) => a.url);
    const updatedAttachments = [...currentAttachments, ...newUrls];

    // Update ticket
    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        attachments: updatedAttachments,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        ticketNumber: true,
        attachments: true,
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
        description: `Added ${newAttachments.length} attachment(s) to ticket ${ticket.ticketNumber}`,
        changes: { addedCount: newAttachments.length } as Prisma.InputJsonValue,
        ipAddress: ip,
        status: 'success',
      },
    });

    logger.info('Attachments added', {
      ticketId: ticket.id,
      addedCount: newAttachments.length,
      totalCount: updatedAttachments.length,
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        ...updatedTicket,
        message: `${newAttachments.length} attachment(s) added successfully`,
        count: updatedAttachments.length,
      },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST attachments failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to add attachments', requestId), requestId);
  }
}

// =============================================================================
// DELETE - Remove Attachment
// =============================================================================

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `ticket-attachments:${ip}`);

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

    const ticket = await getTicketWithAccess(id, userId, isAdmin);

    if (!ticket) {
      return addHeaders(apiResponse.notFound('Ticket', requestId), requestId, rateLimitResult);
    }

    // Get URL to remove from query params
    const { searchParams } = new URL(request.url);
    const urlToRemove = searchParams.get('url');
    const index = searchParams.get('index');

    if (!urlToRemove && index === null) {
      return addHeaders(
        apiResponse.validationError('Either url or index query parameter is required', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const currentAttachments = ticket.attachments as string[] || [];

    let updatedAttachments: string[];

    if (index !== null) {
      const idx = parseInt(index, 10);
      if (isNaN(idx) || idx < 0 || idx >= currentAttachments.length) {
        return addHeaders(
          apiResponse.validationError('Invalid index', undefined, requestId),
          requestId,
          rateLimitResult
        );
      }
      updatedAttachments = currentAttachments.filter((_, i) => i !== idx);
    } else {
      if (!currentAttachments.includes(urlToRemove!)) {
        return addHeaders(
          apiResponse.notFound('Attachment', requestId),
          requestId,
          rateLimitResult
        );
      }
      updatedAttachments = currentAttachments.filter((url) => url !== urlToRemove);
    }

    // Update ticket
    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        attachments: updatedAttachments,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        ticketNumber: true,
        attachments: true,
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
        description: `Removed attachment from ticket ${ticket.ticketNumber}`,
        ipAddress: ip,
        status: 'success',
      },
    });

    logger.info('Attachment removed', {
      ticketId: ticket.id,
      remainingCount: updatedAttachments.length,
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        ...updatedTicket,
        message: 'Attachment removed successfully',
        count: updatedAttachments.length,
      },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE attachment failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to remove attachment', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';