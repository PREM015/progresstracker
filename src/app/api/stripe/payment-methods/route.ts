import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { stripe } from '@/lib/stripe';
import { z } from 'zod';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 20;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

const setupIntentSchema = z.object({
  returnUrl: z.string().url().optional(),
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return addHeaders(apiResponse.unauthorized('Unauthorized', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stripe:payment-methods:get:${session.user.id}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id }
    });

    if (!subscription?.stripeCustomerId) {
      return addHeaders(apiResponse.success([], { meta: { requestId } }), requestId, rateLimitResult);
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: subscription.stripeCustomerId,
      type: 'card',
    });

    logger.info('GET stripe payment methods completed', { userId: session.user.id, count: paymentMethods.data.length, requestId, duration: Date.now() - startTime });

    return addHeaders(apiResponse.success(paymentMethods.data, { meta: { requestId } }), requestId, rateLimitResult);

  } catch (error) {
    logger.error('GET stripe payment methods failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Create SetupIntent for new payment method
    const session = await getServerSession(authOptions);
    if (!session) {
      return addHeaders(apiResponse.unauthorized('Unauthorized', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stripe:payment-methods:post:${session.user.id}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id }
    });

    if (!subscription?.stripeCustomerId) {
      return addHeaders(apiResponse.notFound('No billing account found', requestId), requestId, rateLimitResult);
    }

    const body = await request.json().catch(() => ({}));
    const validation = setupIntentSchema.safeParse(body);
    // returnUrl not strictly needed for creating intent, but maybe for confirming on frontend. 
    // We just return client_secret.

    const setupIntent = await stripe.setupIntents.create({
      customer: subscription.stripeCustomerId,
      payment_method_types: ['card'],
      metadata: {
        userId: session.user.id,
      },
    });

    logger.info('POST stripe setup intent created', { userId: session.user.id, setupIntentId: setupIntent.id, requestId, duration: Date.now() - startTime });

    return addHeaders(apiResponse.success({ clientSecret: setupIntent.client_secret }, { meta: { requestId } }), requestId, rateLimitResult);

  } catch (error) {
    logger.error('POST stripe setup intent failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
