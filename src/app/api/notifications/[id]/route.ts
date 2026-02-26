/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
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
  isRead: z.boolean().optional(),
  isArchived: z.boolean().optional(),
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
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const { id } = await params;
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return addHeaders(apiResponse.unauthorized('Unauthorized', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `notifications:id:get:${session.user.id}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      return addHeaders(apiResponse.notFound('Notification not found', requestId), requestId, rateLimitResult);
    }

    // Authorization check: User must own the notification
    if (notification.userId !== session.user.id) {
      return addHeaders(apiResponse.forbidden('Access denied', requestId), requestId, rateLimitResult);
    }

    logger.info('GET notification detail completed', { id, requestId, duration: Date.now() - startTime });

    return addHeaders(apiResponse.success(notification, { meta: { requestId } }), requestId, rateLimitResult);

  } catch (error) {
    logger.error('GET notification detail failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const { id } = await params;
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return addHeaders(apiResponse.unauthorized('Unauthorized', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `notifications:id:patch:${session.user.id}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(apiResponse.validationError('Invalid input', validation.error.errors, requestId), requestId, rateLimitResult);
    }

    // Using updateMany is safer for auth check: ensure id AND userId match
    const result = await prisma.notification.updateMany({
      where: {
        id,
        userId: session.user.id,
      },
      data: {
        ...validation.data,
        // If marking as read, set readAt
        ...(validation.data.isRead === true ? { readAt: new Date() } : {}),
        // If archiving, set archivedAt
        ...(validation.data.isArchived === true ? { archivedAt: new Date() } : {}),
      }
    });

    if (result.count === 0) {
      // Either not found or not owned
      return addHeaders(apiResponse.notFound('Notification not found or access denied', requestId), requestId, rateLimitResult);
    }

    // Fetch updated to return
    const updated = await prisma.notification.findUnique({ where: { id } });

    logger.info('PATCH notification detail completed', { id, requestId, duration: Date.now() - startTime });

    return addHeaders(apiResponse.success(updated, { meta: { requestId } }), requestId, rateLimitResult);

  } catch (error) {
    logger.error('PATCH notification detail failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const { id } = await params;
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return addHeaders(apiResponse.unauthorized('Unauthorized', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `notifications:id:delete:${session.user.id}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    // Soft delete (archive)
    const result = await prisma.notification.updateMany({
      where: {
        id,
        userId: session.user.id,
        isArchived: false,
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      }
    });

    if (result.count === 0) {
      return addHeaders(apiResponse.notFound('Notification not found or already archived', requestId), requestId, rateLimitResult);
    }

    logger.info('DELETE notification (archive) completed', { id, requestId, duration: Date.now() - startTime });

    return addHeaders(apiResponse.success({ message: 'Notification archived' }, { meta: { requestId } }), requestId, rateLimitResult);

  } catch (error) {
    logger.error('DELETE notification (archive) failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
