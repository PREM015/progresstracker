// =============================================================================
// api/feature-flags/enabled/route.ts
// =============================================================================
// Description: Get all enabled features for current user
// Methods: GET, OPTIONS
// Auth Required: Yes
// Rate Limit: 100 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { featureFlags } from '@/lib/featureFlags';

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // Rate limiting
    const rateLimitResult = await checkLimit(
      apiRateLimiter, 
      100, 
      `enabled-features:${session.user.id}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Get user's subscription tier
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: { tier: true }
    });

    // Get all feature flags
    const allFlags = await prisma.featureFlag.findMany({
      where: { isEnabled: true },
      select: {
        key: true,
        name: true,
        description: true,
        enabledForAll: true,
        enabledUserIds: true,
        enabledTiers: true,
        enabledPercentage: true,
      }
    });

    // Check which features are enabled for this user
    const enabledFeatures: Array<{
      key: string;
      name: string;
      description: string | null;
      reason: string;
    }> = [];

    for (const flag of allFlags) {
      let isEnabled = false;
      let reason = '';

      // Check if enabled for all
      if (flag.enabledForAll) {
        isEnabled = true;
        reason = 'enabled_for_all';
      }
      // Check if user is specifically enabled
      else if (flag.enabledUserIds.includes(session.user.id)) {
        isEnabled = true;
        reason = 'user_specific';
      }
      // Check if tier is enabled
      else if (subscription?.tier && flag.enabledTiers.includes(subscription.tier)) {
        isEnabled = true;
        reason = 'tier_access';
      }
      // Check percentage rollout
      else if (flag.enabledPercentage > 0) {
        const hash = featureFlags['hashUserId'](session.user.id, flag.key);
        if (hash < flag.enabledPercentage) {
          isEnabled = true;
          reason = 'percentage_rollout';
        }
      }
      // Admin override
      else if (session.user.isAdmin) {
        isEnabled = true;
        reason = 'admin_access';
      }

      if (isEnabled) {
        enabledFeatures.push({
          key: flag.key,
          name: flag.name,
          description: flag.description,
          reason
        });
      }
    }

    logger.info('User enabled features fetched', {
      requestId,
      userId: session.user.id,
      count: enabledFeatures.length,
      duration: Date.now() - startTime
    });

    return apiResponse.success(enabledFeatures, {
      meta: {
        requestId,
        userId: session.user.id,
        tier: subscription?.tier || 'FREE',
        total: enabledFeatures.length
      }
    });
  } catch (error) {
    logger.error('GET feature-flags/enabled failed', { requestId }, error);
    return apiResponse.internalError('Failed to fetch enabled features', requestId);
  }
}

export const dynamic = 'force-dynamic';