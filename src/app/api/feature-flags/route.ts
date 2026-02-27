/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// =============================================================================
// api/feature-flags/route.ts
// =============================================================================
// Description: Get public feature flags
// Methods: GET, OPTIONS, HEAD
// Auth Required: Optional (returns different data based on auth)
// Rate Limit: 100 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { featureFlags } from '@/lib/featureFlags';
import { SubscriptionTier } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 100;
const CACHE_TTL = 300; // 5 minutes

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  includeMetadata: z.coerce.boolean().optional().default(false),
  category: z.string().optional(),
  enabled: z.coerce.boolean().optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         request.headers.get('x-real-ip') || 
         'unknown';
}

function addHeaders(
  response: NextResponse, 
  requestId: string, 
  rateLimitResult?: { limit: number; remaining: number; reset: number }
): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  response.headers.set('X-Request-ID', requestId);
  
  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.reset).toISOString());
  }
  
  return response;
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
export async function HEAD(): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const count = await prisma.featureFlag.count({
      where: { isEnabled: true }
    });
    
    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Count', String(count));
    response.headers.set('X-Resource-Type', 'feature-flags');
    
    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * GET - Get feature flags (public or user-specific)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitKey = `feature-flags:${ip}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId), 
        requestId, 
        rateLimitResult
      );
    }

    // Get session (optional)
    const session = await getServerSession(authOptions);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      includeMetadata: searchParams.get('includeMetadata'),
      category: searchParams.get('category'),
      enabled: searchParams.get('enabled'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError(
          'Invalid query parameters', 
          queryValidation.error.errors, 
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    const { includeMetadata, category, enabled } = queryValidation.data;

    // Build where clause
    const where: any = {};
    
    if (typeof enabled === 'boolean') {
      where.isEnabled = enabled;
    }

    // Get user details if authenticated
    let userTier: SubscriptionTier = SubscriptionTier.FREE;
    if (session?.user?.id) {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: session.user.id },
        select: { tier: true }
      });
      if (subscription) {
        userTier = subscription.tier;
      }
    }

    // Fetch feature flags
    const flags = await prisma.featureFlag.findMany({
      where,
      select: {
        key: true,
        name: true,
        description: true,
        isEnabled: true,
        enabledForAll: true,
        enabledUserIds: session?.user?.id ? true : false,
        enabledTiers: true,
        enabledPercentage: true,
        metadata: includeMetadata,
      },
      orderBy: { key: 'asc' }
    });

    // Process flags based on user context
    const processedFlags = await Promise.all(
      flags.map(async (flag) => {
        const isEnabledForUser = session?.user?.id 
          ? await featureFlags.isEnabled(flag.key, {
              userId: session.user.id,
              tier: userTier,
              isAdmin: session.user.isAdmin
            })
          : flag.enabledForAll && flag.isEnabled;

        return {
          key: flag.key,
          name: flag.name,
          description: flag.description,
          enabled: isEnabledForUser,
          ...(includeMetadata && flag.metadata ? { metadata: flag.metadata } : {})
        };
      })
    );

    // Filter by category if specified (assuming metadata contains category)
    const filteredFlags = category
      ? processedFlags.filter(flag => 
          flag.metadata && 
          typeof flag.metadata === 'object' && 
          'category' in flag.metadata &&
          flag.metadata.category === category
        )
      : processedFlags;

    logger.info('GET feature-flags completed', {
      userId: session?.user?.id,
      count: filteredFlags.length,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      filteredFlags,
      {
        meta: { 
          requestId,
          total: filteredFlags.length,
          authenticated: !!session,
          userTier: session ? userTier : null
        }
      }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET feature-flags failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch feature flags', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';