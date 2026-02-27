// src/app/api/admin/goal-templates/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { PlatformCategory, GoalType, GoalMetric, Prisma, AuditAction } from '@prisma/client';
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
  description: z.string().min(10).max(2000).optional(),
  category: z.nativeEnum(PlatformCategory).optional(),
  goalType: z.nativeEnum(GoalType).optional(),
  metric: z.nativeEnum(GoalMetric).optional(),
  target: z.number().int().min(1).max(100000).optional(),
  duration: z.number().int().min(1).max(365).optional(),
  icon: z.string().max(200).optional(),
  color: z.string().max(50).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  estimatedTime: z.string().max(100).optional(),
  tips: z.array(z.string().max(500)).max(10).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
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
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `admin-goal-template-detail:${ip}`);

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
// GET - Get single goal template
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

    const template = await prisma.goalTemplate.findUnique({ where: { id } });

    if (!template) {
      return addHeaders(apiResponse.notFound('Goal template', requestId), requestId, rateLimitResult);
    }

    logger.info('Goal template fetched', {
      templateId: id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(template, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET admin goal template failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch goal template', requestId), requestId);
  }
}

// =============================================================================
// PUT/PATCH - Update goal template
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

    const currentTemplate = await prisma.goalTemplate.findUnique({ where: { id } });

    if (!currentTemplate) {
      return addHeaders(apiResponse.notFound('Goal template', requestId), requestId, rateLimitResult);
    }

    const updated = await prisma.goalTemplate.update({
      where: { id },
      data: { ...validation.data, updatedAt: new Date() },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE' as AuditAction,
        category: 'admin',
        entityType: 'goalTemplate',
        entityId: id,
        description: `Updated goal template: ${updated.title}`,
        oldValue: currentTemplate as unknown as Prisma.InputJsonValue,
        newValue: updated as unknown as Prisma.InputJsonValue,
        ipAddress: getClientIp(request),
        performedBy: userId,
      },
    });

    logger.info('Goal template updated', {
      templateId: id,
      adminId: userId,
      changes: Object.keys(validation.data),
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(updated, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PUT admin goal template failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update goal template', requestId), requestId);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return PUT(request, context);
}

// =============================================================================
// DELETE - Delete goal template
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

    const template = await prisma.goalTemplate.findUnique({ where: { id } });

    if (!template) {
      return addHeaders(apiResponse.notFound('Goal template', requestId), requestId, rateLimitResult);
    }

    await prisma.goalTemplate.delete({ where: { id } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE' as AuditAction,
        category: 'admin',
        entityType: 'goalTemplate',
        entityId: id,
        description: `Deleted goal template: ${template.title}`,
        oldValue: template as unknown as Prisma.InputJsonValue,
        ipAddress: getClientIp(request),
        performedBy: userId,
      },
    });

    logger.info('Goal template deleted', {
      templateId: id,
      adminId: userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success({ message: 'Goal template deleted' }, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE admin goal template failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to delete goal template', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';