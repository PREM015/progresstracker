// =============================================================================
// api/admin/feature-flags/[id]/toggle/route.ts
// =============================================================================
// Description: Toggle feature flag on/off
// Methods: POST, OPTIONS
// Auth Required: Yes (Admin only)
// Rate Limit: 30 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

const paramsSchema = z.object({
  id: z.string().cuid()
});

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = crypto.randomUUID();

  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return apiResponse.forbidden('Admin access required', requestId);
    }

    // Rate limiting
    const rateLimitResult = await checkLimit(
      apiRateLimiter,
      30,
      `admin-toggle:${session.user.id}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Validate params
    const validation = paramsSchema.safeParse(await params);
    if (!validation.success) {
      return apiResponse.validationError(
        'Invalid feature flag ID',
        validation.error.errors,
        requestId
      );
    }

    const { id } = validation.data;

    // Get current state
    const existing = await prisma.featureFlag.findUnique({
      where: { id }
    });

    if (!existing) {
      return apiResponse.notFound('Feature flag', requestId);
    }

    // Toggle the flag
    const flag = await prisma.featureFlag.update({
      where: { id },
      data: { isEnabled: !existing.isEnabled }
    });

    // Log admin action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        category: 'feature_flags',
        entityType: 'feature_flag',
        entityId: id,
        description: `Toggled feature flag ${existing.key}: ${existing.isEnabled} → ${flag.isEnabled}`,
        oldValue: { isEnabled: existing.isEnabled },
        newValue: { isEnabled: flag.isEnabled },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent'),
      }
    });

    logger.info('Feature flag toggled', {
      requestId,
      adminId: session.user.id,
      flagId: id,
      key: flag.key,
      isEnabled: flag.isEnabled
    });

    return apiResponse.success(flag, { meta: { requestId } });
  } catch (error) {
    logger.error('POST admin/feature-flags/[id]/toggle failed', { requestId }, error);
    return apiResponse.internalError('Failed to toggle feature flag', requestId);
  }
}

export const dynamic = 'force-dynamic';