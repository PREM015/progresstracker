// src/app/api/custom-platforms/route.ts
/**
 * Custom Platforms API Routes
 * 
 * GET    /api/custom-platforms     - List all custom platforms (paginated)
 * POST   /api/custom-platforms     - Create new custom platform
 * HEAD   /api/custom-platforms     - Check if user has custom platforms
 * OPTIONS /api/custom-platforms    - Get allowed methods
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { PlatformCategory } from '@prisma/client';

import { authOptions } from '@/lib/auth';
import { prisma, buildPaginationResponse } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  ApiError,
  UnauthorizedError,
  ValidationError,
  ConflictError,
  toApiError,
} from '@/lib/apiError';
import { rateLimiters, checkRateLimit } from '@/lib/rateLimiter';
import { auditLogService } from '@/services/auditLogService';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/custom-platforms' });

const MAX_CUSTOM_PLATFORMS_FREE = 5;
const MAX_CUSTOM_PLATFORMS_PRO = 50;

const ALLOWED_METHODS = ['GET', 'POST', 'HEAD', 'OPTIONS'];

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Query parameters schema for GET
 */
const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.nativeEnum(PlatformCategory).optional(),
  search: z.string().max(100).optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'category']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * Create platform schema for POST
 */
const createSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Name can only contain letters, numbers, spaces, hyphens, and underscores'),
  displayName: z
    .string()
    .max(100, 'Display name must be less than 100 characters')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  category: z.nativeEnum(PlatformCategory, {
    errorMap: () => ({ message: 'Invalid category' }),
  }),
  icon: z
    .string()
    .max(50, 'Icon must be less than 50 characters')
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)')
    .optional(),
  website: z
    .string()
    .url('Website must be a valid URL')
    .max(200, 'Website URL must be less than 200 characters')
    .optional(),
  trackingFields: z
    .record(
      z.string(),
      z.object({
        type: z.enum(['number', 'text', 'boolean', 'date', 'select']),
        label: z.string().max(50).optional(),
        required: z.boolean().optional(),
        options: z.array(z.string()).optional(), // For select type
        min: z.number().optional(), // For number type
        max: z.number().optional(), // For number type
      })
    )
    .optional(),
});

type CreatePlatformInput = z.infer<typeof createSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get request context (IP, User Agent, Request ID)
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
 * Create standard error response
 */
function errorResponse(error: unknown, requestId: string): NextResponse {
  const apiError = toApiError(error, requestId);
  
  // Log error (rate-limited by logger)
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
      headers: {
        'X-Request-ID': requestId,
      },
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
 * Check user's platform limit based on subscription
 */
async function checkPlatformLimit(userId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const [subscription, currentCount] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId },
      select: { tier: true, platformLimit: true },
    }),
    prisma.customPlatform.count({
      where: { userId, isActive: true },
    }),
  ]);

  const limit = subscription?.platformLimit 
    || (subscription?.tier === 'PRO' || subscription?.tier === 'TEAM' || subscription?.tier === 'ENTERPRISE'
      ? MAX_CUSTOM_PLATFORMS_PRO 
      : MAX_CUSTOM_PLATFORMS_FREE);

  return {
    allowed: currentCount < limit,
    current: currentCount,
    limit,
  };
}

// =============================================================================
// GET - List Custom Platforms
// =============================================================================

export async function GET(req: NextRequest) {
  const { requestId, ip } = getRequestContext(req);
  const startTime = Date.now();

  try {

    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }
    if(ip === 'unknown') {
      log.warn('Could not determine IP address of the requester', { userId: session.user.id });
    }

    const userId = session.user.id;

    // 2. Rate limiting
    const rateLimitResult = await checkRateLimit(`custom-platforms:list:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 60,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Remaining': '0',
            'X-Request-ID': requestId,
          },
        }
      );
    }

    // 3. Parse and validate query parameters
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const validatedQuery = querySchema.safeParse(searchParams);

    if (!validatedQuery.success) {
      throw new ValidationError(
        'Invalid query parameters',
        validatedQuery.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const { page, limit, category, search, isActive, sortBy, sortOrder } = validatedQuery.data;

    // 4. Build query
    const where: Record<string, unknown> = { userId };

    if (category) {
      where.category = category;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 5. Execute query with pagination
    const [platforms, total] = await Promise.all([
      prisma.customPlatform.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
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
          _count: {
            select: { trackerEntries: true },
          },
        },
      }),
      prisma.customPlatform.count({ where }),
    ]);

    // 6. Format response
    const formattedPlatforms = platforms.map((p) => ({
      ...p,
      entriesCount: p._count.trackerEntries,
      _count: undefined,
    }));

    const response = buildPaginationResponse(formattedPlatforms, total, page, limit);

    const duration = Date.now() - startTime;
    log.info('Custom platforms listed', { userId, total, duration });

    return successResponse(response, 200, {
      'X-Request-ID': requestId,
      'X-Response-Time': `${duration}ms`,
      'X-RateLimit-Remaining': String(rateLimitResult.remaining),
    });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// POST - Create Custom Platform
// =============================================================================

export async function POST(req: NextRequest) {
  const { requestId, ip, userAgent } = getRequestContext(req);
  const startTime = Date.now();

  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // 2. Rate limiting (stricter for creation)
    const rateLimitResult = await checkRateLimit(`custom-platforms:create:${userId}`, rateLimiters.sync);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many platform creation requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 3600,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': '3600',
            'X-Request-ID': requestId,
          },
        }
      );
    }

    // 3. Check platform limit
    const limitCheck = await checkPlatformLimit(userId);
    if (!limitCheck.allowed) {
      throw new ApiError(
        `You have reached your limit of ${limitCheck.limit} custom platforms. Upgrade your plan to create more.`,
        403,
        'SUBSCRIPTION_REQUIRED',
        [{ 
          field: 'subscription',
          value: { current: limitCheck.current, limit: limitCheck.limit },
        }]
      );
    }

    // 4. Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON in request body');
    }

    const validatedData = createSchema.safeParse(body);
    if (!validatedData.success) {
      throw new ValidationError(
        'Validation failed',
        validatedData.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const data: CreatePlatformInput = validatedData.data;

    // 5. Check for duplicate name (case-insensitive)
    const existing = await prisma.customPlatform.findFirst({
      where: {
        userId,
        name: { equals: data.name, mode: 'insensitive' },
      },
      select: { id: true, name: true },
    });

    if (existing) {
      throw new ConflictError(
        `A custom platform with the name "${data.name}" already exists`,
        [{ field: 'name', value: data.name }]
      );
    }

    // 6. Create platform
    const platform = await prisma.customPlatform.create({
      data: {
        userId,
        name: data.name.trim(),
        displayName: data.displayName?.trim() || data.name.trim(),
        description: data.description?.trim(),
        category: data.category,
        icon: data.icon,
        color: data.color,
        website: data.website,
        trackingFields: data.trackingFields || {},
        isActive: true,
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

    // 7. Create audit log
    await auditLogService.create({
      userId,
      action: 'CREATE',
      category: 'custom-platform',
      entityType: 'CustomPlatform',
      entityId: platform.id,
      description: `Created custom platform: ${platform.name}`,
      newValue: platform as Record<string, unknown>,
      ipAddress: ip,
      userAgent,
      requestId,
      status: 'success',
    });

    const duration = Date.now() - startTime;
    log.info('Custom platform created', { 
      platformId: platform.id, 
      userId, 
      name: platform.name,
      duration,
    });

    return successResponse(
      {
        platform,
        remaining: limitCheck.limit - limitCheck.current - 1,
        limit: limitCheck.limit,
      },
      201,
      {
        'X-Request-ID': requestId,
        'X-Response-Time': `${duration}ms`,
        'Location': `/api/custom-platforms/${platform.id}`,
      }
    );

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// HEAD - Check if user has custom platforms
// =============================================================================

export async function HEAD(req: NextRequest) {
  const { requestId } = getRequestContext(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(null, { 
        status: 401,
        headers: { 'X-Request-ID': requestId },
      });
    }

    const count = await prisma.customPlatform.count({
      where: { userId: session.user.id, isActive: true },
    });

    return new NextResponse(null, {
      status: count > 0 ? 200 : 204,
      headers: {
        'X-Request-ID': requestId,
        'X-Total-Count': String(count),
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