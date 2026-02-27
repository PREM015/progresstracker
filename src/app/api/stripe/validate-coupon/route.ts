import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { stripe } from '@/lib/stripe';
import { z } from 'zod';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 30;
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
};

const validateCouponSchema = z.object({
    code: z.string().min(1),
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
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stripe:validate-coupon:${session.user.id}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        const body = await request.json();
        const validation = validateCouponSchema.safeParse(body);

        if (!validation.success) {
            return addHeaders(apiResponse.validationError('Invalid input', validation.error.errors, requestId), requestId, rateLimitResult);
        }

        const { code } = validation.data;

        try {
            // Retrieve promo code implies looking up by code
            // Stripe has list promo_codes
            const promoCodes = await stripe.promotionCodes.list({
                code,
                active: true,
                limit: 1,
            });

            const promoCode = promoCodes.data[0];

            if (!promoCode) {
                // Try coupon directly
                const coupon = await stripe.coupons.retrieve(code).catch(() => null);
                if (coupon && coupon.valid) {
                    return addHeaders(apiResponse.success({
                        valid: true,
                        type: 'coupon',
                        id: coupon.id,
                        name: coupon.name,
                        percentOff: coupon.percent_off,
                        amountOff: coupon.amount_off,
                        currency: coupon.currency,
                    }, { meta: { requestId } }), requestId, rateLimitResult);
                }
                return addHeaders(apiResponse.validationError('Invalid or expired coupon', [], requestId), requestId, rateLimitResult);
            }

            const coupon = (promoCode as any).coupon;

            return addHeaders(apiResponse.success({
                valid: true,
                type: 'promotion_code',
                id: promoCode.id,
                code: promoCode.code,
                couponId: coupon.id,
                name: coupon.name,
                percentOff: coupon.percent_off,
                amountOff: coupon.amount_off,
                currency: coupon.currency,
            }, { meta: { requestId } }), requestId, rateLimitResult);

        } catch (e) {
            return addHeaders(apiResponse.validationError('Invalid coupon', [], requestId), requestId, rateLimitResult);
        }

    } catch (error) {
        logger.error('POST stripe validate coupon failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
