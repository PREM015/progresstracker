// src/app/api/custom-platforms/[id]/route.ts
/**
 * Custom Platform Individual Routes
 * 
 * GET     /api/custom-platforms/[id]     - Get single platform
 * PUT     /api/custom-platforms/[id]     - Full update
 * PATCH   /api/custom-platforms/[id]     - Partial update
 * DELETE  /api/custom-platforms/[id]     - Delete/Deactivate platform
 * HEAD    /api/custom-platforms/[id]     - Check if platform exists
 * OPTIONS /api/custom-platforms/[id]     - Get allowed methods
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { PlatformCategory, Prisma } from '@prisma/client';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
  toApiError,
} from '@/lib/apiError';
import { rateLimiters, checkRateLimit } from '@/lib/rateLimiter';
import { auditLogService } from '@/services/auditLogService';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/custom-platforms/[id]' });

const ALLOWED_METHODS = ['GET', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * ID parameter validation
 */
const idSchema = z.string().cuid({ message: 'Invalid platform ID format' });

/**
 * Full update schema (PUT) - all fields required or have defaults
 */
const updateSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Name can only contain letters, numbers, spaces, hyphens, and underscores'),
  displayName: z
    .string()
    .max(100, 'Display name must be less than 100 characters')
    .nullable()
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .nullable()
    .optional(),
  category: z.nativeEnum(PlatformCategory, {
    errorMap: () => ({ message: 'Invalid category' }),
  }),
  icon: z
    .string()
    .max(50, 'Icon must be less than 50 characters')
    .nullable()
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color')
    .nullable()
    .optional(),
  website: z
    .string()
    .url('Website must be a valid URL')
    .max(200)
    .nullable()
    .optional(),
  trackingFields: z
    .record(
      z.string(),
      z.object({
        type: z.enum(['number', 'text', 'boolean', 'date', 'select']),
        label: z.string().max(50).optional(),
        required: z.boolean().optional(),
        options: z.array(z.string()).optional(),
        min: z.number().optional(),
        max: z.number().optional(),
      })
    )
    .nullable()
    .optional(),
  isActive: z.boolean().optional(),
});

/**
 * Partial update schema (PATCH) - all fields optional
 */
const patchSchema = updateSchema.partial();

type UpdateInput = z.infer<typeof updateSchema>;
type PatchInput = z.infer<typeof patchSchema>;

// =============================================================================
// TYPES
// =============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get request context
 */
function getRequestContext(req: NextRequest) {
  return {
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
    requestId: req.headers.get('x-request-id') || crypto.randomUUID(),
  };
}

/**
 * Create error response
 */
function errorResponse(error: unknown, requestId: string): NextResponse {
  const apiError = toApiError(error, requestId);
  apiError.log();

  return NextResponse.json(
    {
      success: false,
      error: apiError.message,
      code: apiError.code,
      details: apiError.details,
      timestamp: apiError.timestamp,
      requestId,
    },
    { 
      status: apiError.statusCode,
      headers: { 'X-Request-ID': requestId },
    }
  );
}

/**
 * Create success response
 */
function successResponse<T>(
  data: T, 
  status: number = 200,
  headers: Record<string, string> = {}
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { 
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }
  );
}

/**
 * Validate platform ownership
 */
async function validateOwnership(platformId: string, userId: string) {
  const platform = await prisma.customPlatform.findUnique({
    where: { id: platformId },
    select: {
      id: true,
      userId: true,
      name: true,
      displayName: true,
      description: true,
      category: true,
      icon: true,
      color: true,
      website: true,
      trackingFields: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!platform) {
    throw new NotFoundError('Custom platform');
  }

  if (platform.userId !== userId) {
    throw new ForbiddenError('You do not have permission to access this platform');
  }

  return platform;
}

/**
 * Get stats for a platform
 */
async function getPlatformStats(platformId: string) {
  const [entriesCount, totalProblems, totalTime, lastEntry] = await Promise.all([
    prisma.trackerEntry.count({
      where: { customPlatformId: platformId },
    }),
    prisma.trackerEntry.aggregate({
      where: { customPlatformId: platformId },
      _sum: { problemsSolved: true },
    }),
    prisma.trackerEntry.aggregate({
      where: { customPlatformId: platformId },
      _sum: { timeSpent: true },
    }),
    prisma.trackerEntry.findFirst({
      where: { customPlatformId: platformId },
      orderBy: { date: 'desc' },
      select: { date: true },
    }),
  ]);

  return {
    totalEntries: entriesCount,
    totalProblems: totalProblems._sum.problemsSolved || 0,
    totalTimeSpent: totalTime._sum.timeSpent || 0,
    lastActivityDate: lastEntry?.date || null,
  };
}

// =============================================================================
// GET - Get Single Platform
// =============================================================================

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { requestId } = getRequestContext(req);
  const startTime = Date.now();

  try {
    // 1. Get and validate ID
    const { id } = await params;
    const validatedId = idSchema.safeParse(id);
    if (!validatedId.success) {
      throw new ValidationError('Invalid platform ID', [{ field: 'id', message: validatedId.error.errors[0].message }]);
    }

    // 2. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    // 3. Rate limiting
    const rateLimitResult = await checkRateLimit(`custom-platforms:get:${session.user.id}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429, headers: { 'Retry-After': '60', 'X-Request-ID': requestId } }
      );
    }

    // 4. Validate ownership and get platform
    const platform = await validateOwnership(validatedId.data, session.user.id);

    // 5. Get stats (optional, based on query param)
    const includeStats = req.nextUrl.searchParams.get('includeStats') === 'true';
    let stats = null;
    
    if (includeStats) {
      stats = await getPlatformStats(platform.id);
    }

    const duration = Date.now() - startTime;
    log.info('Custom platform fetched', { platformId: id, userId: session.user.id, duration });

    return successResponse(
      {
        platform,
        ...(stats && { stats }),
      },
      200,
      {
        'X-Request-ID': requestId,
        'X-Response-Time': `${duration}ms`,
        'Cache-Control': 'private, max-age=60',
      }
    );

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// PUT - Full Update Platform
// =============================================================================

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { requestId, ip, userAgent } = getRequestContext(req);
  const startTime = Date.now();

  try {
    // 1. Get and validate ID
    const { id } = await params;
    const validatedId = idSchema.safeParse(id);
    if (!validatedId.success) {
      throw new ValidationError('Invalid platform ID', [{ field: 'id', message: validatedId.error.errors[0].message }]);
    }

    // 2. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // 3. Rate limiting
    const rateLimitResult = await checkRateLimit(`custom-platforms:update:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429, headers: { 'Retry-After': '60', 'X-Request-ID': requestId } }
      );
    }

    // 4. Validate ownership
    const existingPlatform = await validateOwnership(validatedId.data, userId);

    // 5. Parse and validate body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON in request body');
    }

    const validatedData = updateSchema.safeParse(body);
    if (!validatedData.success) {
      throw new ValidationError(
        'Validation failed',
        validatedData.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const data: UpdateInput = validatedData.data;

    // 6. Check name uniqueness (if name changed)
    if (data.name.toLowerCase() !== existingPlatform.name.toLowerCase()) {
      const duplicate = await prisma.customPlatform.findFirst({
        where: {
          userId,
          name: { equals: data.name, mode: 'insensitive' },
          id: { not: validatedId.data },
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictError(
          `A custom platform with the name "${data.name}" already exists`,
          [{ field: 'name', value: data.name }]
        );
      }
    }

    // 7. Update platform
    const updatedPlatform = await prisma.customPlatform.update({
      where: { id: validatedId.data },
      data: {
        name: data.name.trim(),
        displayName: data.displayName?.trim() || data.name.trim(),
        description: data.description?.trim() || null,
        category: data.category,
        icon: data.icon || null,
        color: data.color || null,
        website: data.website || null,
        trackingFields: data.trackingFields as Prisma.InputJsonValue || {},
        isActive: data.isActive ?? true,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        category: true,
        icon: true,
        color: true,
        website: true,
        trackingFields: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 8. Audit log
    await auditLogService.create({
      userId,
      action: 'UPDATE',
      category: 'custom-platform',
      entityType: 'CustomPlatform',
      entityId: updatedPlatform.id,
      description: `Updated custom platform: ${updatedPlatform.name}`,
      oldValue: existingPlatform as unknown as Record<string, unknown>,
      newValue: updatedPlatform as unknown as Record<string, unknown>,
      ipAddress: ip,
      userAgent,
      requestId,
      status: 'success',
    });

    const duration = Date.now() - startTime;
    log.info('Custom platform updated (PUT)', { platformId: validatedId.data, userId, duration });

    return successResponse(
      { platform: updatedPlatform },
      200,
      {
        'X-Request-ID': requestId,
        'X-Response-Time': `${duration}ms`,
      }
    );

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// PATCH - Partial Update Platform
// =============================================================================

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { requestId, ip, userAgent } = getRequestContext(req);
  const startTime = Date.now();

  try {
    // 1. Get and validate ID
    const { id } = await params;
    const validatedId = idSchema.safeParse(id);
    if (!validatedId.success) {
      throw new ValidationError('Invalid platform ID', [{ field: 'id', message: validatedId.error.errors[0].message }]);
    }

    // 2. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // 3. Rate limiting
    const rateLimitResult = await checkRateLimit(`custom-platforms:update:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429, headers: { 'Retry-After': '60', 'X-Request-ID': requestId } }
      );
    }

    // 4. Validate ownership
    const existingPlatform = await validateOwnership(validatedId.data, userId);

    // 5. Parse and validate body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON in request body');
    }

    // Check if body is empty
    if (!body || Object.keys(body as object).length === 0) {
      throw new ValidationError('Request body cannot be empty');
    }

    const validatedData = patchSchema.safeParse(body);
    if (!validatedData.success) {
      throw new ValidationError(
        'Validation failed',
        validatedData.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const data: PatchInput = validatedData.data;

    // 6. Check name uniqueness (if name is being changed)
    if (data.name && data.name.toLowerCase() !== existingPlatform.name.toLowerCase()) {
      const duplicate = await prisma.customPlatform.findFirst({
        where: {
          userId,
          name: { equals: data.name, mode: 'insensitive' },
          id: { not: validatedId.data },
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictError(
          `A custom platform with the name "${data.name}" already exists`,
          [{ field: 'name', value: data.name }]
        );
      }
    }

    // 7. Build update data (only include provided fields)
    const updateData: Prisma.CustomPlatformUpdateInput = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.displayName !== undefined) {
      updateData.displayName = data.displayName?.trim() || null;
    }
    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }
    if (data.category !== undefined) {
      updateData.category = data.category;
    }
    if (data.icon !== undefined) {
      updateData.icon = data.icon || null;
    }
    if (data.color !== undefined) {
      updateData.color = data.color || null;
    }
    if (data.website !== undefined) {
      updateData.website = data.website || null;
    }
    if (data.trackingFields !== undefined) {
      updateData.trackingFields = data.trackingFields as Prisma.InputJsonValue || {};
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    // 8. Update platform
    const updatedPlatform = await prisma.customPlatform.update({
      where: { id: validatedId.data },
      data: updateData,
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        category: true,
        icon: true,
        color: true,
        website: true,
        trackingFields: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 9. Audit log with changes
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    for (const key of Object.keys(data) as (keyof PatchInput)[]) {
      if (data[key] !== undefined) {
        changes[key] = {
          old: existingPlatform[key as keyof typeof existingPlatform],
          new: data[key],
        };
      }
    }

    await auditLogService.create({
      userId,
      action: 'UPDATE',
      category: 'custom-platform',
      entityType: 'CustomPlatform',
      entityId: updatedPlatform.id,
      description: `Partially updated custom platform: ${updatedPlatform.name}`,
      changes,
      ipAddress: ip,
      userAgent,
      requestId,
      status: 'success',
    });

    const duration = Date.now() - startTime;
    log.info('Custom platform updated (PATCH)', { 
      platformId: validatedId.data, 
      userId, 
      fieldsUpdated: Object.keys(data),
      duration,
    });

    return successResponse(
      { platform: updatedPlatform },
      200,
      {
        'X-Request-ID': requestId,
        'X-Response-Time': `${duration}ms`,
      }
    );

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// DELETE - Delete or Deactivate Platform
// =============================================================================

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { requestId, ip, userAgent } = getRequestContext(req);
  const startTime = Date.now();

  try {
    // 1. Get and validate ID
    const { id } = await params;
    const validatedId = idSchema.safeParse(id);
    if (!validatedId.success) {
      throw new ValidationError('Invalid platform ID', [{ field: 'id', message: validatedId.error.errors[0].message }]);
    }

    // 2. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // 3. Rate limiting
    const rateLimitResult = await checkRateLimit(`custom-platforms:delete:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429, headers: { 'Retry-After': '60', 'X-Request-ID': requestId } }
      );
    }

    // 4. Validate ownership
    const existingPlatform = await validateOwnership(validatedId.data, userId);

    // 5. Check for associated entries
    const entriesCount = await prisma.trackerEntry.count({
      where: { customPlatformId: validatedId.data },
    });

    // 6. Check query param for force delete
    const forceDelete = req.nextUrl.searchParams.get('force') === 'true';

    let result: { deleted: boolean; deactivated: boolean; entriesCount: number };

    if (entriesCount > 0 && !forceDelete) {
      // Soft delete (deactivate) if has entries
      await prisma.customPlatform.update({
        where: { id: validatedId.data },
        data: { isActive: false, updatedAt: new Date() },
      });

      result = { deleted: false, deactivated: true, entriesCount };

      log.info('Custom platform deactivated', { 
        platformId: validatedId.data, 
        userId, 
        entriesCount,
      });
    } else if (entriesCount > 0 && forceDelete) {
      // Force delete with entries (cascade)
      await prisma.$transaction([
        prisma.trackerEntry.deleteMany({
          where: { customPlatformId: validatedId.data },
        }),
        prisma.customPlatform.delete({
          where: { id: validatedId.data },
        }),
      ]);

      result = { deleted: true, deactivated: false, entriesCount };

      log.warn('Custom platform force deleted with entries', { 
        platformId: validatedId.data, 
        userId, 
        entriesCount,
      });
    } else {
      // Hard delete if no entries
      await prisma.customPlatform.delete({
        where: { id: validatedId.data },
      });

      result = { deleted: true, deactivated: false, entriesCount: 0 };

      log.info('Custom platform deleted', { platformId: validatedId.data, userId });
    }

    // 7. Audit log
    await auditLogService.create({
      userId,
      action: 'DELETE',
      category: 'custom-platform',
      entityType: 'CustomPlatform',
      entityId: validatedId.data,
      description: result.deleted 
        ? `Deleted custom platform: ${existingPlatform.name}${forceDelete ? ' (force)' : ''}`
        : `Deactivated custom platform: ${existingPlatform.name}`,
      oldValue: existingPlatform as unknown as Record<string, unknown>,
      ipAddress: ip,
      userAgent,
      requestId,
      status: 'success',
    });

    const duration = Date.now() - startTime;

    // Return 204 for actual delete, 200 for deactivate
    if (result.deleted && !forceDelete) {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'X-Request-ID': requestId,
          'X-Response-Time': `${duration}ms`,
        },
      });
    }

    return successResponse(
      {
        message: result.deleted 
          ? 'Custom platform deleted successfully'
          : 'Custom platform deactivated (has associated entries)',
        ...result,
      },
      200,
      {
        'X-Request-ID': requestId,
        'X-Response-Time': `${duration}ms`,
      }
    );

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// HEAD - Check if platform exists
// =============================================================================

export async function HEAD(req: NextRequest, { params }: RouteParams) {
  const { requestId } = getRequestContext(req);

  try {
    const { id } = await params;
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(null, { 
        status: 401,
        headers: { 'X-Request-ID': requestId },
      });
    }

    const platform = await prisma.customPlatform.findFirst({
      where: { 
        id,
        userId: session.user.id,
      },
      select: { 
        id: true, 
        isActive: true,
        updatedAt: true,
      },
    });

    if (!platform) {
      return new NextResponse(null, { 
        status: 404,
        headers: { 'X-Request-ID': requestId },
      });
    }

    return new NextResponse(null, {
      status: platform.isActive ? 200 : 410, // 410 Gone if deactivated
      headers: {
        'X-Request-ID': requestId,
        'X-Platform-Active': String(platform.isActive),
        'Last-Modified': platform.updatedAt.toUTCString(),
      },
    });

  } catch {
    return new NextResponse(null, { 
      status: 500,
      headers: { 'X-Request-ID': requestId },
    });
  }
}

// =============================================================================
// OPTIONS - Return allowed methods
// =============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': ALLOWED_METHODS.join(', '),
      'Access-Control-Allow-Methods': ALLOWED_METHODS.join(', '),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}