import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { stripe } from '@/lib/stripe';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 10;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const session = await getServerSession(authOptions);
    if (!session) return addHeaders(apiResponse.unauthorized('Unauthorized', requestId), requestId);

    // Update payment method (e.g., billing details)
    // Usually handled by Stripe Elements on frontend, but backend can do it too.
    // For now, simpler to just allow DELETE (detach).

    return addHeaders(apiResponse.success({ message: 'Update via frontend recommended' }, { meta: { requestId } }), requestId);
  } catch (e) {
    return addHeaders(apiResponse.internalError('Failed', requestId), requestId);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return addHeaders(apiResponse.unauthorized('Unauthorized', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stripe:payment-methods:delete:${session.user.id}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id }
    });

    if (!subscription?.stripeCustomerId) {
      return addHeaders(apiResponse.notFound('No customer found', requestId), requestId, rateLimitResult);
    }

    // Detach from customer
    const paymentMethod = await stripe.paymentMethods.detach(params.id);

    logger.info('DELETE stripe payment method completed', { userId: session.user.id, paymentMethodId: params.id, requestId, duration: Date.now() - startTime });

    return addHeaders(apiResponse.success(paymentMethod, { meta: { requestId } }), requestId, rateLimitResult);

  } catch (error) {
    logger.error('DELETE stripe payment method failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
