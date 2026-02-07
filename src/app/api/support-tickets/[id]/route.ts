import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 50;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

const updateSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  satisfactionRating: z.number().min(1).max(5).optional(),
  feedbackComment: z.string().optional(),
});

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(response: NextResponse, requestId: string, rateLimitResult?: any): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
  response.headers.set('X-Request-ID', requestId);
  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return addHeaders(apiResponse.unauthorized('Unauthorized', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `tickets:id:get:${session.user.id}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, name: true, image: true }
            }
          }
        }
      }
    });

    if (!ticket) {
      return addHeaders(apiResponse.notFound('Ticket not found', requestId), requestId, rateLimitResult);
    }

    // Auth check: Owner only (for now)
    if (ticket.userId !== session.user.id) {
      return addHeaders(apiResponse.forbidden('Access denied', requestId), requestId, rateLimitResult);
    }

    logger.info('GET support ticket detail completed', { id: params.id, requestId, duration: Date.now() - startTime });

    return addHeaders(apiResponse.success(ticket, { meta: { requestId } }), requestId, rateLimitResult);

  } catch (error) {
    logger.error('GET support ticket detail failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return addHeaders(apiResponse.unauthorized('Unauthorized', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `tickets:id:patch:${session.user.id}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(apiResponse.validationError('Invalid input', validation.error.errors, requestId), requestId, rateLimitResult);
    }

    // Verify ownership
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
      select: { userId: true, status: true }
    });

    if (!ticket) {
      return addHeaders(apiResponse.notFound('Ticket not found', requestId), requestId, rateLimitResult);
    }

    if (ticket.userId !== session.user.id) {
      return addHeaders(apiResponse.forbidden('Access denied', requestId), requestId, rateLimitResult);
    }

    // Users can mainly Close tickets or rate them. They probably shouldn't set exact status to In Progress etc.
    // For now allowing strict updates based on schema.

    // If closing, set resolvedAt
    const updates: any = { ...validation.data };
    if (validation.data.status === 'RESOLVED' || validation.data.status === 'CLOSED') {
      if (ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
        updates.resolvedAt = new Date();
      }
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id: params.id },
      data: updates
    });

    logger.info('PATCH support ticket detail completed', { id: params.id, requestId, duration: Date.now() - startTime });

    return addHeaders(apiResponse.success(updatedTicket, { meta: { requestId } }), requestId, rateLimitResult);

  } catch (error) {
    logger.error('PATCH support ticket detail failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}