// =============================================================================
// src/app/api/goals/suggestions/route.ts
// =============================================================================
// Description: AI-based goal suggestions based on user history
// Methods: GET, POST, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 20 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { GoalType, GoalMetric, PlatformCategory, GoalStatus } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 20;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=300',
};

// =============================================================================
// GOAL TEMPLATES
// =============================================================================

interface GoalTemplate {
  id: string;
  title: string;
  description: string;
  category: PlatformCategory;
  goalType: GoalType;
  metric: GoalMetric;
  target: number;
  unit: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeCommitment: 'low' | 'medium' | 'high';
  tags: string[];
  icon: string;
  color: string;
}

const GOAL_TEMPLATES: GoalTemplate[] = [
  // DSA Goals
  {
    id: 'daily-leetcode-1',
    title: 'Daily LeetCode Challenge',
    description: 'Solve at least one LeetCode problem every day',
    category: PlatformCategory.DSA,
    goalType: GoalType.DAILY,
    metric: GoalMetric.PROBLEMS_SOLVED,
    target: 1,
    unit: 'problem',
    difficulty: 'easy',
    timeCommitment: 'low',
    tags: ['consistency', 'problem-solving', 'daily', 'beginner'],
    icon: '🎯',
    color: '#10B981',
  },
  {
    id: 'daily-leetcode-3',
    title: 'Triple Threat Daily',
    description: 'Solve 3 coding problems every day',
    category: PlatformCategory.DSA,
    goalType: GoalType.DAILY,
    metric: GoalMetric.PROBLEMS_SOLVED,
    target: 3,
    unit: 'problems',
    difficulty: 'medium',
    timeCommitment: 'medium',
    tags: ['consistency', 'problem-solving', 'daily'],
    icon: '🔥',
    color: '#F59E0B',
  },
  {
    id: 'weekly-problems-25',
    title: 'Weekly 25 Problems',
    description: 'Solve 25 coding problems this week',
    category: PlatformCategory.DSA,
    goalType: GoalType.WEEKLY,
    metric: GoalMetric.PROBLEMS_SOLVED,
    target: 25,
    unit: 'problems',
    difficulty: 'medium',
    timeCommitment: 'medium',
    tags: ['weekly', 'problem-solving'],
    icon: '📊',
    color: '#6366F1',
  },
  {
    id: 'monthly-100-problems',
    title: 'Monthly 100 Club',
    description: 'Solve 100 coding problems this month',
    category: PlatformCategory.DSA,
    goalType: GoalType.MONTHLY,
    metric: GoalMetric.PROBLEMS_SOLVED,
    target: 100,
    unit: 'problems',
    difficulty: 'hard',
    timeCommitment: 'high',
    tags: ['monthly', 'challenge', 'ambitious'],
    icon: '🏆',
    color: '#EF4444',
  },
  {
    id: 'leetcode-75',
    title: 'Complete LeetCode 75',
    description: 'Finish the curated list of 75 essential LeetCode problems',
    category: PlatformCategory.DSA,
    goalType: GoalType.MILESTONE,
    metric: GoalMetric.PROBLEMS_SOLVED,
    target: 75,
    unit: 'problems',
    difficulty: 'medium',
    timeCommitment: 'medium',
    tags: ['interview-prep', 'curated', 'milestone'],
    icon: '📚',
    color: '#8B5CF6',
  },

  // Development Goals
  {
    id: 'daily-commit',
    title: 'Daily Git Commit',
    description: 'Make at least one commit to your projects every day',
    category: PlatformCategory.OPENSOURCE,
    goalType: GoalType.DAILY,
    metric: GoalMetric.COMMITS,
    target: 1,
    unit: 'commit',
    difficulty: 'easy',
    timeCommitment: 'low',
    tags: ['consistency', 'github', 'daily'],
    icon: '💻',
    color: '#1F2937',
  },
  {
    id: 'github-streak-30',
    title: '30-Day GitHub Streak',
    description: 'Maintain a 30-day GitHub contribution streak',
    category: PlatformCategory.OPENSOURCE,
    goalType: GoalType.STREAK,
    metric: GoalMetric.STREAK_DAYS,
    target: 30,
    unit: 'days',
    difficulty: 'medium',
    timeCommitment: 'medium',
    tags: ['github', 'streak', 'consistency'],
    icon: '🔥',
    color: '#10B981',
  },
  {
    id: '100-days-code',
    title: '100 Days of Code',
    description: 'Code for at least 1 hour every day for 100 days',
    category: PlatformCategory.LEARNING,
    goalType: GoalType.STREAK,
    metric: GoalMetric.STREAK_DAYS,
    target: 100,
    unit: 'days',
    difficulty: 'hard',
    timeCommitment: 'high',
    tags: ['challenge', 'community', '100daysofcode'],
    icon: '🚀',
    color: '#EC4899',
  },
  {
    id: 'open-source-prs',
    title: 'Open Source Contributor',
    description: 'Make 10 pull requests to open source projects',
    category: PlatformCategory.OPENSOURCE,
    goalType: GoalType.MILESTONE,
    metric: GoalMetric.PULL_REQUESTS,
    target: 10,
    unit: 'PRs',
    difficulty: 'medium',
    timeCommitment: 'medium',
    tags: ['open-source', 'community', 'contribution'],
    icon: '🌟',
    color: '#6366F1',
  },

  // Jobs Goals
  {
    id: 'weekly-applications-10',
    title: 'Weekly Application Sprint',
    description: 'Apply to 10 jobs this week',
    category: PlatformCategory.JOB,
    goalType: GoalType.WEEKLY,
    metric: GoalMetric.APPLICATIONS_SUBMITTED,
    target: 10,
    unit: 'applications',
    difficulty: 'medium',
    timeCommitment: 'medium',
    tags: ['job-search', 'weekly'],
    icon: '💼',
    color: '#3B82F6',
  },
  {
    id: 'monthly-applications-50',
    title: 'Monthly 50 Applications',
    description: 'Submit 50 job applications this month',
    category: PlatformCategory.JOB,
    goalType: GoalType.MONTHLY,
    metric: GoalMetric.APPLICATIONS_SUBMITTED,
    target: 50,
    unit: 'applications',
    difficulty: 'hard',
    timeCommitment: 'high',
    tags: ['job-search', 'monthly', 'intensive'],
    icon: '🎯',
    color: '#EF4444',
  },

  // Learning Goals
  {
    id: 'complete-course-monthly',
    title: 'Complete a Course',
    description: 'Finish one online course this month',
    category: PlatformCategory.LEARNING,
    goalType: GoalType.MONTHLY,
    metric: GoalMetric.COURSES_COMPLETED,
    target: 1,
    unit: 'course',
    difficulty: 'medium',
    timeCommitment: 'medium',
    tags: ['learning', 'education', 'monthly'],
    icon: '📖',
    color: '#8B5CF6',
  },
  {
    id: 'daily-learning-1hr',
    title: 'Daily Learning Hour',
    description: 'Spend at least 1 hour learning every day',
    category: PlatformCategory.LEARNING,
    goalType: GoalType.DAILY,
    metric: GoalMetric.TIME_SPENT,
    target: 60,
    unit: 'minutes',
    difficulty: 'medium',
    timeCommitment: 'medium',
    tags: ['learning', 'daily', 'education'],
    icon: '⏱️',
    color: '#10B981',
  },
  {
    id: 'earn-certification',
    title: 'Professional Certification',
    description: 'Earn a professional certification',
    category: PlatformCategory.LEARNING,
    goalType: GoalType.MILESTONE,
    metric: GoalMetric.CERTIFICATIONS,
    target: 1,
    unit: 'certification',
    difficulty: 'hard',
    timeCommitment: 'high',
    tags: ['certification', 'career', 'professional'],
    icon: '🏅',
    color: '#F59E0B',
  },

  // Hackathons
  {
    id: 'monthly-hackathon',
    title: 'Monthly Hackathon',
    description: 'Participate in one hackathon this month',
    category: PlatformCategory.HACKATHON,
    goalType: GoalType.MONTHLY,
    metric: GoalMetric.CONTESTS_PARTICIPATED,
    target: 1,
    unit: 'hackathon',
    difficulty: 'medium',
    timeCommitment: 'high',
    tags: ['hackathon', 'competition', 'team'],
    icon: '🏁',
    color: '#EC4899',
  },
  {
    id: 'quarterly-hackathons',
    title: 'Quarterly Hackathon Challenge',
    description: 'Participate in 3 hackathons this quarter',
    category: PlatformCategory.HACKATHON,
    goalType: GoalType.QUARTERLY,
    metric: GoalMetric.CONTESTS_PARTICIPATED,
    target: 3,
    unit: 'hackathons',
    difficulty: 'hard',
    timeCommitment: 'high',
    tags: ['hackathon', 'quarterly', 'challenge'],
    icon: '🚀',
    color: '#6366F1',
  },

  // Streak Goals
  {
    id: 'streak-7-days',
    title: 'Week Warrior',
    description: 'Maintain a 7-day activity streak',
    category: PlatformCategory.DSA,
    goalType: GoalType.STREAK,
    metric: GoalMetric.STREAK_DAYS,
    target: 7,
    unit: 'days',
    difficulty: 'easy',
    timeCommitment: 'low',
    tags: ['streak', 'beginner', 'weekly'],
    icon: '⚡',
    color: '#10B981',
  },
  {
    id: 'streak-14-days',
    title: 'Fortnight Fighter',
    description: 'Maintain a 14-day activity streak',
    category: PlatformCategory.DSA,
    goalType: GoalType.STREAK,
    metric: GoalMetric.STREAK_DAYS,
    target: 14,
    unit: 'days',
    difficulty: 'medium',
    timeCommitment: 'medium',
    tags: ['streak', 'consistency'],
    icon: '🔥',
    color: '#F59E0B',
  },
  {
    id: 'streak-365-days',
    title: 'Year Long Legend',
    description: 'Maintain a 365-day activity streak',
    category: PlatformCategory.DSA,
    goalType: GoalType.STREAK,
    metric: GoalMetric.STREAK_DAYS,
    target: 365,
    unit: 'days',
    difficulty: 'hard',
    timeCommitment: 'high',
    tags: ['streak', 'legendary', 'yearly'],
    icon: '👑',
    color: '#EF4444',
  },
];

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const suggestionQuerySchema = z.object({
  category: z.nativeEnum(PlatformCategory).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  timeCommitment: z.enum(['low', 'medium', 'high']).optional(),
  goalType: z.nativeEnum(GoalType).optional(),
  basedOnHistory: z.union([
    z.boolean(),
    z.string().transform((val) => val !== 'false'),
  ]).default(true),
  excludeExisting: z.union([
    z.boolean(),
    z.string().transform((val) => val !== 'false'),
  ]).default(true),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

const suggestionBodySchema = suggestionQuerySchema.extend({
  tags: z.array(z.string()).optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  rateLimitResult?: { limit: number; remaining: number }
): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);

  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }

  return response;
}

async function validateRequest(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `goals-suggestions:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return {
      error: apiResponse.rateLimited(60, requestId),
      session: null,
      rateLimitResult,
    };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      error: apiResponse.unauthorized('Authentication required', requestId),
      session: null,
      rateLimitResult,
    };
  }

  return { error: null, session, rateLimitResult };
}

interface UserPreferences {
  preferredCategories: PlatformCategory[];
  preferredDifficulty: 'easy' | 'medium' | 'hard';
  completedGoals: number;
  activeGoals: number;
  currentStreak: number;
  avgCompletionRate: number;
  mostUsedMetrics: GoalMetric[];
}

async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const [
    userGoals,
    completedCount,
    activeCount,
    user,
  ] = await Promise.all([
    prisma.goal.findMany({
      where: { userId },
      select: {
        category: true,
        goalType: true,
        metric: true,
        status: true,
        target: true,
        progress: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.goal.count({
      where: { userId, status: GoalStatus.COMPLETED },
    }),
    prisma.goal.count({
      where: { userId, status: GoalStatus.ACTIVE },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, longestStreak: true },
    }),
  ]);

  // Analyze category preferences
  const categoryCounts: Record<string, number> = {};
  const metricCounts: Record<string, number> = {};

  for (const goal of userGoals) {
    categoryCounts[goal.category] = (categoryCounts[goal.category] || 0) + 1;
    metricCounts[goal.metric] = (metricCounts[goal.metric] || 0) + 1;
  }

  const preferredCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([cat]) => cat as PlatformCategory);

  const mostUsedMetrics = Object.entries(metricCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([metric]) => metric as GoalMetric);

  // Determine preferred difficulty based on history
  let preferredDifficulty: 'easy' | 'medium' | 'hard' = 'easy';
  if (completedCount > 20) {
    preferredDifficulty = 'hard';
  } else if (completedCount > 10) {
    preferredDifficulty = 'medium';
  }

  // Calculate completion rate
  const totalGoals = userGoals.length;
  const avgCompletionRate = totalGoals > 0
    ? userGoals.filter((g) => g.status === GoalStatus.COMPLETED).length / totalGoals * 100
    : 0;

  return {
    preferredCategories,
    preferredDifficulty,
    completedGoals: completedCount,
    activeGoals: activeCount,
    currentStreak: user?.currentStreak || 0,
    avgCompletionRate: Math.round(avgCompletionRate),
    mostUsedMetrics,
  };
}

function scoreSuggestion(
  template: GoalTemplate,
  preferences: UserPreferences,
  filters: z.infer<typeof suggestionQuerySchema>
): number {
  let score = 50; // Base score

  // Boost for preferred categories
  if (preferences.preferredCategories.includes(template.category)) {
    score += 20;
  }

  // Boost for matching difficulty
  if (template.difficulty === preferences.preferredDifficulty) {
    score += 15;
  }

  // Adjust based on user experience
  if (preferences.completedGoals < 5 && template.difficulty === 'easy') {
    score += 10;
  } else if (preferences.completedGoals > 20 && template.difficulty === 'hard') {
    score += 10;
  }

  // Boost for streak goals if user has good streak
  if (preferences.currentStreak > 7 && template.goalType === GoalType.STREAK) {
    score += 10;
  }

  // Penalty if user has many active goals
  if (preferences.activeGoals > 10) {
    score -= 5;
  }

  // Filter-based adjustments
  if (filters.category && template.category === filters.category) {
    score += 30;
  }

  if (filters.difficulty && template.difficulty === filters.difficulty) {
    score += 20;
  }

  if (filters.timeCommitment && template.timeCommitment === filters.timeCommitment) {
    score += 15;
  }

  if (filters.goalType && template.goalType === filters.goalType) {
    score += 20;
  }

  return score;
}

// =============================================================================
// OPTIONS - CORS Preflight
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  const response = new NextResponse(null, { status: 204 });
  return addHeaders(response, requestId);
}

// =============================================================================
// HEAD - Resource Metadata
// =============================================================================

export async function HEAD(): Promise<NextResponse> {
  const requestId = generateRequestId();

  const response = new NextResponse(null, { status: 200 });
  response.headers.set('X-Total-Templates', String(GOAL_TEMPLATES.length));
  response.headers.set('X-Categories', Object.values(PlatformCategory).join(','));

  return addHeaders(response, requestId);
}

// =============================================================================
// GET - Get Goal Suggestions
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, unknown> = {};

    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const validation = suggestionQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Invalid parameters',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const params = validation.data;

    // Get user preferences
    const preferences = params.basedOnHistory
      ? await getUserPreferences(userId)
      : {
          preferredCategories: [] as PlatformCategory[],
          preferredDifficulty: 'medium' as const,
          completedGoals: 0,
          activeGoals: 0,
          currentStreak: 0,
          avgCompletionRate: 0,
          mostUsedMetrics: [] as GoalMetric[],
        };

    // Get existing goal titles to exclude duplicates
    let existingTitles = new Set<string>();
    if (params.excludeExisting) {
      const existingGoals = await prisma.goal.findMany({
        where: {
          userId,
          status: { not: GoalStatus.ARCHIVED },
        },
        select: { title: true },
      });
      existingTitles = new Set(existingGoals.map((g) => g.title.toLowerCase()));
    }

    // Filter and score suggestions
    const suggestions = GOAL_TEMPLATES
      .filter((template) => {
        // Exclude existing goals
        if (params.excludeExisting && existingTitles.has(template.title.toLowerCase())) {
          return false;
        }

        // Apply filters
        if (params.category && template.category !== params.category) {
          return false;
        }
        if (params.difficulty && template.difficulty !== params.difficulty) {
          return false;
        }
        if (params.timeCommitment && template.timeCommitment !== params.timeCommitment) {
          return false;
        }
        if (params.goalType && template.goalType !== params.goalType) {
          return false;
        }

        return true;
      })
      .map((template) => ({
        ...template,
        score: scoreSuggestion(template, preferences, params),
        matchReason: getMatchReason(template, preferences, params),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, params.limit);

    logger.info('GET /api/goals/suggestions completed', {
      userId,
      suggestionsCount: suggestions.length,
      basedOnHistory: params.basedOnHistory,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        suggestions,
        userPreferences: params.basedOnHistory ? preferences : undefined,
        filters: {
          category: params.category,
          difficulty: params.difficulty,
          timeCommitment: params.timeCommitment,
          goalType: params.goalType,
        },
        totalAvailable: GOAL_TEMPLATES.length,
      },
      { meta: { requestId } }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /api/goals/suggestions failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to get suggestions', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// POST - Get Personalized Suggestions
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const response = apiResponse.validationError(
        'Invalid JSON body',
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const validation = suggestionBodySchema.safeParse(body);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Invalid parameters',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const params = validation.data;

    // Get user preferences
    const preferences = params.basedOnHistory
      ? await getUserPreferences(userId)
      : {
          preferredCategories: [] as PlatformCategory[],
          preferredDifficulty: 'medium' as const,
          completedGoals: 0,
          activeGoals: 0,
          currentStreak: 0,
          avgCompletionRate: 0,
          mostUsedMetrics: [] as GoalMetric[],
        };

    // Get existing goal titles
    let existingTitles = new Set<string>();
    if (params.excludeExisting) {
      const existingGoals = await prisma.goal.findMany({
        where: {
          userId,
          status: { not: GoalStatus.ARCHIVED },
        },
        select: { title: true },
      });
      existingTitles = new Set(existingGoals.map((g) => g.title.toLowerCase()));
    }

    // Filter and score suggestions
    const suggestions = GOAL_TEMPLATES
      .filter((template) => {
        if (params.excludeExisting && existingTitles.has(template.title.toLowerCase())) {
          return false;
        }

        if (params.category && template.category !== params.category) {
          return false;
        }
        if (params.difficulty && template.difficulty !== params.difficulty) {
          return false;
        }
        if (params.timeCommitment && template.timeCommitment !== params.timeCommitment) {
          return false;
        }
        if (params.goalType && template.goalType !== params.goalType) {
          return false;
        }

        // Filter by tags
        if (params.tags && params.tags.length > 0) {
          const hasMatchingTag = params.tags.some((tag) =>
            template.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
          );
          if (!hasMatchingTag) return false;
        }

        return true;
      })
      .map((template) => ({
        ...template,
        score: scoreSuggestion(template, preferences, params),
        matchReason: getMatchReason(template, preferences, params),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, params.limit);

    logger.info('POST /api/goals/suggestions completed', {
      userId,
      suggestionsCount: suggestions.length,
      basedOnHistory: params.basedOnHistory,
      tags: params.tags,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        suggestions,
        userPreferences: params.basedOnHistory ? preferences : undefined,
        filters: {
          category: params.category,
          difficulty: params.difficulty,
          timeCommitment: params.timeCommitment,
          goalType: params.goalType,
          tags: params.tags,
        },
        totalAvailable: GOAL_TEMPLATES.length,
      },
      { meta: { requestId } }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /api/goals/suggestions failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to get suggestions', requestId);
    return addHeaders(response, requestId);
  }
}

// Helper function to generate match reason
function getMatchReason(
  template: GoalTemplate,
  preferences: UserPreferences,
  filters: z.infer<typeof suggestionQuerySchema>
): string[] {
  const reasons: string[] = [];

  if (preferences.preferredCategories.includes(template.category)) {
    reasons.push('Matches your preferred category');
  }

  if (template.difficulty === preferences.preferredDifficulty) {
    reasons.push('Matches your skill level');
  }

  if (preferences.currentStreak > 7 && template.goalType === GoalType.STREAK) {
    reasons.push('Great for maintaining your streak');
  }

  if (filters.category && template.category === filters.category) {
    reasons.push('Matches selected category');
  }

  if (preferences.completedGoals < 5 && template.difficulty === 'easy') {
    reasons.push('Good for beginners');
  }

  if (reasons.length === 0) {
    reasons.push('Popular goal');
  }

  return reasons;
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';