// src/app/api/custom-platforms/[id]/entries/route.ts
/**
 * Custom Platform Entries Routes
 * 
 * GET  /api/custom-platforms/[id]/entries - Get all entries for platform
 * POST /api/custom-platforms/[id]/entries - Create entry for platform
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

import { authOptions } from '@/lib/auth';
import { prisma, buildPaginationResponse } from '@/lib/prisma';
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

const log = logger.child({ route: 'api/custom-platforms/[id]/entries' });

const ALLOWED_METHODS = ['GET', 'POST', 'OPTIONS'];

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const idSchema = z.string().cuid({ message: 'Invalid platform ID format' });

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  sortBy: z.enum(['date', 'problemsSolved', 'timeSpent', 'createdAt']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const createEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  problemsSolved: z.number().int().min(0).max(10000).default(0),
  problemsAttempted: z.number().int().min(0).max(10000).default(0),
  easyProblems: z.number().int().min(0).max(10000).default(0),
  mediumProblems: z.number().int().min(0).max(10000).default(0),
  hardProblems: z.number().int().min(0).max(10000).default(0),
  timeSpent: z.number().int().min(0).max(1440).default(0), // Max 24 hours in minutes
  commits: z.number().int().min(0).max(1000).default(0),
  notes: z.string().max(1000).optional(),
  mood: z.enum(['great', 'good', 'neutral', 'bad', 'terrible']).optional(),
  energyLevel: z.number().int().min(1).max(5).optional(),
  productivityRating: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string().max(50)).max(10).default([]),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

// =============================================================================
// TYPES
// =============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getRequestContext(req: NextRequest) {
  return {
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
    requestId: req.headers.get('x-request-id') || crypto.randomUUID(),
  };
}

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

async function validatePlatformOwnership(platformId: string, userId: string) {
  const platform = await prisma.customPlatform.findFirst({
    where: { id: platformId, userId },
    select: { 
      id: true, 
      name: true, 
      category: true,
      isActive: true,
      trackingFields: true,
    },
  });

  if (!platform) {
    throw new NotFoundError('Custom platform');
  }

  if (!platform.isActive) {
    throw new ForbiddenError('Cannot add entries to deactivated platform');
  }

  return platform;
}

// =============================================================================
// GET - Get Platform Entries
// =============================================================================

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { requestId } = getRequestContext(req);
  const startTime = Date.now();

  try {
    // 1. Validate ID
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
    const rateLimitResult = await checkRateLimit(`custom-platforms:entries:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429, headers: { 'Retry-After': '60', 'X-Request-ID': requestId } }
      );
    }

    // 4. Check platform ownership
    const platform = await prisma.customPlatform.findFirst({
      where: { id: validatedId.data, userId },
      select: { id: true, name: true },
    });

    if (!platform) {
      throw new NotFoundError('Custom platform');
    }

    // 5. Validate query params
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

    const { page, limit, startDate, endDate, sortBy, sortOrder } = validatedQuery.data;

    // 6. Build query
    const where: Prisma.TrackerEntryWhereInput = {
      customPlatformId: validatedId.data,
      userId,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    // 7. Execute query
    const [entries, total] = await Promise.all([
      prisma.trackerEntry.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          date: true,
          problemsSolved: true,
          problemsAttempted: true,
          easyProblems: true,
          mediumProblems: true,
          hardProblems: true,
          timeSpent: true,
          commits: true,
          notes: true,
          mood: true,
          energyLevel: true,
          productivityRating: true,
          tags: true,
          customFields: true,
          source: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.trackerEntry.count({ where }),
    ]);

    const response = buildPaginationResponse(entries, total, page, limit);

    const duration = Date.now() - startTime;
    log.info('Platform entries fetched', { 
      platformId: validatedId.data, 
      userId, 
      total,
      duration,
    });

    return successResponse(
      {
        platform: { id: platform.id, name: platform.name },
        ...response,
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
// POST - Create Entry for Platform
// =============================================================================

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { requestId, ip, userAgent } = getRequestContext(req);
  const startTime = Date.now();

  try {
    // 1. Validate ID
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
    const rateLimitResult = await checkRateLimit(`custom-platforms:entries:create:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429, headers: { 'Retry-After': '60', 'X-Request-ID': requestId } }
      );
    }

    // 4. Check platform ownership
    const platform = await validatePlatformOwnership(validatedId.data, userId);

    // 5. Parse and validate body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON in request body');
    }

    const validatedData = createEntrySchema.safeParse(body);
    if (!validatedData.success) {
      throw new ValidationError(
        'Validation failed',
        validatedData.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const data = validatedData.data;
    const entryDate = new Date(data.date);

    // 6. Validate custom fields against platform's tracking fields
    if (data.customFields && platform.trackingFields) {
      const allowedFields = Object.keys(platform.trackingFields as Record<string, unknown>);
      const providedFields = Object.keys(data.customFields);
      const invalidFields = providedFields.filter(f => !allowedFields.includes(f));
      
      if (invalidFields.length > 0) {
        throw new ValidationError(
          'Invalid custom fields',
          invalidFields.map(f => ({ field: `customFields.${f}`, message: 'Field not defined in platform tracking fields' }))
        );
      }
    }

    // 7. Check for duplicate entry on same date
    const existingEntry = await prisma.trackerEntry.findFirst({
      where: {
        userId,
        customPlatformId: validatedId.data,
        date: entryDate,
      },
      select: { id: true },
    });

    if (existingEntry) {
      throw new ConflictError(
        `An entry already exists for ${data.date} on this platform`,
        [{ field: 'date', value: data.date }]
      );
    }

    // 8. Create entry
    const entry = await prisma.trackerEntry.create({
      data: {
        userId,
        customPlatformId: validatedId.data,
        date: entryDate,
        category: platform.category,
        problemsSolved: data.problemsSolved,
        problemsAttempted: data.problemsAttempted,
        easyProblems: data.easyProblems,
        mediumProblems: data.mediumProblems,
        hardProblems: data.hardProblems,
        timeSpent: data.timeSpent,
        commits: data.commits,
        notes: data.notes,
        mood: data.mood,
        energyLevel: data.energyLevel,
        productivityRating: data.productivityRating,
        tags: data.tags,
        customFields: data.customFields as Prisma.InputJsonValue,
        source: 'manual',
      },
      select: {
        id: true,
        date: true,
        problemsSolved: true,
        problemsAttempted: true,
        easyProblems: true,
        mediumProblems: true,
        hardProblems: true,
        timeSpent: true,
        commits: true,
        notes: true,
        mood: true,
        energyLevel: true,
        productivityRating: true,
        tags: true,
        customFields: true,
        source: true,
        createdAt: true,
      },
    });

    // 9. Audit log
    await auditLogService.create({
      userId,
      action: 'CREATE',
      category: 'tracker-entry',
      entityType: 'TrackerEntry',
      entityId: entry.id,
      description: `Created entry for custom platform: ${platform.name} on ${data.date}`,
      newValue: entry as unknown as Record<string, unknown>,
      ipAddress: ip,
      userAgent,
      requestId,
      status: 'success',
    });

    const duration = Date.now() - startTime;
    log.info('Platform entry created', { 
      entryId: entry.id,
      platformId: validatedId.data, 
      userId, 
      date: data.date,
      duration,
    });

    return successResponse(
      {
        entry,
        platform: { id: platform.id, name: platform.name },
      },
      201,
      {
        'X-Request-ID': requestId,
        'X-Response-Time': `${duration}ms`,
        'Location': `/api/tracker/${entry.id}`,
      }
    );

  } catch (error) {
    return errorResponse(error, requestId);
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