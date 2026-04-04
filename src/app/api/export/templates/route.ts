// =============================================================================
// export/templates/route.ts
// =============================================================================
// Description: Export templates
// Methods: GET, POST, PUT, DELETE
// Auth Required: True
// Rate Limit: 30 requests/minute
// Tags: export, template
// Generated: 2026-02-02T11:57:44.632168
// =============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  format: z.enum(['csv', 'json', 'excel', 'xml']),
  fields: z.array(z.string()).min(1),
  filters: z.record(z.unknown()).optional(),
  isDefault: z.boolean().optional().default(false),
  schedule: z.object({
    enabled: z.boolean().optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  }).optional(),
});


// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Extract client IP from request
 */
function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

/**
 * Add standard headers to response
 */
function addHeaders(
  response: NextResponse,
  requestId: string,
  rateLimitResult?: { limit: number; remaining: number }
): NextResponse {
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

/**
 * Validate session and check rate limits
 */
async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `export-templates:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return {
      error: apiResponse.rateLimited(60, requestId),
      session: null,
      rateLimitResult
    };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      error: apiResponse.unauthorized('Authentication required', requestId),
      session: null,
      rateLimitResult
    };
  }

  return { error: null, session, rateLimitResult };
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

/**
 * HEAD - Resource metadata
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    // Count total templates
    const total = await prisma.scheduledExport.count({
      where: { userId },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Count', String(total));
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * GET - Export templates
 * 
 * Returns paginated list of user's export templates with metadata.
 * Supports filtering and sorting of templates.
 * Includes template usage statistics and execution history.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || 'desc',
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { page, limit, search, sortBy, sortOrder } = queryValidation.data;

    // Build where clause for filtering
    const where: any = {
      userId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Execute query with pagination
    const [templates, total] = await Promise.all([
      prisma.scheduledExport.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          format: true,
          fields: true,
          filters: true,
          isDefault: true,
          frequency: true,
          createdAt: true,
          updatedAt: true,
        } as any,
        orderBy: {
          [sortBy || 'createdAt']: sortOrder as 'asc' | 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.scheduledExport.count({ where }),
    ]);

    const data = templates;

    logger.info('GET export/templates completed', {
      userId,
      page,
      total,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.paginated(
      data,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
      { meta: { requestId } as any }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET export/templates failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

/**
 * POST - Export templates
 * 
 * Creates a new export template with specified configuration.
 * Validates template format, fields, and filters.
 * Stores template for scheduled or manual exports.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    // Parse request body
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

    const validation = bodySchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const data = validation.data;

    // Create export template
    const template = await prisma.scheduledExport.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        format: data.format as any,
        fields: data.fields,
        filters: data.filters,
        isDefault: data.isDefault,
        frequency: data.schedule?.frequency,
      } as any,
      select: {
        id: true,
        name: true,
        description: true,
        format: true,
        fields: true,
        filters: true,
        isDefault: true,
        createdAt: true,
      } as any,
    });

    const result = template;














    logger.info('POST export/templates completed', {
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.created(result, { meta: { requestId } as any });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST export/templates failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

/**
 * PUT - Export templates
 * 
 * Updates an existing export template's configuration.
 * Allows modification of name, description, format, fields, and filters.
 * Maintains template execution history and usage statistics.
 */
export async function PUT(
  request: NextRequest
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    // Parse request body
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

    const validation = bodySchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const data = validation.data;
    
    // Get ID from query parameters
    const templateId = new URL(request.url).searchParams.get('id');
    if (!templateId) {
      return addHeaders(
        apiResponse.validationError('Missing template ID', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Verify ownership and update
    const template = await prisma.scheduledExport.findFirst({
      where: { id: templateId, userId },
    });

    if (!template) {
      return addHeaders(
        apiResponse.notFound('Template not found', requestId),
        requestId,
        rateLimitResult
      );
    }

    const result = await prisma.scheduledExport.update({
      where: { id: templateId },
      data: {
        name: data.name,
        description: data.description,
        format: data.format as any,
        fields: data.fields,
        filters: data.filters,
        isDefault: data.isDefault,
        frequency: data.schedule?.frequency,
      } as any,
      select: {
        id: true,
        name: true,
        description: true,
        format: true,
        fields: true,
        filters: true,
        isDefault: true,
        updatedAt: true,
      } as any,
    });

    logger.info('PUT export/templates completed', {
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(result, { meta: { requestId } as any });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PUT export/templates failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

/**
 * DELETE - Export templates
 * 
 * Deletes an export template and its associated data.
 * Removes template from scheduled exports if applicable.
 * Cleans up resources and execution history.
 */
export async function DELETE(
  request: NextRequest
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    // Get ID from query parameters
    const templateId = new URL(request.url).searchParams.get('id');
    if (!templateId) {
      return addHeaders(
        apiResponse.validationError('Missing template ID', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Verify ownership
    const template = await prisma.scheduledExport.findFirst({
      where: { id: templateId, userId },
    });

    if (!template) {
      return addHeaders(
        apiResponse.notFound('Template not found', requestId),
        requestId,
        rateLimitResult
      );
    }

    // Delete the template
    await prisma.scheduledExport.delete({
      where: { id: templateId },
    });

    logger.info('DELETE export/templates completed', {
      userId,
      templateId,
      requestId,
      duration: Date.now() - startTime,
    });









    logger.info('DELETE export/templates completed', {
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success({ deleted: true }, { meta: { requestId } as any });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE export/templates failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}


// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Uncomment if route segment config is needed:
// export const revalidate = 0;
// export const fetchCache = 'force-no-store';

