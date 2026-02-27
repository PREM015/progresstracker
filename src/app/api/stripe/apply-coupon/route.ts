import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { stripe } from '@/lib/stripe';
import { z } from 'zod';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 5;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

const applyCouponSchema = z.object({
  couponId: z.string().min(1), // can be promotion code ID or coupon ID
  type: z.enum(['coupon', 'promotion_code']).optional().default('promotion_code'),
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
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stripe:apply-coupon:${session.user.id}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const body = await request.json();
    const validation = applyCouponSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(apiResponse.validationError('Invalid input', validation.error.errors, requestId), requestId, rateLimitResult);
    }

    const { couponId, type } = validation.data;

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id }
    });

    if (!subscription?.stripeSubscriptionId || !subscription.stripeCustomerId) {
      return addHeaders(apiResponse.notFound('No active subscription found', requestId), requestId, rateLimitResult);
    }

    // Update subscription with coupon
    // If it's a promotion code, we use promotion_code parameter
    // If it's a raw coupon, we use coupon parameter

    // BUT subscription update expects 'coupon' or 'promotion_code'
    // Let's rely on what frontend verified.

    const updateParams: any = {};
    if (type === 'promotion_code') {
      updateParams.promotion_code = couponId;
    } else {
      updateParams.coupon = couponId;
    }

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, updateParams);

    logger.info('POST stripe apply coupon completed', { userId: session.user.id, couponId, requestId, duration: Date.now() - startTime });

    return addHeaders(apiResponse.success({ success: true }, { meta: { requestId } }), requestId, rateLimitResult);

  } catch (error) {
    logger.error('POST stripe apply coupon failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
