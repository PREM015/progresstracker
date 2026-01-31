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

    // Fetch entries with platform info
    log.debug('Fetching tracker entries from database', { userId });
    const entries = await prisma.trackerEntry.findMany({
      where: whereClause,
      include: {
        platform: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { date: 'desc' },
    });

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

    // Calculate overview stats
    const totalProblems = entries.reduce((s, e) => s + e.problemsSolved, 0);
    const totalCommits = entries.reduce((s, e) => s + e.commits, 0);
    const totalPullRequests = entries.reduce((s, e) => s + e.pullRequests, 0);
    const totalTimeSpent = entries.reduce((s, e) => s + e.timeSpent, 0);
    const totalPoints = entries.reduce((s, e) => s + (e.points ?? 0), 0);

    // Difficulty breakdown
    const easyProblems = entries.reduce((s, e) => s + e.easyProblems, 0);
    const mediumProblems = entries.reduce((s, e) => s + e.mediumProblems, 0);
    const hardProblems = entries.reduce((s, e) => s + e.hardProblems, 0);
    const totalDifficultyProblems = easyProblems + mediumProblems + hardProblems;

    // Unique active days
    const uniqueDays = new Set(
      entries.map((e) => e.date.toISOString().split('T')[0])
    );
    const activeDays = uniqueDays.size;

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
          problemsPerSession: entries.length > 0 
            ? Math.round(totalProblems / entries.length) 
            : 0,
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
      log.debug('Building detailed breakdown data');

      // Platform breakdown
      const platformBreakdown = new Map<string, {
        platformId: string;
        platformName: string | null;
        problems: number;
        commits: number;
        time: number;
        entries: number;
      }>();

      entries.forEach((entry) => {
        if (!entry.platformId) return;
        const existing = platformBreakdown.get(entry.platformId) ?? {
          platformId: entry.platformId,
          platformName: entry.platform?.name ?? null,
          problems: 0,
          commits: 0,
          time: 0,
          entries: 0,
        };
        existing.problems += entry.problemsSolved;
        existing.commits += entry.commits;
        existing.time += entry.timeSpent;
        existing.entries += 1;
        platformBreakdown.set(entry.platformId, existing);
      });

      response.data.platforms = Array.from(platformBreakdown.values())
        .sort((a, b) => b.problems - a.problems);

      // Category breakdown
      const categoryBreakdown = new Map<PlatformCategory, {
        category: PlatformCategory;
        problems: number;
        commits: number;
        time: number;
        entries: number;
      }>();

      entries.forEach((entry) => {
        if (!entry.category) return;
        const existing = categoryBreakdown.get(entry.category) ?? {
          category: entry.category,
          problems: 0,
          commits: 0,
          time: 0,
          entries: 0,
        };
        existing.problems += entry.problemsSolved;
        existing.commits += entry.commits;
        existing.time += entry.timeSpent;
        existing.entries += 1;
        categoryBreakdown.set(entry.category, existing);
      });

      response.data.categories = Array.from(categoryBreakdown.values())
        .sort((a, b) => b.problems - a.problems);

      // Recent activity (last 10)
      response.data.recentActivity = entries.slice(0, 10).map((entry) => ({
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
      entriesCount: entries.length,
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