// =============================================================================
// api/feature-flags/check/route.ts
// =============================================================================
// Description: Check if specific features are enabled for user
// Methods: POST, OPTIONS
// Auth Required: Optional
// Rate Limit: 200 requests/minute
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

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const checkSchema = z.object({
  keys: z.array(z.string()).min(1).max(50),
  context: z.object({
    userId: z.string().optional(),
    tier: z.enum(['FREE', 'STARTER', 'PRO', 'TEAM', 'ENTERPRISE']).optional(),
    email: z.string().email().optional(),
  }).optional()
});

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimitResult = await checkLimit(apiRateLimiter, 200, `feature-check:${ip}`);

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Parse body
    const body = await request.json();
    const validation = checkSchema.safeParse(body);

    if (!validation.success) {
      return apiResponse.validationError(
        'Invalid request body',
        validation.error.errors,
        requestId
      );
    }

    const { keys, context } = validation.data;

    // Get session
    const session = await getServerSession(authOptions);

    // Determine user context
    const userContext = context || {};
    if (session?.user?.id && !userContext.userId) {
      userContext.userId = session.user.id;
      
      // Get user's subscription tier
      const subscription = await prisma.subscription.findUnique({
        where: { userId: session.user.id },
        select: { tier: true }
      });
      
      if (subscription) {
        userContext.tier = subscription.tier;
      }
    }

    // Check each feature flag
    const results: Record<string, boolean> = {};
    
    for (const key of keys) {
      results[key] = await featureFlags.isEnabled(key, {
        userId: userContext.userId,
        tier: userContext.tier,
        email: userContext.email,
        isAdmin: session?.user?.isAdmin
      });
    }

    logger.info('Feature flags checked', {
      requestId,
      userId: userContext.userId,
      keys,
      duration: Date.now() - startTime
    });

    return apiResponse.success(results, {
      meta: { requestId }
    });
  } catch (error) {
    logger.error('POST feature-flags/check failed', { requestId }, error);
    return apiResponse.internalError('Failed to check feature flags', requestId);
  }
}

export const dynamic = 'force-dynamic';