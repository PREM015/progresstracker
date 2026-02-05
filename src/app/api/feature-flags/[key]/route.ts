// =============================================================================
// api/feature-flags/[key]/route.ts
// =============================================================================
// Description: Get specific feature flag details
// Methods: GET, OPTIONS
// Auth Required: Optional
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

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const paramsSchema = z.object({
  key: z.string().min(1).max(100)
});

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Validate params
    const validation = paramsSchema.safeParse(params);
    if (!validation.success) {
      return apiResponse.validationError(
        'Invalid feature key',
        validation.error.errors,
        requestId
      );
    }

    const { key } = validation.data;

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimitResult = await checkLimit(
      apiRateLimiter,
      100,
      `feature-flag:${ip}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Get session (optional)
    const session = await getServerSession(authOptions);

    // Fetch feature flag
    const flag = await prisma.featureFlag.findUnique({
      where: { key }
    });

    if (!flag) {
      return apiResponse.notFound('Feature flag', requestId);
    }

    // Check if enabled for user
    let isEnabledForUser = false;
    let enablementReason = 'not_enabled';

    if (session?.user?.id) {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: session.user.id },
        select: { tier: true }
      });

      const context = {
        userId: session.user.id,
        tier: subscription?.tier,
        isAdmin: session.user.isAdmin
      };

      isEnabledForUser = await featureFlags.isEnabled(key, context);

      if (isEnabledForUser) {
        if (flag.enabledForAll) {
          enablementReason = 'enabled_for_all';
        } else if (flag.enabledUserIds.includes(session.user.id)) {
          enablementReason = 'user_specific';
        } else if (subscription?.tier && flag.enabledTiers.includes(subscription.tier)) {
          enablementReason = 'tier_access';
        } else if (session.user.isAdmin) {
          enablementReason = 'admin_access';
        } else {
          enablementReason = 'percentage_rollout';
        }
      }
    } else {
      isEnabledForUser = flag.enabledForAll && flag.isEnabled;
      if (isEnabledForUser) {
        enablementReason = 'public_access';
      }
    }

    const response = {
      key: flag.key,
      name: flag.name,
      description: flag.description,
      isEnabled: flag.isEnabled,
      isEnabledForUser,
      enablementReason,
      ...(session?.user?.isAdmin ? {
        // Admin gets full details
        enabledForAll: flag.enabledForAll,
        enabledUserIds: flag.enabledUserIds.length,
        enabledTiers: flag.enabledTiers,
        enabledPercentage: flag.enabledPercentage,
        metadata: flag.metadata,
        createdAt: flag.createdAt,
        updatedAt: flag.updatedAt
      } : {})
    };

    logger.info('Feature flag fetched', {
      requestId,
      key,
      userId: session?.user?.id,
      duration: Date.now() - startTime
    });

    return apiResponse.success(response, {
      meta: { requestId }
    });
  } catch (error) {
    logger.error('GET feature-flags/[key] failed', { requestId, key: params.key }, error);
    return apiResponse.internalError('Failed to fetch feature flag', requestId);
  }
}

export const dynamic = 'force-dynamic';