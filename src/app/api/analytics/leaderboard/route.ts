// src/app/api/analytics/leaderboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import apiResponse from '@/lib/apiResponse';  // ✅ Removed withErrorHandler
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { LeaderboardService } from '@/services/analytics/leaderboardService';

const log = logger.child({ module: 'api.analytics.leaderboard' });

// Validation schema
const leaderboardSchema = z.object({
  metric: z
    .enum(['problems', 'streak', 'points', 'commits'])
    .optional()
    .default('problems'),
  period: z.enum(['week', 'month', 'all']).optional().default('week'),
  limit: z.coerce.number().min(10).max(100).optional().default(50),
  includeUserRank: z.boolean().optional().default(true),
});

/**
 * GET /api/analytics/leaderboard
 * Get leaderboard rankings
 */
export async function GET(req: NextRequest): Promise<NextResponse> {  // ✅ Changed
  const startTime = Date.now();

  try {  // ✅ Added try-catch
    // Authentication check (optional for public leaderboard)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const { searchParams } = new URL(req.url);

    // Extract params first - FIX
    const metric = searchParams.get('metric');
    const period = searchParams.get('period');
    const limit = searchParams.get('limit');
    const includeUserRank = searchParams.get('includeUserRank');

    // Parse and validate query params
    const validationResult = leaderboardSchema.safeParse({
      metric: metric ?? undefined,
      period: period ?? undefined,
      limit: limit ?? undefined,
      includeUserRank: includeUserRank !== 'false',
    });

    if (!validationResult.success) {
      log.warn('Invalid leaderboard parameters', {
        errors: validationResult.error.flatten(),
      });
      return apiResponse.validationError(
        'Invalid parameters',
        validationResult.error.issues
      );
    }

    const params = validationResult.data;

    log.info('Fetching leaderboard', {
      metric: params.metric,
      period: params.period,
      limit: params.limit,
      userId,
    });

    // Get leaderboard data
    const leaderboard = await LeaderboardService.getLeaderboard(
      params.metric,
      params.period,
      params.limit
    );

    // Get user's rank if authenticated and requested
    let userRank = null;
    if (userId && params.includeUserRank) {
      const rank = await LeaderboardService.getUserRank(
        userId,
        params.metric,
        params.period
      );
      if (rank) {
        userRank = {
          ...rank,
          isInTop: rank.rank <= params.limit,
        };
      }
    }

    // Build response
    const response = {
      leaderboard: leaderboard.map((entry, index) => ({
        ...entry,
        position: index + 1,
        isCurrentUser: userId ? entry.userId === userId : false,
      })),
      userRank,
      metadata: {
        metric: params.metric,
        period: params.period,
        totalParticipants: leaderboard.length,
        lastUpdated: new Date().toISOString(),
      },
    };

    const duration = Date.now() - startTime;
    log.info('Leaderboard fetched successfully', {
      metric: params.metric,
      period: params.period,
      entries: leaderboard.length,
      duration,
    });

    return apiResponse.success(response, {
      meta: {
        metric: params.metric,
        period: params.period,
        limit: params.limit,
        executionTime: duration,
      },
    });
  } catch (error) {  // ✅ Added catch
    const duration = Date.now() - startTime;
    log.error('Error fetching leaderboard', { duration }, error);
    return apiResponse.error(error);
  }
}