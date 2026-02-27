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
    { params }: { params: Promise<{ username: string }> }
): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const session = await getServerSession(authOptions);
        const ip = getClientIp(request);
        const rateLimitResult = await checkLimit(apiRateLimiter, session ? 100 : 50, `profile:achievements:${ip}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        const { username: rawUsername } = await params;
        const username = rawUsername.replace(/^@/, '');

        // Check user existence and visibility first
        const user = await prisma.user.findUnique({
            where: { username },
            select: {
                id: true,
                isPublic: true,
                showAchievements: true,
            }
        });

        if (!user) {
            return addHeaders(apiResponse.notFound('User not found', requestId), requestId, rateLimitResult);
        }

        const isSelf = session?.user?.id === user.id;
        if (!isSelf && (!user.isPublic || !user.showAchievements)) {
            // If profile is private OR achievements are hidden
            return addHeaders(apiResponse.forbidden('Achievements are private', requestId), requestId, rateLimitResult);
        }

        // Fetch achievements
        const achievements = await prisma.userAchievement.findMany({
            where: { userId: user.id },
            include: {
                achievement: {
                    select: {
                        title: true,
                        description: true,
                        icon: true,
                        badgeImage: true,
                        points: true,
                        rarity: true,
                        tier: true,
                    }
                }
            },
            orderBy: { unlockedAt: 'desc' }
        });

        logger.info('GET profile achievements completed', { username, count: achievements.length, requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.success(achievements, { meta: { requestId } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('GET profile achievements failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
