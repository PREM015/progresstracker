// =============================================================================
// api/admin/feature-flags/[id]/rollout/route.ts
// =============================================================================
// Description: Manage feature flag rollout percentage
// Methods: POST, OPTIONS
// Auth Required: Yes (Admin only)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import apiResponse from '@/lib/apiResponse';

const rolloutSchema = z.object({
  percentage: z.number().int().min(0).max(100),
  strategy: z.enum(['linear', 'canary', 'blue_green']).optional(),
  targetGroups: z.array(z.string()).optional(),
});

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const requestId = crypto.randomUUID();

  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return apiResponse.forbidden('Admin access required', requestId);
    }

    // Parse body
    const body = await request.json();
    const validation = rolloutSchema.safeParse(body);

    if (!validation.success) {
      return apiResponse.validationError(
        'Invalid rollout configuration',
        validation.error.errors,
        requestId
      );
    }

    const { percentage, strategy = 'linear' } = validation.data;

    // Update feature flag
    const flag = await prisma.featureFlag.update({
      where: { id: params.id },
      data: {
        enabledPercentage: percentage,
        metadata: {
          rolloutStrategy: strategy,
          rolloutUpdatedAt: new Date().toISOString(),
          rolloutUpdatedBy: session.user.id,
        }
      }
    });

    // Log admin action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        category: 'feature_flags',
        entityType: 'feature_flag',
        entityId: params.id,
        description: `Updated rollout percentage to ${percentage}% using ${strategy} strategy`,
        newValue: { percentage, strategy },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent'),
      }
    });

    logger.info('Feature flag rollout updated', {
      requestId,
      adminId: session.user.id,
      flagId: params.id,
      percentage,
      strategy
    });

    return apiResponse.success(flag, { meta: { requestId } });
  } catch (error) {
    logger.error('POST admin/feature-flags/[id]/rollout failed', { requestId }, error);
    return apiResponse.internalError('Failed to update rollout', requestId);
  }
}

export const dynamic = 'force-dynamic';