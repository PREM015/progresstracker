import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 20;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return addHeaders(apiResponse.unauthorized('Unauthorized', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `notifications:push:unsubscribe:${session.user.id}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const body = await request.json();
    const validation = unsubscribeSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(apiResponse.validationError('Invalid input', validation.error.errors, requestId), requestId, rateLimitResult);
    }

    const { endpoint } = validation.data;

    // Delete or Deactivate?
    // Deleting to keep table clean if endpoint is redundant.
    await prisma.pushSubscription.delete({
      where: { endpoint },
    }).catch(e => {
      // Ignore if not found
      logger.warn('Push subscription unsubscribe - not found', { endpoint, requestId });
    });

    logger.info('POST push unsubscribe completed', { userId: session.user.id, requestId, duration: Date.now() - startTime });

    return addHeaders(apiResponse.success({ message: 'Unsubscribed' }, { meta: { requestId } }), requestId, rateLimitResult);

  } catch (error) {
    logger.error('POST push unsubscribe failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
