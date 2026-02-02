// src/app/api/waitlist/route.ts
// =============================================================================
// WAITLIST API ROUTES - Main waitlist management
// Handles: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
// =============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { waitlistService } from '@/services/waitlistService';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT_PUBLIC = 20; // Public endpoints
const RATE_LIMIT_ADMIN = 100; // Admin endpoints

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  status: z.enum(['waiting', 'invited', 'joined']).optional(),
  source: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['position', 'createdAt', 'email', 'status']).default('position'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

const bulkActionSchema = z.object({
  action: z.enum(['invite', 'delete', 'updateStatus']),
  ids: z.array(z.string().cuid()).min(1).max(100).optional(),
  count: z.number().int().min(1).max(500).optional(),
  status: z.enum(['waiting', 'invited', 'joined']).optional(),
});

const updateEntrySchema = z.object({
  status: z.enum(['waiting', 'invited', 'joined']).optional(),
  position: z.number().int().min(1).optional(),
  name: z.string().max(100).optional().nullable(),
  source: z.string().max(50).optional().nullable(),
});

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

function addSecurityHeaders(response: NextResponse, requestId: string): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);
  return response;
}

async function validateAdminSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT_ADMIN, ip);

  if (!rateLimitResult.success) {
    logger.warn('Rate limit exceeded for waitlist admin', { ip, requestId });
    return {
      error: apiResponse.rateLimited(60, requestId),
      session: null,
      rateLimitResult,
    };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      error: apiResponse.unauthorized('Authentication required', requestId),
      session: null,
      rateLimitResult,
    };
  }

  if (!session.user.isAdmin && session.user.role !== 'admin') {
    logger.warn('Non-admin access attempt to waitlist admin', {
      userId: session.user.id,
      requestId,
    });
    return {
      error: apiResponse.forbidden('Admin access required', requestId),
      session: null,
      rateLimitResult,
    };
  }

  return { error: null, session, rateLimitResult };
}

async function createAuditLog(
  userId: string,
  action: string,
  description: string,
  request: NextRequest,
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: action as any,
        category: 'waitlist',
        entityType: 'waitlist',
        description,
        metadata: metadata as any,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent'),
        status: 'success',
      },
    });
  } catch (error) {
    logger.error('Failed to create audit log', { userId, action }, error);
  }
}

// =============================================================================
// OPTIONS - CORS Preflight
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();

  const response = new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });

  return addSecurityHeaders(response, requestId);
}

// =============================================================================
// HEAD - Get waitlist metadata
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT_PUBLIC, ip);

    if (!rateLimitResult.success) {
      return addSecurityHeaders(new NextResponse(null, { status: 429 }), requestId);
    }

    const [total, waiting] = await Promise.all([
      prisma.waitlist.count(),
      prisma.waitlist.count({ where: { status: 'waiting' } }),
    ]);

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Total-Count': String(total),
        'X-Waiting-Count': String(waiting),
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });

    return addSecurityHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD waitlist failed', { requestId }, error);
    return addSecurityHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// GET - Get waitlist entries (Admin only)
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);
    if (error) return addSecurityHeaders(error, requestId);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      status: searchParams.get('status'),
      source: searchParams.get('source'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    });

    if (!queryValidation.success) {
      return addSecurityHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId
      );
    }

    const { status, source, page, limit, search, sortBy, sortOrder } = queryValidation.data;

    logger.debug('Fetching waitlist entries', {
      userId: session!.user.id,
      requestId,
      filters: { status, source, search },
    });

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (source) where.source = source;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch entries with pagination
    const [entries, total] = await Promise.all([
      prisma.waitlist.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.waitlist.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    logger.info('Waitlist entries fetched', {
      userId: session!.user.id,
      requestId,
      count: entries.length,
      total,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.paginated(
      entries,
      {
        page,
        limit,
        
        
        total,
     
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
 
      
      },
      {
        meta: { requestId },
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );

    return addSecurityHeaders(response, requestId);
  } catch (error) {
    logger.error('GET waitlist failed', { requestId }, error);
    return addSecurityHeaders(
      apiResponse.internalError('Failed to fetch waitlist', requestId),
      requestId
    );
  }
}

// =============================================================================
// POST - Bulk actions on waitlist (Admin only)
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);
    if (error) return addSecurityHeaders(error, requestId);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addSecurityHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId
      );
    }

    const validation = bulkActionSchema.safeParse(body);

    if (!validation.success) {
      return addSecurityHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId
      );
    }

    const { action, ids, count, status } = validation.data;
    let result: unknown;

    logger.info('Waitlist bulk action', {
      userId: session!.user.id,
      action,
      requestId,
    });

    switch (action) {
      case 'invite': {
        if (count) {
          // Bulk invite by count
          result = await waitlistService.bulkInvite(count);
        } else if (ids && ids.length > 0) {
          // Invite specific entries
          const entries = await prisma.waitlist.findMany({
            where: { id: { in: ids }, status: 'waiting' },
          });

          const invited = await Promise.all(
            entries.map((entry) => waitlistService.invite(entry.email))
          );

          result = { invited: invited.length };
        } else {
          return addSecurityHeaders(
            apiResponse.validationError('Either count or ids required for invite', undefined, requestId),
            requestId
          );
        }
        break;
      }

      case 'delete': {
        if (!ids || ids.length === 0) {
          return addSecurityHeaders(
            apiResponse.validationError('IDs required for delete action', undefined, requestId),
            requestId
          );
        }

        const deleted = await prisma.waitlist.deleteMany({
          where: { id: { in: ids } },
        });

        result = { deleted: deleted.count };
        break;
      }

      case 'updateStatus': {
        if (!ids || ids.length === 0 || !status) {
          return addSecurityHeaders(
            apiResponse.validationError('IDs and status required for updateStatus', undefined, requestId),
            requestId
          );
        }

        const updated = await prisma.waitlist.updateMany({
          where: { id: { in: ids } },
          data: {
            status,
            ...(status === 'invited' ? { invitedAt: new Date() } : {}),
            ...(status === 'joined' ? { joinedAt: new Date() } : {}),
          },
        });

        result = { updated: updated.count };
        break;
      }

      default:
        return addSecurityHeaders(
          apiResponse.validationError(`Unknown action: ${action}`, undefined, requestId),
          requestId
        );
    }

    await createAuditLog(
      session!.user.id,
      'ADMIN_ACTION',
      `Waitlist bulk action: ${action}`,
      request,
      { action, ids, count, result }
    );

    logger.info('Waitlist bulk action completed', {
      userId: session!.user.id,
      action,
      result,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(result, {
      meta: { requestId },
      message: `Bulk ${action} completed successfully`,
      headers: {
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });

    return addSecurityHeaders(response, requestId);
  } catch (error) {
    logger.error('POST waitlist bulk action failed', { requestId }, error);
    return addSecurityHeaders(
      apiResponse.internalError('Failed to perform bulk action', requestId),
      requestId
    );
  }
}

// =============================================================================
// PUT - Update waitlist entry by email (Admin only)
// =============================================================================

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);
    if (error) return addSecurityHeaders(error, requestId);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addSecurityHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId
      );
    }

    const { email, ...updateData } = body as { email?: string } & Record<string, unknown>;

    if (!email) {
      return addSecurityHeaders(
        apiResponse.validationError('Email is required', undefined, requestId),
        requestId
      );
    }

    const validation = updateEntrySchema.safeParse(updateData);

    if (!validation.success) {
      return addSecurityHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId
      );
    }

    // Check if entry exists
    const existing = await prisma.waitlist.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!existing) {
      return addSecurityHeaders(
        apiResponse.notFound('Waitlist entry', requestId),
        requestId
      );
    }

    const data = validation.data;

    // Update entry
    const updated = await prisma.waitlist.update({
      where: { email: email.toLowerCase() },
      data: {
        ...data,
        ...(data.status === 'invited' && !existing.invitedAt ? { invitedAt: new Date() } : {}),
        ...(data.status === 'joined' && !existing.joinedAt ? { joinedAt: new Date() } : {}),
        updatedAt: new Date(),
      },
    });

    await createAuditLog(
      session!.user.id,
      'UPDATE',
      `Waitlist entry updated: ${email}`,
      request,
      { email, changes: data }
    );

    logger.info('Waitlist entry updated', {
      userId: session!.user.id,
      email,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(updated, {
      meta: { requestId },
      message: 'Waitlist entry updated successfully',
      headers: {
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });

    return addSecurityHeaders(response, requestId);
  } catch (error) {
    logger.error('PUT waitlist failed', { requestId }, error);
    return addSecurityHeaders(
      apiResponse.internalError('Failed to update waitlist entry', requestId),
      requestId
    );
  }
}

// =============================================================================
// PATCH - Partial update (Admin only)
// =============================================================================

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);
    if (error) return addSecurityHeaders(error, requestId);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addSecurityHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId
      );
    }

    const { id, email, ...updateData } = body as { 
      id?: string; 
      email?: string;
    } & Record<string, unknown>;

    if (!id && !email) {
      return addSecurityHeaders(
        apiResponse.validationError('Either id or email is required', undefined, requestId),
        requestId
      );
    }

    const validation = updateEntrySchema.partial().safeParse(updateData);

    if (!validation.success) {
      return addSecurityHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId
      );
    }

    const whereClause = id ? { id } : { email: email!.toLowerCase() };

    const updated = await prisma.waitlist.update({
      where: whereClause,
      data: {
        ...validation.data,
        updatedAt: new Date(),
      },
    });

    logger.info('Waitlist entry patched', {
      userId: session!.user.id,
      id: updated.id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(updated, {
      meta: { requestId },
      headers: {
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });

    return addSecurityHeaders(response, requestId);
  } catch (error) {
    logger.error('PATCH waitlist failed', { requestId }, error);

    if ((error as any)?.code === 'P2025') {
      return addSecurityHeaders(
        apiResponse.notFound('Waitlist entry', requestId),
        requestId
      );
    }

    return addSecurityHeaders(
      apiResponse.internalError('Failed to update waitlist entry', requestId),
      requestId
    );
  }
}

// =============================================================================
// DELETE - Remove from waitlist (Admin only)
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);
    if (error) return addSecurityHeaders(error, requestId);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');

    if (!id && !email) {
      return addSecurityHeaders(
        apiResponse.validationError('Either id or email query parameter is required', undefined, requestId),
        requestId
      );
    }

    const whereClause = id ? { id } : { email: email!.toLowerCase() };

    // Check if exists
    const existing = await prisma.waitlist.findFirst({ where: whereClause });

    if (!existing) {
      return addSecurityHeaders(
        apiResponse.notFound('Waitlist entry', requestId),
        requestId
      );
    }

    await prisma.waitlist.delete({ where: whereClause });

    await createAuditLog(
      session!.user.id,
      'DELETE',
      `Waitlist entry deleted: ${existing.email}`,
      request,
      { email: existing.email, id: existing.id }
    );

    logger.info('Waitlist entry deleted', {
      userId: session!.user.id,
      email: existing.email,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      { message: 'Waitlist entry deleted successfully', email: existing.email },
      {
        meta: { requestId },
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );

    return addSecurityHeaders(response, requestId);
  } catch (error) {
    logger.error('DELETE waitlist failed', { requestId }, error);
    return addSecurityHeaders(
      apiResponse.internalError('Failed to delete waitlist entry', requestId),
      requestId
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';