// src/app/api/admin/changelog/[id]/route.ts
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
  version: z.string().min(1).max(50).regex(/^\d+\.\d+\.\d+$/).optional(),
  title: z.string().min(5).max(300).optional(),
  description: z.string().min(10).max(2000).optional(),
  type: z.enum(['feature', 'improvement', 'bugfix', 'security']).optional(),
  changes: z.array(z.object({
    type: z.enum(['added', 'changed', 'deprecated', 'removed', 'fixed', 'security']),
    description: z.string().min(10).max(500),
  })).min(1).optional(),
  isPublished: z.boolean().optional(),
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
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `admin-changelog-detail:${ip}`);

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
// GET - Get single changelog entry
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

    const entry = await prisma.changelogEntry.findUnique({ where: { id } });

    if (!entry) {
      return addHeaders(apiResponse.notFound('Changelog entry', requestId), requestId, rateLimitResult);
    }

    logger.info('Changelog entry fetched', {
      entryId: id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(entry, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET admin changelog entry failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch changelog entry', requestId), requestId);
  }
}

// =============================================================================
// PUT/PATCH - Update changelog entry
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

    const currentEntry = await prisma.changelogEntry.findUnique({ where: { id } });

    if (!currentEntry) {
      return addHeaders(apiResponse.notFound('Changelog entry', requestId), requestId, rateLimitResult);
    }

    const data = validation.data;

    // Check version uniqueness if changing
    if (data.version && data.version !== currentEntry.version) {
      const existing = await prisma.changelogEntry.findFirst({
        where: { version: data.version, id: { not: id } },
      });

      if (existing) {
        return addHeaders(
          apiResponse.validationError('Changelog entry with this version already exists', undefined, requestId),
          requestId,
          rateLimitResult
        );
      }
    }

    // Auto-set publishedAt when publishing
    const shouldSetPublishedAt =
      data.isPublished === true &&
      currentEntry.isPublished !== true &&
      !currentEntry.publishedAt;

    const updated = await prisma.changelogEntry.update({
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
        entityType: 'changelogEntry',
        entityId: id,
        description: `Updated changelog entry: ${updated.version}`,
        oldValue: currentEntry as unknown as Prisma.InputJsonValue,
        newValue: updated as unknown as Prisma.InputJsonValue,
        ipAddress: getClientIp(request),
        performedBy: userId,
      },
    });

    logger.info('Changelog entry updated', {
      entryId: id,
      adminId: userId,
      changes: Object.keys(data),
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(updated, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PUT admin changelog entry failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update changelog entry', requestId), requestId);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return PUT(request, context);
}

// =============================================================================
// DELETE - Delete changelog entry
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

    const entry = await prisma.changelogEntry.findUnique({ where: { id } });

    if (!entry) {
      return addHeaders(apiResponse.notFound('Changelog entry', requestId), requestId, rateLimitResult);
    }

    await prisma.changelogEntry.delete({ where: { id } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE' as AuditAction,
        category: 'admin',
        entityType: 'changelogEntry',
        entityId: id,
        description: `Deleted changelog entry: ${entry.version}`,
        oldValue: entry as unknown as Prisma.InputJsonValue,
        ipAddress: getClientIp(request),
        performedBy: userId,
      },
    });

    logger.info('Changelog entry deleted', {
      entryId: id,
      adminId: userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success({ message: 'Changelog entry deleted' }, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE admin changelog entry failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to delete changelog entry', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';