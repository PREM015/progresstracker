import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 20;
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
};

const replySchema = z.object({
    message: z.string().min(1, 'Message cannot be empty'),
    // attachments: z.array(z.string()).optional()
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

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return addHeaders(apiResponse.unauthorized('Unauthorized', requestId), requestId);
        }

        const ip = getClientIp(request);
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `tickets:id:reply:${session.user.id}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        const body = await request.json();
        const validation = replySchema.safeParse(body);

        if (!validation.success) {
            return addHeaders(apiResponse.validationError('Invalid input', validation.error.errors, requestId), requestId, rateLimitResult);
        }

        // Verify ticket exists and user owns it
        const ticket = await prisma.supportTicket.findUnique({
            where: { id: params.id },
            select: { userId: true, status: true }
        });

        if (!ticket) {
            return addHeaders(apiResponse.notFound('Ticket not found', requestId), requestId, rateLimitResult);
        }

        if (ticket.userId !== session.user.id) {
            return addHeaders(apiResponse.forbidden('Access denied', requestId), requestId, rateLimitResult);
        }

        // Create reply
        const reply = await prisma.ticketReply.create({
            data: {
                ticketId: params.id,
                userId: session.user.id,
                message: validation.data.message,
                isStaffReply: false,
            }
        });

        // Update ticket updated time and maybe status to OPEN if it was closed?
        // Usually replying re-opens it.
        await prisma.supportTicket.update({
            where: { id: params.id },
            data: {
                updatedAt: new Date(),
                status: ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? 'OPEN' : undefined // Re-open
            }
        });

        logger.info('POST support ticket reply completed', { ticketId: params.id, replyId: reply.id, requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.created(reply, { meta: { requestId } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('POST support ticket reply failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
