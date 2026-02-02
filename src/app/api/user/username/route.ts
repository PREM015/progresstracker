// src/app/api/user/username/route.ts
// =============================================================================
// USERNAME MANAGEMENT ROUTES
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

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;
const RESERVED_USERNAMES = [
  'admin', 'api', 'www', 'mail', 'support', 'help', 'about',
  'privacy', 'terms', 'settings', 'profile', 'user', 'users',
  'dashboard', 'login', 'logout', 'signup', 'register', 'auth',
  'null', 'undefined', 'system', 'root', 'administrator',
  'moderator', 'mod', 'staff', 'team', 'official', 'verified',
];

const RATE_LIMIT = 30;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// =============================================================================
// SCHEMAS
// =============================================================================

const usernameSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be 30 characters or less')
    .regex(USERNAME_REGEX, 'Username can only contain letters, numbers, underscores, and hyphens')
    .transform((val) => val.toLowerCase()),
});

const generateSchema = z.object({
  base: z.string().min(2, 'Base name must be at least 2 characters').max(20),
});

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(response: NextResponse, requestId: string): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);
  return response;
}

async function validateSession(request: NextRequest, requestId: string, requireAuth = true) {
  const ip = getClientIp(request);
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, ip);

  if (!rateLimitResult.success) {
    return { error: apiResponse.rateLimited(60, requestId), session: null, rateLimitResult };
  }

  if (requireAuth) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { error: apiResponse.unauthorized('Authentication required', requestId), session: null, rateLimitResult };
    }

    return { error: null, session, rateLimitResult };
  }

  return { error: null, session: null, rateLimitResult };
}

function validateUsername(username: string): { valid: boolean; reason?: string } {
  if (!username) {
    return { valid: false, reason: 'Username is required' };
  }

  if (username.length < 3) {
    return { valid: false, reason: 'Username must be at least 3 characters' };
  }

  if (username.length > 30) {
    return { valid: false, reason: 'Username must be 30 characters or less' };
  }

  if (!USERNAME_REGEX.test(username)) {
    return {
      valid: false,
      reason: 'Username can only contain letters, numbers, underscores, and hyphens',
    };
  }

  if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
    return { valid: false, reason: 'This username is reserved' };
  }

  return { valid: true };
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// =============================================================================
// HEAD
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.info('request is ', { request })
      return addHeaders(new NextResponse(null, { status: 401 }), requestId);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true },
    });

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Has-Username': user?.username ? 'true' : 'false',
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD username failed', { requestId }, error);
    return addHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// GET - Check username availability
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, rateLimitResult } = await validateSession(request, requestId, false);
    if (error) return addHeaders(error, requestId);

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return addHeaders(
        apiResponse.validationError('Username is required', undefined, requestId),
        requestId
      );
    }

    const validation = validateUsername(username);
    if (!validation.valid) {
      const response = apiResponse.success(
        {
          available: false,
          reason: validation.reason,
        },
        { meta: { requestId } }
      );
      return addHeaders(response, requestId);
    }

    // Check if username is taken
    const existingUser = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });

    logger.debug('Username availability checked', {
      username,
      available: !existingUser,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        available: !existingUser,
        reason: existingUser ? 'Username is already taken' : null,
      },
      {
        meta: { requestId },
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('GET username failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to check username', requestId), requestId);
  }
}

// =============================================================================
// PUT - Update username
// =============================================================================

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId);

    const userId = session!.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(apiResponse.validationError('Invalid JSON', undefined, requestId), requestId);
    }

    const validation = usernameSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId
      );
    }

    const { username } = validation.data;

    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return addHeaders(
        apiResponse.validationError(usernameValidation.reason!, undefined, requestId),
        requestId
      );
    }

    // Check if username is taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        username,
        NOT: { id: userId },
      },
    });

    if (existingUser) {
      return addHeaders(
        apiResponse.validationError('Username is already taken', undefined, requestId),
        requestId
      );
    }

    // Get current username for audit log
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    // Update username
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        updatedAt: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        category: 'user',
        entityType: 'username',
        entityId: userId,
        description: 'Username changed',
        oldValue: { username: currentUser?.username },
        newValue: { username },
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent'),
      },
    });

    logger.info('Username updated', {
      userId,
      oldUsername: currentUser?.username,
      newUsername: username,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(updatedUser, {
      meta: { requestId },
      message: 'Username updated successfully',
      headers: {
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('PUT username failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update username', requestId), requestId);
  }
}

// =============================================================================
// POST - Generate username suggestions
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, rateLimitResult } = await validateSession(request, requestId, false);
    if (error) return addHeaders(error, requestId);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(apiResponse.validationError('Invalid JSON', undefined, requestId), requestId);
    }

    const validation = generateSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId
      );
    }

    const { base } = validation.data;

    // Clean base name
    const cleanBase = base.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);

    if (cleanBase.length < 2) {
      return addHeaders(
        apiResponse.validationError('Base name too short after cleaning', undefined, requestId),
        requestId
      );
    }

    // Generate suggestions
    const suggestions: string[] = [];
    const variations = [
      cleanBase,
      `${cleanBase}_dev`,
      `${cleanBase}${Math.floor(Math.random() * 1000)}`,
      `the_${cleanBase}`,
      `${cleanBase}_codes`,
      `${cleanBase}${new Date().getFullYear() % 100}`,
      `${cleanBase}_io`,
      `${cleanBase}hq`,
    ];

    for (const variation of variations) {
      if (suggestions.length >= 5) break;

      if (!USERNAME_REGEX.test(variation)) continue;
      if (RESERVED_USERNAMES.includes(variation)) continue;

      const exists = await prisma.user.findUnique({
        where: { username: variation },
        select: { id: true },
      });

      if (!exists) {
        suggestions.push(variation);
      }
    }

    // If we don't have enough, generate random ones
    let attempts = 0;
    while (suggestions.length < 5 && attempts < 10) {
      const random = `${cleanBase}${Math.floor(Math.random() * 10000)}`;
      if (!suggestions.includes(random) && USERNAME_REGEX.test(random)) {
        const exists = await prisma.user.findUnique({
          where: { username: random },
          select: { id: true },
        });
        if (!exists) {
          suggestions.push(random);
        }
      }
      attempts++;
    }

    logger.debug('Username suggestions generated', {
      base: cleanBase,
      count: suggestions.length,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      { suggestions },
      {
        meta: { requestId },
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('POST username suggestions failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to generate suggestions', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';