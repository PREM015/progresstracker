import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod'; // Keep usage for validation
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

// Refund is usually an admin action or automatic. 
// User requesting refund via API is rare (usually via support ticket).
// But we implement it as 'request refund' => creates a support ticket.

const RATE_LIMIT = 5;
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
};

const refundSchema = z.object({
    invoiceId: z.string().optional(),
    reason: z.string().min(10),
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
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stripe:refund:${session.user.id}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        const body = await request.json();
        const validation = refundSchema.safeParse(body);

        if (!validation.success) {
            return addHeaders(apiResponse.validationError('Invalid input', validation.error.errors, requestId), requestId, rateLimitResult);
        }

        const { reason, invoiceId } = validation.data;

        // Create Support Ticket
        const ticketNumber = `REF-${Date.now().toString().slice(-6)}`;

        // We import support ticket creation logic or duplicate it (duplicating for safety/isolation)
        // Actually we can just create record.

        const ticket = await prisma.supportTicket.create({
            data: {
                userId: session.user.id,
                ticketNumber,
                subject: `Refund Request${invoiceId ? ` for Invoice ${invoiceId}` : ''}`,
                description: `Reason: ${reason}\n\nInvoice ID: ${invoiceId || 'N/A'}`,
                category: 'BILLING',
                priority: 'HIGH',
                status: 'OPEN',
            }
        });

        logger.info('POST stripe refund request completed', { userId: session.user.id, ticketId: ticket.id, requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.created({ success: true, ticketId: ticket.id, message: 'Refund request submitted as support ticket' }, { meta: { requestId } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('POST stripe refund request failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
