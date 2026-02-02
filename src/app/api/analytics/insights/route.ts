// src/app/api/analytics/insights/route.ts
// =============================================================================
// AI-Powered Insights
// =============================================================================
// Methods: GET, POST, OPTIONS, HEAD
// Auth Required: Yes
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
import { subDays, differenceInDays } from 'date-fns';


/* eslint-disable @typescript-eslint/no-unused-vars */
// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Cache-Control': 'private, max-age=300',
};

type InsightType = 'streak' | 'improvement' | 'decline' | 'milestone' | 'recommendation' | 'warning' | 'celebration' | 'tip';
type InsightPriority = 'low' | 'medium' | 'high' | 'critical';

interface Insight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  category: string;
  title: string;
  message: string;
  icon: string;
  color: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  days: z.coerce.number().int().min(7).max(365).default(30),
  categories: z.string().optional().transform(v => v ? v.split(',') : undefined),
  includeRecommendations: z.enum(['true', 'false']).optional().transform(v => v !== 'false'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const postBodySchema = z.object({
  action: z.enum(['dismiss', 'snooze', 'mark_helpful']),
  insightId: z.string(),
  snoozeDays: z.number().int().min(1).max(30).optional(),
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

async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `analytics-insights:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return { error: apiResponse.rateLimited(60, requestId), session: null, rateLimitResult };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: apiResponse.unauthorized('Authentication required', requestId), session: null, rateLimitResult };
  }

  return { error: null, session, rateLimitResult };
}

function generateInsightId(type: string, category: string): string {
  return `insight_${type}_${category}_${Date.now().toString(36)}`;
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(new NextResponse(null, { status: 401 }), requestId, rateLimitResult);
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Insight-Version', '1.0');

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD analytics/insights failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const queryValidation = querySchema.safeParse({
      days: searchParams.get('days') || '30',
      categories: searchParams.get('categories'),
      includeRecommendations: searchParams.get('includeRecommendations'),
      limit: searchParams.get('limit') || '20',
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const params = queryValidation.data;
    const endDate = new Date();
    const startDate = subDays(endDate, params.days);
    const previousStartDate = subDays(startDate, params.days);

    // Fetch data
    const [user, currentEntries, previousEntries, goals, recentAchievements] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          currentStreak: true,
          longestStreak: true,
          lastActivityDate: true,
          totalProblems: true,
          totalCommits: true,
        },
      }),
      prisma.trackerEntry.findMany({
        where: { userId, date: { gte: startDate, lte: endDate } },
        select: { date: true, problemsSolved: true, commits: true, timeSpent: true },
      }),
      prisma.trackerEntry.findMany({
        where: { userId, date: { gte: previousStartDate, lt: startDate } },
        select: { problemsSolved: true, commits: true, timeSpent: true },
      }),
      prisma.goal.findMany({
        where: { userId, status: 'ACTIVE' },
        select: { id: true, title: true, progress: true, deadline: true },
      }),
      prisma.userAchievement.findMany({
        where: { userId },
        orderBy: { unlockedAt: 'desc' },
        take: 5,
        include: { achievement: { select: { title: true, tier: true } } },
      }),
    ]);

    // Calculate stats
    const currentStats = {
      problems: currentEntries.reduce((sum, e) => sum + e.problemsSolved, 0),
      commits: currentEntries.reduce((sum, e) => sum + e.commits, 0),
      time: currentEntries.reduce((sum, e) => sum + e.timeSpent, 0),
      activeDays: new Set(currentEntries.map(e => e.date.toDateString())).size,
    };

    const previousStats = {
      problems: previousEntries.reduce((sum, e) => sum + e.problemsSolved, 0),
      commits: previousEntries.reduce((sum, e) => sum + e.commits, 0),
      time: previousEntries.reduce((sum, e) => sum + e.timeSpent, 0),
    };

    // Generate insights
    const insights: Insight[] = [];

    // Streak insights
    if (user?.currentStreak && user.currentStreak >= 7) {
      insights.push({
        id: generateInsightId('streak', 'streak'),
        type: 'celebration',
        priority: 'high',
        category: 'streak',
        title: 'Streak on Fire! 🔥',
        message: `You're on a ${user.currentStreak}-day streak! Keep it going!`,
        icon: 'Flame',
        color: '#EF4444',
        metadata: { streakDays: user.currentStreak },
      });
    }

    if (user?.currentStreak === user?.longestStreak && user?.currentStreak && user.currentStreak > 1) {
      insights.push({
        id: generateInsightId('milestone', 'streak'),
        type: 'milestone',
        priority: 'high',
        category: 'streak',
        title: 'Personal Best! 🏆',
        message: `This is your longest streak ever: ${user.currentStreak} days!`,
        icon: 'Trophy',
        color: '#F59E0B',
      });
    }

    // Improvement insights
    if (previousStats.problems > 0) {
      const changePercent = Math.round(((currentStats.problems - previousStats.problems) / previousStats.problems) * 100);

      if (changePercent >= 20) {
        insights.push({
          id: generateInsightId('improvement', 'problems'),
          type: 'improvement',
          priority: 'medium',
          category: 'problems',
          title: 'Great Progress! 📈',
          message: `You solved ${changePercent}% more problems compared to the previous period!`,
          icon: 'TrendingUp',
          color: '#10B981',
          metadata: { changePercent, current: currentStats.problems, previous: previousStats.problems },
        });
      } else if (changePercent <= -20) {
        insights.push({
          id: generateInsightId('decline', 'problems'),
          type: 'warning',
          priority: 'medium',
          category: 'problems',
          title: 'Activity Decreased',
          message: `Your problem-solving decreased by ${Math.abs(changePercent)}%. Try to stay consistent!`,
          icon: 'TrendingDown',
          color: '#F59E0B',
          actionUrl: '/goals',
          actionLabel: 'Set a Goal',
        });
      }
    }

    // Goal insights
    goals.forEach(goal => {
      if (goal.deadline) {
        const daysLeft = differenceInDays(new Date(goal.deadline), new Date());

        if (daysLeft <= 3 && goal.progress < 80) {
          insights.push({
            id: generateInsightId('warning', `goal_${goal.id}`),
            type: 'warning',
            priority: 'critical',
            category: 'goals',
            title: 'Goal at Risk! ⚠️',
            message: `"${goal.title}" is due in ${daysLeft} days with only ${goal.progress}% complete.`,
            icon: 'AlertTriangle',
            color: '#EF4444',
            actionUrl: `/goals/${goal.id}`,
            actionLabel: 'View Goal',
          });
        } else if (daysLeft <= 7 && goal.progress >= 80) {
          insights.push({
            id: generateInsightId('tip', `goal_${goal.id}`),
            type: 'tip',
            priority: 'low',
            category: 'goals',
            title: 'Almost There! 💪',
            message: `"${goal.title}" is ${goal.progress}% complete. Just a little more effort!`,
            icon: 'Target',
            color: '#3B82F6',
          });
        }
      }
    });

    // Recommendations
    const recommendations: Insight[] = [];
    if (params.includeRecommendations) {
      if (currentStats.activeDays < params.days / 2) {
        recommendations.push({
          id: generateInsightId('recommendation', 'consistency'),
          type: 'recommendation',
          priority: 'medium',
          category: 'consistency',
          title: 'Improve Consistency',
          message: 'You were active less than half the days. Try setting daily reminders.',
          icon: 'Calendar',
          color: '#6366F1',
          actionUrl: '/settings/notifications',
          actionLabel: 'Set Reminders',
        });
      }

      if (goals.length === 0) {
        recommendations.push({
          id: generateInsightId('recommendation', 'goals'),
          type: 'recommendation',
          priority: 'medium',
          category: 'goals',
          title: 'Set Your First Goal',
          message: 'Goals help you stay motivated. Create one to track your progress!',
          icon: 'Target',
          color: '#8B5CF6',
          actionUrl: '/goals/new',
          actionLabel: 'Create Goal',
        });
      }
    }

    // Combine and sort insights
    let allInsights = [...insights, ...recommendations];

    // Filter by categories if specified
    if (params.categories && params.categories.length > 0) {
      allInsights = allInsights.filter(i => params.categories!.includes(i.category));
    }

    // Sort by priority
    const priorityOrder: Record<InsightPriority, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    allInsights.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    // Limit results
    allInsights = allInsights.slice(0, params.limit);

    // Build response
    const response = {
      insights: allInsights,
      recommendations: recommendations.slice(0, 5),
      summary: {
        total: allInsights.length,
        byType: allInsights.reduce<Record<string, number>>((acc, i) => {
          acc[i.type] = (acc[i.type] || 0) + 1;
          return acc;
        }, {}),
        byPriority: allInsights.reduce<Record<string, number>>((acc, i) => {
          acc[i.priority] = (acc[i.priority] || 0) + 1;
          return acc;
        }, {}),
      },
      generatedAt: new Date().toISOString(),
    };

    logger.info('Insights generated', {
      userId,
      insightCount: allInsights.length,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(response, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('GET analytics/insights failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to generate insights', requestId), requestId);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const validation = postBodySchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { action, insightId, snoozeDays } = validation.data;

    // In a real implementation, you would store dismissed/snoozed insights
    // For now, we'll just acknowledge the action

    logger.info('Insight action performed', {
      userId,
      action,
      insightId,
      snoozeDays,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success({
        message: `Insight ${action === 'dismiss' ? 'dismissed' : action === 'snooze' ? 'snoozed' : 'marked as helpful'}`,
        insightId,
        action,
      }, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('POST analytics/insights failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to process insight action', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';