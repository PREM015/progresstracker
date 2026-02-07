import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { stripe } from '@/lib/stripe';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 5;
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return addHeaders(apiResponse.unauthorized('Unauthorized', requestId), requestId);
    }

    const { searchParams } = request.nextUrl;
    const invoiceId = searchParams.get('invoiceId');

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stripe:retry-payment:${session.user.id}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    // Find failed invoice
    const subscription = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
    if (!subscription?.stripeCustomerId) { return addHeaders(apiResponse.notFound('No customer found', requestId), requestId, rateLimitResult); }

    let invoice;
    if (invoiceId) {
      invoice = await stripe.invoices.retrieve(invoiceId);
      if (invoice.customer !== subscription.stripeCustomerId) {
        return addHeaders(apiResponse.forbidden('Access denied', requestId), requestId, rateLimitResult);
      }
    } else {
      // Try to find latest past_due subscription invoice
      const invoices = await stripe.invoices.list({ customer: subscription.stripeCustomerId, status: 'open', limit: 1 });
      invoice = invoices.data[0];
    }

    if (!invoice) {
      return addHeaders(apiResponse.notFound('No open invoice found', requestId), requestId, rateLimitResult);
    }

    // Pay invoice
    const paidInvoice = await stripe.invoices.pay(invoice.id);

    logger.info('POST stripe retry payment completed', { userId: session.user.id, invoiceId: invoice.id, requestId, duration: Date.now() - startTime });

    return addHeaders(apiResponse.success(paidInvoice, { meta: { requestId } }), requestId, rateLimitResult);

  } catch (error) {
    logger.error('POST stripe retry payment failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
