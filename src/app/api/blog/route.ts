import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT_GET = 50;
const RATE_LIMIT_POST = 10;
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
};

const blogPostSchema = z.object({
    title: z.string().min(5),
    slug: z.string().min(3).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    content: z.string().min(20),
    excerpt: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).default([]),
    featuredImage: z.string().url().optional(),
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
    publishedAt: z.string().datetime().optional(),
    authorName: z.string().optional(),
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
        const { searchParams } = request.nextUrl;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;
        const category = searchParams.get('category');
        const tag = searchParams.get('tag');
        const status = searchParams.get('status') || 'published';

        const where: any = { status };
        if (category) where.category = category;
        if (tag) where.tags = { has: tag };

        const [posts, total] = await Promise.all([
            prisma.blogPost.findMany({
                where,
                orderBy: { publishedAt: 'desc' },
                take: limit,
                skip: skip,
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    excerpt: true,
                    category: true,
                    tags: true,
                    featuredImage: true,
                    authorName: true,
                    publishedAt: true,
                    createdAt: true,
                    viewCount: true
                }
            }),
            prisma.blogPost.count({ where })
        ]);

        logger.info('GET blog posts completed', { count: posts.length, requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.success(posts, { meta: { requestId, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPreviousPage: page > 1 } } }), requestId);

    } catch (error) {
        logger.error('GET blog posts failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return addHeaders(apiResponse.forbidden('Access denied', requestId), requestId);
        }

        const ip = getClientIp(request);
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT_POST, `blog:post:${session.user.id}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        const body = await request.json();
        const validation = blogPostSchema.safeParse(body);

        if (!validation.success) {
            return addHeaders(apiResponse.validationError('Invalid input', validation.error.errors, requestId), requestId, rateLimitResult);
        }

        const { title, slug, content, excerpt, category, tags, featuredImage, status, publishedAt, authorName } = validation.data;

        const post = await prisma.blogPost.create({
            data: {
                title,
                slug,
                content,
                excerpt,
                category,
                tags,
                featuredImage,
                status,
                publishedAt: publishedAt ? new Date(publishedAt) : (status === 'published' ? new Date() : null),
                authorId: session.user.id,
                authorName: authorName || session.user.name,
            }
        });

        logger.info('POST blog post completed', { userId: session.user.id, postId: post.id, requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.created(post, { meta: { requestId } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('POST blog post failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
