// src/app/api/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import apiResponse from '@/lib/apiResponse';
import { logger } from '@/lib/logger';
import { StatsService } from '@/services/statsService';
import { z } from 'zod';

const log = logger.child({ module: 'api.analytics' });

// Validation schema
const analyticsSchema = z.object({
  days: z.coerce.number().min(1).max(365).optional().default(30),
  includeGoals: z.boolean().optional().default(false),
  includeAchievements: z.boolean().optional().default(false),
  includePlatforms: z.boolean().optional().default(true),
});

/**
 * GET /api/analytics
 * Get comprehensive analytics overview
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      log.warn('Unauthorized analytics request');
      return apiResponse.unauthorized('Authentication required');
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);

    // Parse and validate query params - FIX: Handle null values
    const days = searchParams.get('days');
    const includeGoals = searchParams.get('includeGoals');
    const includeAchievements = searchParams.get('includeAchievements');
    const includePlatforms = searchParams.get('includePlatforms');

    const validationResult = analyticsSchema.safeParse({
      days: days ?? undefined,
      includeGoals: includeGoals === 'true',
      includeAchievements: includeAchievements === 'true',
      includePlatforms: includePlatforms !== 'false',
    });

    if (!validationResult.success) {
      log.warn('Invalid analytics parameters', {
        userId,
        errors: validationResult.error.flatten(),
      });
      return apiResponse.validationError(
        'Invalid parameters',
        validationResult.error.issues
      );
    }

    const params = validationResult.data;

    log.info('Fetching analytics overview', {
      userId,
      days: params.days,
    });

    // Fetch overall stats
    const overallStats = await StatsService.getOverallStats(userId, params.days);

    // Fetch platform stats if requested
    let platformStats = null;
    if (params.includePlatforms) {
      platformStats = await StatsService.getPlatformStats(userId);
    }

    // Build response
    const analytics = {
      overview: {
        totalProblems: overallStats.totalProblems,
        totalCommits: overallStats.totalCommits,
        totalTimeSpent: overallStats.totalTimeSpent,
        totalPoints: overallStats.totalPoints,
        activeDays: overallStats.activeDays,
        currentStreak: overallStats.currentStreak,
        longestStreak: overallStats.longestStreak,
        avgProblemsPerDay: overallStats.avgProblemsPerDay,
        avgTimePerDay: overallStats.avgTimePerDay,
      },
      platforms: platformStats,
      period: {
        days: params.days,
        startDate: new Date(
          Date.now() - params.days * 24 * 60 * 60 * 1000
        ).toISOString(),
        endDate: new Date().toISOString(),
      },
    };

    const duration = Date.now() - startTime;
    log.info('Analytics overview fetched successfully', {
      userId,
      duration,
    });

    return apiResponse.success(analytics, {
      meta: {
        days: params.days,
        executionTime: duration,
        cached: false,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Error fetching analytics overview', { duration }, error);
    return apiResponse.error(error);
  }
}