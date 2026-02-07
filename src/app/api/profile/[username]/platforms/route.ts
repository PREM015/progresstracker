import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 50;
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

export async function GET(
    request: NextRequest,
    { params }: { params: { username: string } }
): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const session = await getServerSession(authOptions);
        const ip = getClientIp(request);
        const rateLimitResult = await checkLimit(apiRateLimiter, session ? 100 : 50, `profile:platforms:${ip}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        const username = params.username.replace(/^@/, '');

        const user = await prisma.user.findUnique({
            where: { username },
            select: {
                id: true,
                isPublic: true,
                showPlatforms: true,
            }
        });

        if (!user) {
            return addHeaders(apiResponse.notFound('User not found', requestId), requestId, rateLimitResult);
        }

        const isSelf = session?.user?.id === user.id;
        if (!isSelf && (!user.isPublic || !user.showPlatforms)) {
            return addHeaders(apiResponse.forbidden('Platforms are private', requestId), requestId, rateLimitResult);
        }

        const userPlatforms = await prisma.userPlatform.findMany({
            where: {
                userId: user.id,
                isActive: true
            },
            include: {
                platform: { select: { name: true, slug: true, icon: true, category: true } }
            }
        });

        const data = userPlatforms.map(up => ({
            id: up.id,
            platformName: up.platform.name,
            platformSlug: up.platform.slug,
            platformIcon: up.platform.icon,
            category: up.platform.category,
            username: up.username,
            profileUrl: up.profileUrl,
            // Only show sensitive sync stats if self?
            // Maybe stats are fine if profile is public.
        }));

        logger.info('GET profile platforms completed', { username, count: userPlatforms.length, requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.success(data, { meta: { requestId } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('GET profile platforms failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
