// src/app/api/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatsService } from '@/services/statsService';
import { logger } from '@/lib/logger';
import {
  startOfDay,
  endOfDay,
  subDays,
  parseISO,
  isValid,
  differenceInDays
} from 'date-fns';
import type { PlatformCategory } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

interface StatsQueryParams {
  startDate?: string;
  endDate?: string;
  days?: string;
  platformId?: string;
  category?: string;
  groupBy?: 'day' | 'week' | 'month';
  includeDetails?: string;
}

interface StatsResponse {
  success: boolean;
  data: {
    overview: {
      totalProblems: number;
      totalCommits: number;
      totalPullRequests: number;
      totalTimeSpent: number;
      totalPoints: number;
      activeDays: number;
      currentStreak: number;
      longestStreak: number;
    };
    averages: {
      problemsPerDay: number;
      commitsPerDay: number;
      timePerDay: number;
      problemsPerSession: number;
    };
    difficulty: {
      easy: number;
      medium: number;
      hard: number;
      total: number;
      distribution: {
        easyPercent: number;
        mediumPercent: number;
        hardPercent: number;
      };
    };
    platforms?: Array<{
      platformId: string;
      platformName: string | null;
      problems: number;
      commits: number;
      time: number;
      entries: number;
    }>;
    categories?: Array<{
      category: PlatformCategory;
      problems: number;
      commits: number;
      time: number;
      entries: number;
    }>;
    recentActivity?: Array<{
      id: string;
      date: string;
      platformName: string | null;
      category: PlatformCategory | null;
      problemsSolved: number;
      commits: number;
      timeSpent: number;
    }>;
    period: {
      startDate: string;
      endDate: string;
      days: number;
    };
  };
  meta: {
    cached: boolean;
    generatedAt: string;
  };
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

function parseDate(dateStr: string): Date | null {
  try {
    const date = parseISO(dateStr);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

function validateDays(daysStr: string | undefined): number {
  if (!daysStr) return 30;
  const days = parseInt(daysStr, 10);
  if (isNaN(days) || days < 1) return 30;
  if (days > 365) return 365; // Max 1 year
  return days;
}

function validateCategory(category: string | undefined): PlatformCategory | null {
  if (!category) return null;
  const validCategories: PlatformCategory[] = [
    'DSA', 'JOB', 'GIT', 'LEARNING', 'HACKATHON',
    'OPENSOURCE', 'COMPANY', 'DESIGN', 'DATA_SCIENCE', 'OTHER'
  ];
  return validCategories.includes(category as PlatformCategory)
    ? (category as PlatformCategory)
    : null;
}

// =============================================================================
// GET - Aggregated Statistics
// =============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const log = logger.child({ route: 'GET /api/stats' });

  try {
    // Authentication check
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      log.warn('Unauthorized access attempt to stats endpoint');
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'You must be logged in to view stats'
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const params: StatsQueryParams = {
      startDate: searchParams.get('startDate') ?? undefined,
      endDate: searchParams.get('endDate') ?? undefined,
      days: searchParams.get('days') ?? undefined,
      platformId: searchParams.get('platformId') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      groupBy: (searchParams.get('groupBy') as 'day' | 'week' | 'month') ?? undefined,
      includeDetails: searchParams.get('includeDetails') ?? 'true',
    };

    log.debug('Stats request parameters', { params, userId });

    // Determine date range
    let startDate: Date;
    let endDate: Date = endOfDay(new Date());

    if (params.startDate) {
      const parsed = parseDate(params.startDate);
      if (!parsed) {
        log.warn('Invalid startDate format provided', { startDate: params.startDate });
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid startDate format',
            message: 'Use ISO 8601 format (YYYY-MM-DD)'
          },
          { status: 400 }
        );
      }
      startDate = startOfDay(parsed);
    } else {
      const days = validateDays(params.days);
      startDate = startOfDay(subDays(new Date(), days));
    }

    if (params.endDate) {
      const parsed = parseDate(params.endDate);
      if (!parsed) {
        log.warn('Invalid endDate format provided', { endDate: params.endDate });
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid endDate format',
            message: 'Use ISO 8601 format (YYYY-MM-DD)'
          },
          { status: 400 }
        );
      }
      endDate = endOfDay(parsed);
    }

    // Validate date range
    if (startDate > endDate) {
      log.warn('Invalid date range provided', { startDate, endDate });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date range',
          message: 'startDate must be before endDate'
        },
        { status: 400 }
      );
    }

    const daysDiff = differenceInDays(endDate, startDate);
    if (daysDiff > 365) {
      log.warn('Date range exceeds maximum allowed', { daysDiff });
      return NextResponse.json(
        {
          success: false,
          error: 'Date range too large',
          message: 'Maximum date range is 365 days'
        },
        { status: 400 }
      );
    }

    // Validate platformId if provided
    if (params.platformId) {
      const platform = await prisma.platform.findUnique({
        where: { id: params.platformId },
        select: { id: true },
      });
      if (!platform) {
        log.warn('Platform not found', { platformId: params.platformId });
        return NextResponse.json(
          {
            success: false,
            error: 'Platform not found',
            message: 'The specified platform does not exist'
          },
          { status: 404 }
        );
      }
    }

    // Validate category if provided
    const category = validateCategory(params.category);
    if (params.category && !category) {
      log.warn('Invalid category provided', { category: params.category });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid category',
          message: 'Valid categories: DSA, JOB, GIT, LEARNING, HACKATHON, OPENSOURCE, COMPANY, DESIGN, DATA_SCIENCE, OTHER'
        },
        { status: 400 }
      );
    }

    // Build query conditions
    const whereClause: {
      userId: string;
      date: { gte: Date; lte: Date };
      platformId?: string;
      category?: PlatformCategory;
    } = {
      userId,
      date: { gte: startDate, lte: endDate },
    };

    if (params.platformId) {
      whereClause.platformId = params.platformId;
    }

    if (category) {
      whereClause.category = category;
    }

    // 1. Aggregated Totals (Fast)
    log.debug('Fetching aggregated stats from database', { userId });
    const aggregations = await prisma.trackerEntry.aggregate({
      where: whereClause,
      _sum: {
        problemsSolved: true,
        commits: true,
        timeSpent: true,
        points: true,
        easyProblems: true,
        mediumProblems: true,
        hardProblems: true
      },
      _count: {
        _all: true
      }
    });

    // 2. Active Days (Group By Date)
    // Count distinct dates with activity
    const activeDayGroups = await prisma.trackerEntry.groupBy({
      by: ['date'],
      where: whereClause,
    });
    const activeDays = activeDayGroups.length;

    // Get user's streak data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        totalProblems: true,
        totalCommits: true,
        totalPoints: true,
      },
    });

    // Extract values
    const totalProblems = aggregations._sum.problemsSolved || 0;
    const totalCommits = aggregations._sum.commits || 0;
    const totalPullRequests = 0; // Not aggregated in schema efficiently yet, or unused
    const totalTimeSpent = aggregations._sum.timeSpent || 0;
    const totalPoints = aggregations._sum.points || 0;
    const totalEntriesCount = aggregations._count._all;

    // Difficulty breakdown
    const easyProblems = aggregations._sum.easyProblems || 0;
    const mediumProblems = aggregations._sum.mediumProblems || 0;
    const hardProblems = aggregations._sum.hardProblems || 0;
    const totalDifficultyProblems = easyProblems + mediumProblems + hardProblems;

    // Get current streak (use cached or calculate)
    let currentStreak = user?.currentStreak ?? 0;
    let longestStreak = user?.longestStreak ?? 0;

    if (currentStreak === 0 || longestStreak === 0) {
      log.debug('Calculating streak data for user', { userId });
      const streakData = await StatsService.calculateStreak(userId);
      currentStreak = streakData.current;
      longestStreak = streakData.longest;
    }

    // Build response
    const includeDetails = params.includeDetails !== 'false';

    const response: StatsResponse = {
      success: true,
      data: {
        overview: {
          totalProblems,
          totalCommits,
          totalPullRequests,
          totalTimeSpent,
          totalPoints,
          activeDays,
          currentStreak,
          longestStreak,
        },
        averages: {
          problemsPerDay: activeDays > 0 ? Math.round(totalProblems / activeDays) : 0,
          commitsPerDay: activeDays > 0 ? Math.round(totalCommits / activeDays) : 0,
          timePerDay: activeDays > 0 ? Math.round(totalTimeSpent / activeDays) : 0,
          problemsPerSession: 0, // Removed as it required scanning all entries
        },
        difficulty: {
          easy: easyProblems,
          medium: mediumProblems,
          hard: hardProblems,
          total: totalDifficultyProblems,
          distribution: {
            easyPercent: totalDifficultyProblems > 0
              ? Math.round((easyProblems / totalDifficultyProblems) * 100)
              : 0,
            mediumPercent: totalDifficultyProblems > 0
              ? Math.round((mediumProblems / totalDifficultyProblems) * 100)
              : 0,
            hardPercent: totalDifficultyProblems > 0
              ? Math.round((hardProblems / totalDifficultyProblems) * 100)
              : 0,
          },
        },
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days: daysDiff + 1,
        },
      },
      meta: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
    };

    // Add detailed breakdowns if requested
    if (includeDetails) {
      log.debug('Building detailed breakdown data with groupBy');

      // Platform breakdown
      const platformGroups = await prisma.trackerEntry.groupBy({
        by: ['platformId'],
        where: { ...whereClause, platformId: { not: null } },
        _sum: {
          problemsSolved: true,
          commits: true,
          timeSpent: true
        },
        _count: {
          id: true
        }
      });

      // Fetch platform names
      const platformIds = platformGroups.map(g => g.platformId).filter((id): id is string => id !== null);
      const platforms = await prisma.platform.findMany({
        where: { id: { in: platformIds } },
        select: { id: true, name: true }
      });
      const platformMap = new Map(platforms.map(p => [p.id, p.name]));

      response.data.platforms = platformGroups.map(g => ({
        platformId: g.platformId!,
        platformName: platformMap.get(g.platformId!) ?? null,
        problems: g._sum.problemsSolved || 0,
        commits: g._sum.commits || 0,
        time: g._sum.timeSpent || 0,
        entries: g._count.id
      })).sort((a, b) => b.problems - a.problems);

      // Category breakdown
      const categoryGroups = await prisma.trackerEntry.groupBy({
        by: ['category'],
        where: { ...whereClause, category: { not: null } },
        _sum: {
          problemsSolved: true,
          commits: true,
          timeSpent: true
        },
        _count: {
          id: true
        }
      });

      response.data.categories = categoryGroups.map(g => ({
        category: g.category!,
        problems: g._sum.problemsSolved || 0,
        commits: g._sum.commits || 0,
        time: g._sum.timeSpent || 0,
        entries: g._count.id
      })).sort((a, b) => b.problems - a.problems);

      // Recent activity (Last 10 ONLY)
      const recentEntries = await prisma.trackerEntry.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        take: 10,
        include: {
          platform: { select: { name: true } }
        }
      });

      response.data.recentActivity = recentEntries.map((entry) => ({
        id: entry.id,
        date: entry.date.toISOString(),
        platformName: entry.platform?.name ?? null,
        category: entry.category,
        problemsSolved: entry.problemsSolved,
        commits: entry.commits,
        timeSpent: entry.timeSpent,
      }));
    }

    // Update user's last activity
    await prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    }).catch(() => {
      log.debug('Failed to update user lastActiveAt, continuing');
    });

    // Set cache headers
    const headers = new Headers();
    headers.set('Cache-Control', 'private, max-age=60'); // Cache for 1 minute

    // Log successful stats retrieval
    log.info('Stats retrieved successfully', {
      userId,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      entriesCount: totalEntriesCount,
      activeDays,
      totalProblems,
      totalCommits,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(response, { headers });

  } catch (error) {
    log.error(
      'Failed to fetch stats',
      {
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      },
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to fetch stats'
      },
      { status: 500 }
    );
  }
}