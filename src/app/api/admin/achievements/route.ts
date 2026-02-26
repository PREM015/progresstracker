// src/app/api/admin/achievements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { PlatformCategory, Prisma, AuditAction } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 100;

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
// VALIDATION
// =============================================================================

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  category: z.nativeEnum(PlatformCategory).optional(),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum', 'diamond']).optional(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']).optional(),
  isActive: z.coerce.boolean().optional(),
  isHidden: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'sortOrder', 'totalUnlocked']).default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

const createSchema = z.object({
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-_]+$/),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(1000),
  category: z.nativeEnum(PlatformCategory),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum', 'diamond']).default('bronze'),
  icon: z.string().max(200).optional(),
  color: z.string().max(50).optional(),
  badgeImage: z.string().url().optional(),
  points: z.number().int().min(0).max(10000).default(0),
  xpReward: z.number().int().min(0).max(10000).default(0),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']).default('common'),
  requirement: z.record(z.unknown()).optional(),
  requirementText: z.string().max(500).optional(),
  thresholds: z.array(z.record(z.unknown())).optional(),
  isHidden: z.boolean().default(false),
  isSecret: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
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
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `admin-achievements:${ip}`);

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

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

// =============================================================================
// HEAD
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return new NextResponse(null, { status: 403 });
    }

    const [total, active, hidden] = await Promise.all([
      prisma.achievement.count(),
      prisma.achievement.count({ where: { isActive: true } }),
      prisma.achievement.count({ where: { isHidden: true } }),
    ]);

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Total-Count': String(total),
        'X-Active-Count': String(active),
        'X-Hidden-Count': String(hidden),
      },
    });

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD admin achievements failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - List achievements
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      tier: searchParams.get('tier') || undefined,
      rarity: searchParams.get('rarity') || undefined,
      isActive: searchParams.get('isActive') !== null ? searchParams.get('isActive') : undefined,
      isHidden: searchParams.get('isHidden') !== null ? searchParams.get('isHidden') : undefined,
      sortBy: searchParams.get('sortBy') || 'sortOrder',
      sortOrder: searchParams.get('sortOrder') || 'asc',
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { page, limit, search, category, tier, rarity, isActive, isHidden, sortBy, sortOrder } = queryValidation.data;

    const where: Prisma.AchievementWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) where.category = category;
    if (tier) where.tier = tier;
    if (rarity) where.rarity = rarity;
    if (isActive !== undefined) where.isActive = isActive;
    if (isHidden !== undefined) where.isHidden = isHidden;

    const [achievements, total] = await Promise.all([
      prisma.achievement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: { select: { users: true } },
        },
      }),
      prisma.achievement.count({ where }),
    ]);

    logger.info('Admin achievements fetched', {
      total,
      page,
      filters: { category, tier, rarity, isActive, isHidden },
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.paginated(
      achievements,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET admin achievements failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch achievements', requestId), requestId);
  }
}

// =============================================================================
// POST - Create achievement
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
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

    const validation = createSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const data = validation.data;

    // Check if slug exists
    const existing = await prisma.achievement.findUnique({ where: { slug: data.slug } });

    if (existing) {
      return addHeaders(
        apiResponse.validationError('Achievement with this slug already exists', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const achievement = await prisma.achievement.create({ data: data as any });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE' as AuditAction,
        category: 'admin',
        entityType: 'achievement',
        entityId: achievement.id,
        description: `Created achievement: ${achievement.title}`,
        newValue: achievement as unknown as Prisma.InputJsonValue,
        ipAddress: getClientIp(request),
        performedBy: userId,
      },
    });

    logger.info('Achievement created', {
      achievementId: achievement.id,
      slug: achievement.slug,
      adminId: userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.created(achievement, { requestId });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST admin achievement failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to create achievement', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';