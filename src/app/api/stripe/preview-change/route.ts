import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { stripe, getPlanByPriceId } from '@/lib/stripe';
import { z } from 'zod';
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return addHeaders(apiResponse.unauthorized('Unauthorized', requestId), requestId);
    }

    const { searchParams } = request.nextUrl;
    const priceId = searchParams.get('priceId');

    if (!priceId) {
      return addHeaders(apiResponse.validationError('Missing priceId', [], requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stripe:preview-change:${session.user.id}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id }
    });

    if (!subscription?.stripeSubscriptionId || !subscription.stripeCustomerId) {
      return addHeaders(apiResponse.notFound('No active subscription found', requestId), requestId, rateLimitResult);
    }

    const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
    const itemId = stripeSub.items.data[0].id;

    // Retrieve upcoming invoice with the hypothetical change
    const upcomingInvoice = await (stripe.invoices as any).retrieveUpcoming({
      customer: subscription.stripeCustomerId,
      subscription: subscription.stripeSubscriptionId,
      subscription_items: [{
        id: itemId,
        price: priceId,
      }],
      subscription_proration_behavior: 'always_invoice',
    });

    const preview = {
      amountDue: upcomingInvoice.amount_due,
      subtotal: upcomingInvoice.subtotal,
      tax: upcomingInvoice.tax,
      total: upcomingInvoice.total,
      currency: upcomingInvoice.currency,
      periodStart: new Date(upcomingInvoice.period_start * 1000),
      periodEnd: new Date(upcomingInvoice.period_end * 1000),
      lines: upcomingInvoice.lines.data.map((line: any) => ({
        description: line.description,
        amount: line.amount,
        period: {
          start: new Date(line.period.start * 1000),
          end: new Date(line.period.end * 1000),
        },
        proration: line.proration,
      }))
    };

    logger.info('GET stripe preview change completed', { userId: session.user.id, priceId, requestId, duration: Date.now() - startTime });

    return addHeaders(apiResponse.success(preview, { meta: { requestId } }), requestId, rateLimitResult);

  } catch (error) {
    logger.error('GET stripe preview change failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
