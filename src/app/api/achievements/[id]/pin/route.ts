// src/app/api/achievements/[id]/pin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter } from '@/lib/rateLimit';
import { AchievementService } from '@/services/achievementService';

// =============================================================================
// POST - Pin Achievement
// =============================================================================

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // ✅ Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized pin attempt', { requestId });
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // ✅ Rate Limiting
    const rateLimitResult = await apiRateLimiter.check(30, `achievements:pin:${session.user.id}`);

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded', { userId: session.user.id, requestId });
      return apiResponse.rateLimited(60, requestId);
    }

    const achievementId = params.id;

    logger.info('Pinning achievement', {
      userId: session.user.id,
      achievementId,
      requestId,
    });

    // ✅ Toggle Pin
    const result = await AchievementService.togglePinAchievement(
      session.user.id,
      achievementId
    );

    const duration = Date.now() - startTime;

    logger.info('Achievement pin toggled', {
      userId: session.user.id,
      achievementId,
      isPinned: result.isPinned,
      duration,
      requestId,
    });

    return apiResponse.success(result, {
      meta: { requestId, duration },
      message: result.isPinned ? 'Achievement pinned' : 'Achievement unpinned',
    });
  } catch (error) {
    logger.error('Failed to pin achievement', { requestId }, error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('not unlocked')) {
        return apiResponse.validationError('Achievement not unlocked', undefined, requestId);
      }
      if (error.message.includes('Maximum')) {
        return apiResponse.validationError(error.message, undefined, requestId);
      }
    }

    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// DELETE - Unpin Achievement
// =============================================================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Same as POST (toggle)
  return POST(req, { params });
}

// =============================================================================
// OPTIONS - CORS Preflight
// =============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}