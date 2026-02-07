import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 10;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

const unsubscribeSchema = z.object({
  email: z.string().email().optional(),
  token: z.string().optional(),
  reason: z.string().optional(),
}).refine(data => data.email || data.token, {
  message: "Either email or token must be provided",
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
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `newsletter:unsubscribe:${ip}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const body = await request.json();
    const validation = unsubscribeSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(apiResponse.validationError('Invalid input', validation.error.errors, requestId), requestId, rateLimitResult);
    }

    const { email, token, reason } = validation.data;

    const where: any = {};
    if (token) where.unsubscribeToken = token;
    else if (email) where.email = email;

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where,
    });

    if (!subscriber) {
      // Return success even if not found to prevent email enumeration?
      // Or 404? 
      // Standard practice: "If you were subscribed, you have been unsubscribed."
      // But for API clarity let's say "Subscriber not found" or just success.
      // Let's return success for security.
      logger.info('Newsletter unsubscribe for unknown user', { email, token, requestId });
      return addHeaders(apiResponse.success({ message: 'Unsubscribe processed' }, { meta: { requestId } }), requestId, rateLimitResult);
    }

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        isActive: false,
        unsubscribedAt: new Date(),
        unsubscribeReason: reason,
      }
    });

    logger.info('Newsletter subscriber unsubscribed', { id: subscriber.id, requestId, duration: Date.now() - startTime });

    return addHeaders(apiResponse.success({ message: 'Unsubscribe successful' }, { meta: { requestId } }), requestId, rateLimitResult);

  } catch (error) {
    logger.error('Newsletter unsubscribe failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}