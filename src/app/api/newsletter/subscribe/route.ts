import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 10; // Stricter limit for subscription endpoints to prevent spam
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

const subscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
  topics: z.array(z.string()).optional().default([]),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional().default('weekly'),
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
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `newsletter:subscribe:${ip}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const body = await request.json();
    const validation = subscribeSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(apiResponse.validationError('Invalid input', validation.error.errors, requestId), requestId, rateLimitResult);
    }

    const { email, topics, frequency } = validation.data;

    // Check if subscriber exists
    const existingSubscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existingSubscriber) {
      if (existingSubscriber.isActive) {
        // Idempotent success - already subscribed
        return addHeaders(apiResponse.success({ message: 'Already subscribed', subscriber: existingSubscriber }, { meta: { requestId } }), requestId, rateLimitResult);
      } else {
        // Reactivate
        const updatedSubscriber = await prisma.newsletterSubscriber.update({
          where: { id: existingSubscriber.id },
          data: {
            isActive: true,
            topics: topics.length > 0 ? topics : existingSubscriber.topics, // Update topics if provided
            frequency: frequency || existingSubscriber.frequency,
            unsubscribedAt: null,
            unsubscribeReason: null,
          }
        });

        logger.info('Newsletter subscriber reactivated', { email, requestId });
        return addHeaders(apiResponse.success({ message: 'Subscription reactivated', subscriber: updatedSubscriber }, { meta: { requestId } }), requestId, rateLimitResult);
      }
    }

    // Create new subscriber
    const newSubscriber = await prisma.newsletterSubscriber.create({
      data: {
        email,
        topics,
        frequency,
        isActive: true,
        // unsubscribeToken is handled by default(cuid()) in schema but let's be explicit if we wanted customized logic
        // confirmedAt: null // Pending confirmation flow if implemented
      }
    });

    // TODO: Send confirmation email
    // await emailService.sendConfirmation(newSubscriber.email, newSubscriber.unsubscribeToken);

    logger.info('New newsletter subscriber created', { email, requestId, duration: Date.now() - startTime });

    return addHeaders(apiResponse.created(newSubscriber, { requestId }), requestId, rateLimitResult);

  } catch (error) {
    logger.error('Newsletter subscribe failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}