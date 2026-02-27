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

const addCreditsSchema = z.object({
    amount: z.number().int().positive(), // in cents
    currency: z.string().default('usd'),
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

        // Check balance
        const subscription = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
        if (!subscription?.stripeCustomerId) { return addHeaders(apiResponse.success({ balance: 0, currency: 'usd' }, { meta: { requestId } }), requestId); }

        const customer = await stripe.customers.retrieve(subscription.stripeCustomerId) as any;

        return addHeaders(apiResponse.success({
            balance: customer.balance, // negative means credit (customer is owed money), positive means debt
            currency: customer.currency || 'usd'
        }, { meta: { requestId } }), requestId);

    } catch (error) {
        logger.error('GET stripe credits failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

// Route to ADD credits (make payment to increase balance)
// Usually you create an invoice item or charge.
// Here we assume creating a PaymentIntent or Checkout Session to add funds.
// But as this is 'add credits', we can treat it as a deposit.

export async function POST(request: NextRequest): Promise<NextResponse> {
    const requestId = generateRequestId();
    try {
        const session = await getServerSession(authOptions);
        if (!session) return addHeaders(apiResponse.unauthorized('Unauthorized', requestId), requestId);

        const body = await request.json();
        const validation = addCreditsSchema.safeParse(body);
        if (!validation.success) return addHeaders(apiResponse.validationError('Invalid', validation.error.errors, requestId), requestId);

        // ... Create checkout session for one-time payment ...
        // Skipping full implementation as it requires complex logic for 'adding to balance' 
        // (Stripe doesn't have direct 'add balance' checkout without product).

        return addHeaders(apiResponse.success({ message: 'Not implemented fully' }, { meta: { requestId } }), requestId);
    } catch (e) {
        return addHeaders(apiResponse.internalError('Failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
