import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT_GET = 50;
const RATE_LIMIT_MUTATION = 10;
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
};

const updateBlogPostSchema = z.object({
    title: z.string().min(5).optional(),
    content: z.string().min(20).optional(),
    excerpt: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    featuredImage: z.string().url().optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    publishedAt: z.string().datetime().optional().nullable(),
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const post = await prisma.blogPost.findUnique({
            where: { slug: (await params).slug }
        });

        if (!post) {
            return addHeaders(apiResponse.notFound('Post not found', requestId), requestId);
        }

        // Check visibility
        // If not published, check if admin (or author?)
        if (post.status !== 'published') {
            const session = await getServerSession(authOptions);
            if (!session || session.user.role !== 'admin') { // Simplified check
                return addHeaders(apiResponse.notFound('Post not found', requestId), requestId);
            }
        }

        // Increment view count (async, fire and forget or use separate mutation if critical)
        // We'll do it purely via API specific route usually, but here is fine.
        // Avoid await to not block? But safer to await but catch error.
        try {
            await prisma.blogPost.update({
                where: { id: post.id },
                data: { viewCount: { increment: 1 } }
            });
        } catch (e) {
            logger.warn('Failed to increment view count', { postId: post.id });
        }

        logger.info('GET blog post detail completed', { slug: (await params).slug, requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.success(post, { meta: { requestId } }), requestId);

    } catch (error) {
        logger.error('GET blog post detail failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return addHeaders(apiResponse.forbidden('Access denied', requestId), requestId);
        }

        const ip = getClientIp(request);
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT_MUTATION, `blog:post:put:${session.user.id}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        const body = await request.json();
        const validation = updateBlogPostSchema.safeParse(body);

        if (!validation.success) {
            return addHeaders(apiResponse.validationError('Invalid input', validation.error.errors, requestId), requestId, rateLimitResult);
        }

        const { title, content, excerpt, category, tags, featuredImage, status, publishedAt } = validation.data;

        const post = await prisma.blogPost.update({
            where: { slug: (await params).slug },
            data: {
                title,
                content,
                excerpt,
                category,
                tags,
                featuredImage,
                status,
                publishedAt: publishedAt ? new Date(publishedAt) : (status === 'published' ? new Date() : undefined),
            }
        });

        logger.info('PUT blog post completed', { userId: session.user.id, slug: (await params).slug, requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.success(post, { meta: { requestId } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('PUT blog post failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return addHeaders(apiResponse.forbidden('Access denied', requestId), requestId);
        }

        const ip = getClientIp(request);
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT_MUTATION, `blog:post:delete:${session.user.id}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        await prisma.blogPost.delete({
            where: { slug: (await params).slug }
        });

        logger.info('DELETE blog post completed', { userId: session.user.id, slug: (await params).slug, requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.success({ success: true }, { meta: { requestId } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('DELETE blog post failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
