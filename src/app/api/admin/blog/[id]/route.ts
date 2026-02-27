// src/app/api/admin/blog/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { Prisma, AuditAction } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 100;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION
// =============================================================================

const updateSchema = z.object({
  title: z.string().min(5).max(300).optional(),
  excerpt: z.string().min(10).max(500).optional(),
  content: z.string().min(50).optional(),
  featuredImage: z.string().url().optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(response: NextResponse, requestId: string, rateLimitResult?: { limit: number; remaining: number }): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);
  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }
  return response;
}

async function validateAdminSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `admin-blog-detail:${ip}`);

  if (!rateLimitResult.success) {
    return { error: apiResponse.rateLimited(60, requestId), session: null, rateLimitResult };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: apiResponse.unauthorized('Authentication required', requestId), session: null, rateLimitResult };
  }

  const isAdmin = Boolean(session.user.isAdmin || session.user.role === 'admin');

  if (!isAdmin) {
    return { error: apiResponse.forbidden('Admin access required', requestId), session: null, rateLimitResult };
  }

  return { error: null, session, rateLimitResult };
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

// =============================================================================
// GET - Get single blog post
// =============================================================================

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { id } = await context.params;
    const { error, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const post = await prisma.blogPost.findUnique({
      where: { id },
    });

    if (!post) {
      return addHeaders(apiResponse.notFound('Blog post', requestId), requestId, rateLimitResult);
    }

    logger.info('Blog post fetched', {
      postId: id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(post, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET admin blog post failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch blog post', requestId), requestId);
  }
}

// =============================================================================
// PUT/PATCH - Update blog post
// =============================================================================

export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { id } = await context.params;
    const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const currentPost = await prisma.blogPost.findUnique({ where: { id } });

    if (!currentPost) {
      return addHeaders(apiResponse.notFound('Blog post', requestId), requestId, rateLimitResult);
    }

    const data = validation.data;

    // Auto-set publishedAt when publishing
    const shouldSetPublishedAt =
      data.status === 'published' &&
      currentPost.status !== 'published' &&
      !currentPost.publishedAt;

    const updated = await prisma.blogPost.update({
      where: { id },
      data: {
        ...data,
        ...(shouldSetPublishedAt && { publishedAt: new Date() }),
        updatedAt: new Date(),
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE' as AuditAction,
        category: 'admin',
        entityType: 'blogPost',
        entityId: id,
        description: `Updated blog post: ${updated.title}`,
        oldValue: currentPost as unknown as Prisma.InputJsonValue,
        newValue: updated as unknown as Prisma.InputJsonValue,
        ipAddress: getClientIp(request),
        performedBy: userId,
      },
    });

    logger.info('Blog post updated', {
      postId: id,
      adminId: userId,
      changes: Object.keys(data),
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(updated, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PUT admin blog post failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update blog post', requestId), requestId);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return PUT(request, context);
}

// =============================================================================
// DELETE - Delete blog post
// =============================================================================

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { id } = await context.params;
    const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    const post = await prisma.blogPost.findUnique({ where: { id } });

    if (!post) {
      return addHeaders(apiResponse.notFound('Blog post', requestId), requestId, rateLimitResult);
    }

    await prisma.blogPost.delete({ where: { id } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE' as AuditAction,
        category: 'admin',
        entityType: 'blogPost',
        entityId: id,
        description: `Deleted blog post: ${post.title}`,
        oldValue: post as unknown as Prisma.InputJsonValue,
        ipAddress: getClientIp(request),
        performedBy: userId,
      },
    });

    logger.info('Blog post deleted', {
      postId: id,
      adminId: userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success({ message: 'Blog post deleted' }, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE admin blog post failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to delete blog post', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';