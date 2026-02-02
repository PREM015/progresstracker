// src/app/api/user/profile/route.ts
// =============================================================================
// USER PROFILE ROUTES - Public Profile Access
// =============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { UserService } from '@/services/userService';


import { updateProfileSchema, UpdateProfileInput } from '@/lib/validators';
// =============================================================================
// CONSTANTS & HEADERS
// =============================================================================

const RATE_LIMIT = 100;



export async function getSessionUserId(request: NextRequest, requestId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    logger.info("request comes from ${requestId} for {request}", { requestId, request })
    const error: any = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }
  return session.user.id;
}
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=300',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': "default-src 'self'",
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'geolocation=(), microphone=()',

};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, PUT, PATCH, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

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
    'unknown'
  );
}

function addHeaders(response: NextResponse, requestId: string): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);
  return response;
}

export function handleConditionalGet(request: NextRequest, userId: string, updatedAt: Date) {
  const ifNoneMatch = request.headers.get('if-none-match');
  const etag = `"profile-${userId}-${updatedAt.getTime()}"`;

  if (ifNoneMatch === etag) {
    return { status: 304, etag };
  }

  return { status: 200, etag };
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

// =============================================================================
// HEAD
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.info("request ", { request })
      return addHeaders(new NextResponse(null, { status: 401 }), requestId);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, updatedAt: true },
    });

    if (!user) {
      return addHeaders(new NextResponse(null, { status: 404 }), requestId);
    }

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'Last-Modified': user.updatedAt.toUTCString(),
        'ETag': `"profile-${user.id}-${user.updatedAt.getTime()}"`,
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD profile failed', { requestId }, error);
    return addHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// GET - Get current user's profile
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, ip);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId);
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId);
    }

    const profile = await UserService.getUserProfile(session.user.id);

    if (!profile) {
      return addHeaders(apiResponse.notFound('Profile', requestId), requestId);
    }

    logger.info('Profile fetched', {
      userId: session.user.id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(profile, {
      meta: { requestId },
      headers: {
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('GET profile failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch profile', requestId), requestId);
  }
}

// =============================================================================
// PUT - Update full profile
// =============================================================================

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, ip);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId);
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(apiResponse.validationError('Invalid JSON', undefined, requestId), requestId);
    }

    const updatedProfile = await UserService.updateProfile(session.user.id, body as Record<string, unknown>);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        category: 'user',
        entityType: 'profile',
        entityId: session.user.id,
        description: 'Profile updated via PUT',
        ipAddress: ip,
        userAgent: request.headers.get('user-agent'),
      },
    });

    logger.info('Profile updated', {
      userId: session.user.id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(updatedProfile, {
      meta: { requestId },
      message: 'Profile updated successfully',
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('PUT profile failed', { requestId }, error);

    if (error instanceof Error) {
      if (error.message.includes('already')) {
        return addHeaders(
          apiResponse.validationError(error.message, undefined, requestId),
          requestId
        );
      }
    }

    return addHeaders(apiResponse.internalError('Failed to update profile', requestId), requestId);
  }
}

// =============================================================================
// PATCH - Partial profile update
// =============================================================================

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();










  try {
    // 1️⃣ Get request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(apiResponse.validationError('Invalid JSON', undefined, requestId), requestId);
    }

    // 2️⃣ Validate body
    const parsedBody: UpdateProfileInput = updateProfileSchema.parse(body);

    // 3️⃣ Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId);
    }

    // 4️⃣ Rate limit check
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, ip);
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId);
    }

    // 5️⃣ Partial update using Prisma
    const updatedProfile = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...parsedBody,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        bio: true,
        image: true,
        updatedAt: true,
      },
    });

    // 6️⃣ Logging
    logger.info('Profile patched', {
      userId: session.user.id,
      requestId,
      duration: Date.now() - startTime,
      fields: Object.keys(parsedBody),
    });

    // 7️⃣ ✅ Final response
    return addHeaders(
      apiResponse.success(updatedProfile, { meta: { requestId } }),
      requestId
    );

  } catch (error) {
    logger.error('PATCH profile failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update profile', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
