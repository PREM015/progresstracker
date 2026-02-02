// src/app/api/analytics/predictions/route.ts
// =============================================================================
// AI-Powered Predictions
// =============================================================================
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
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { subDays, differenceInDays, format, eachDayOfInterval } from 'date-fns';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 20;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Cache-Control': 'private, max-age=600',
};

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface Prediction {
  id: string;
  type: string;
  title: string;
  description: string;
  prediction: string | number;
  confidence: number;
  factors: string[];
  timeframe: string;
}

interface TrackerEntryData {
  date: Date;
  problemsSolved: number;
  commits: number;
  timeSpent: number;
}

type MetricType = 'problems' | 'commits' | 'time' | 'streak';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  types: z.string().optional().transform(v => v ? v.split(',') : undefined),
  includeFactors: z.enum(['true', 'false']).optional().transform(v => v !== 'false'),
});

const postBodySchema = z.object({
  goalId: z.string().cuid().optional(),
  targetDate: z.string().datetime().optional(),
  targetValue: z.number().positive().optional(),
  metric: z.enum(['problems', 'commits', 'time', 'streak']).optional(),
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
  const rateLimitKey = `analytics-predictions:${ip}`;
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

function calculateLinearRegression(data: number[]): { slope: number; intercept: number; r2: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0] || 0, r2: 0 };

  const xMean = (n - 1) / 2;
  const yMean = data.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  let ssRes = 0;
  let ssTot = 0;

  data.forEach((y, x) => {
    numerator += (x - xMean) * (y - yMean);
    denominator += (x - xMean) ** 2;
    ssTot += (y - yMean) ** 2;
  });

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  // Calculate R²
  data.forEach((y, x) => {
    const predicted = slope * x + intercept;
    ssRes += (y - predicted) ** 2;
  });

  const r2 = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;

  return { slope, intercept, r2: Math.max(0, r2) };
}

function predictStreakContinuation(
  currentStreak: number,
  activityPattern: boolean[],
  dayOfWeek: number
): { probability: number; factors: string[] } {
  const factors: string[] = [];
  let probability = 0.5; // Base probability

  // Factor 1: Current streak length
  if (currentStreak >= 30) {
    probability += 0.2;
    factors.push('Strong habit formed (30+ day streak)');
  } else if (currentStreak >= 14) {
    probability += 0.15;
    factors.push('Building momentum (14+ day streak)');
  } else if (currentStreak >= 7) {
    probability += 0.1;
    factors.push('Week-long consistency');
  }

  // Factor 2: Day of week pattern
  const sameDayActivity = activityPattern.filter((_, i) => i % 7 === dayOfWeek);
  const sameDayRate = sameDayActivity.length > 0
    ? sameDayActivity.filter(Boolean).length / sameDayActivity.length
    : 0.5;

  if (sameDayRate >= 0.8) {
    probability += 0.15;
    factors.push(`High activity on ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]}s`);
  } else if (sameDayRate < 0.3) {
    probability -= 0.1;
    factors.push(`Lower activity typically on ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]}s`);
  }

  // Factor 3: Recent consistency
  const last7Days = activityPattern.slice(-7);
  const recentRate = last7Days.filter(Boolean).length / 7;
  if (recentRate >= 0.9) {
    probability += 0.1;
    factors.push('Very consistent in last 7 days');
  }

  return {
    probability: Math.min(0.95, Math.max(0.05, probability)),
    factors,
  };
}

/**
 * Helper function to get metric value from entry in a type-safe way
 */
function getEntryMetricValue(entry: TrackerEntryData, metric: MetricType): number {
  switch (metric) {
    case 'problems':
      return entry.problemsSolved;
    case 'commits':
      return entry.commits;
    case 'time':
      return entry.timeSpent;
    case 'streak':
      // For streak, we check if there was any activity
      return entry.problemsSolved > 0 || entry.commits > 0 ? 1 : 0;
    default:
      return 0;
  }
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
    response.headers.set('X-Prediction-Model', 'v1.0');

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD analytics/predictions failed', { requestId }, error);
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
      types: searchParams.get('types'),
      includeFactors: searchParams.get('includeFactors'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const params = queryValidation.data;

    // Fetch historical data
    const endDate = new Date();
    const startDate = subDays(endDate, 90);

    const [user, entries, goals] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          currentStreak: true,
          longestStreak: true,
          lastActivityDate: true,
          totalProblems: true,
        },
      }),
      prisma.trackerEntry.findMany({
        where: { userId, date: { gte: startDate, lte: endDate } },
        select: { date: true, problemsSolved: true, commits: true, timeSpent: true },
        orderBy: { date: 'asc' },
      }),
      prisma.goal.findMany({
        where: { userId, status: 'ACTIVE' },
        select: { id: true, title: true, progress: true, target: true, deadline: true, startDate: true },
      }),
    ]);

    // Type the entries properly
    const typedEntries: TrackerEntryData[] = entries;

    // Prepare daily data
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    const dailyProblems: number[] = [];
    const dailyCommits: number[] = [];
    const dailyActivity: boolean[] = [];

    allDays.forEach(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayEntries = typedEntries.filter(e => format(e.date, 'yyyy-MM-dd') === dayStr);
      const problems = dayEntries.reduce((sum, e) => sum + e.problemsSolved, 0);
      const commits = dayEntries.reduce((sum, e) => sum + e.commits, 0);

      dailyProblems.push(problems);
      dailyCommits.push(commits);
      dailyActivity.push(problems > 0 || commits > 0);
    });

    // Generate predictions
    const predictions: Prediction[] = [];

    // 1. Streak continuation prediction
    if (!params.types || params.types.includes('streak')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayOfWeek = tomorrow.getDay();

      const streakPrediction = predictStreakContinuation(
        user?.currentStreak || 0,
        dailyActivity,
        dayOfWeek
      );

      predictions.push({
        id: 'pred_streak_continuation',
        type: 'streak',
        title: 'Streak Continuation',
        description: 'Likelihood of maintaining your streak tomorrow',
        prediction: `${Math.round(streakPrediction.probability * 100)}%`,
        confidence: Math.round(streakPrediction.probability * 100),
        factors: params.includeFactors ? streakPrediction.factors : [],
        timeframe: 'Tomorrow',
      });
    }

    // 2. Weekly problems prediction
    if (!params.types || params.types.includes('problems')) {
      const last4Weeks = dailyProblems.slice(-28);
      const weeklyAverages: number[] = [];

      for (let i = 0; i < 4; i++) {
        const weekData = last4Weeks.slice(i * 7, (i + 1) * 7);
        weeklyAverages.push(weekData.reduce((a, b) => a + b, 0));
      }

      const regression = calculateLinearRegression(weeklyAverages);
      const predictedNext = Math.max(0, Math.round(regression.slope * 4 + regression.intercept));

      predictions.push({
        id: 'pred_weekly_problems',
        type: 'problems',
        title: 'Next Week Problems',
        description: 'Predicted number of problems you\'ll solve next week',
        prediction: predictedNext,
        confidence: Math.round(regression.r2 * 100),
        factors: params.includeFactors ? [
          `Based on 4-week trend`,
          `Weekly average: ${Math.round(weeklyAverages.reduce((a, b) => a + b, 0) / 4)}`,
          regression.slope > 0 ? 'Upward trend detected' : regression.slope < 0 ? 'Slight decline in activity' : 'Stable activity',
        ] : [],
        timeframe: 'Next 7 days',
      });
    }

    // 3. Goal completion predictions
    if (!params.types || params.types.includes('goals')) {
      for (const goal of goals) {
        if (!goal.deadline) continue;

        const daysRemaining = differenceInDays(new Date(goal.deadline), new Date());
        if (daysRemaining <= 0) continue;

        const progressNeeded = goal.target - goal.progress;
        const daysSinceStart = differenceInDays(new Date(), new Date(goal.startDate));
        const dailyRate = daysSinceStart > 0 ? goal.progress / daysSinceStart : 0;

        const projectedCompletion = dailyRate > 0 ? Math.round(progressNeeded / dailyRate) : Infinity;
        const willComplete = projectedCompletion <= daysRemaining;
        const probability = willComplete ? Math.min(95, Math.round((daysRemaining / projectedCompletion) * 100)) : Math.max(5, 100 - Math.round((projectedCompletion / daysRemaining) * 10));

        predictions.push({
          id: `pred_goal_${goal.id}`,
          type: 'goal',
          title: `Goal: ${goal.title}`,
          description: `Likelihood of completing this goal by deadline`,
          prediction: willComplete ? 'Likely' : 'At Risk',
          confidence: probability,
          factors: params.includeFactors ? [
            `Current progress: ${goal.progress}/${goal.target}`,
            `Days remaining: ${daysRemaining}`,
            `Daily rate needed: ${Math.ceil(progressNeeded / daysRemaining)}`,
            `Current daily rate: ${dailyRate.toFixed(1)}`,
          ] : [],
          timeframe: `${daysRemaining} days`,
        });
      }
    }

    // 4. Optimal activity times
    if (!params.types || params.types.includes('optimal_times')) {
      // Analyze activity by day of week
      const dayOfWeekActivity: number[] = [0, 0, 0, 0, 0, 0, 0];
      const dayOfWeekCount: number[] = [0, 0, 0, 0, 0, 0, 0];

      typedEntries.forEach(entry => {
        const dow = entry.date.getDay();
        dayOfWeekActivity[dow] += entry.problemsSolved;
        dayOfWeekCount[dow]++;
      });

      const dayOfWeekAvg = dayOfWeekActivity.map((total, i) =>
        dayOfWeekCount[i] > 0 ? total / dayOfWeekCount[i] : 0
      );

      const bestDayIndex = dayOfWeekAvg.indexOf(Math.max(...dayOfWeekAvg));
      const bestDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][bestDayIndex];

      predictions.push({
        id: 'pred_optimal_day',
        type: 'optimal_times',
        title: 'Most Productive Day',
        description: 'Your most productive day of the week',
        prediction: bestDay,
        confidence: 75,
        factors: params.includeFactors ? [
          `Average ${dayOfWeekAvg[bestDayIndex].toFixed(1)} problems on ${bestDay}s`,
          'Based on last 90 days of activity',
        ] : [],
        timeframe: 'Weekly pattern',
      });
    }

    // Build response
    const response = {
      predictions,
      generatedAt: new Date().toISOString(),
      modelVersion: '1.0',
      dataPoints: entries.length,
    };

    logger.info('Predictions generated', {
      userId,
      predictionCount: predictions.length,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(response, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('GET analytics/predictions failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to generate predictions', requestId), requestId);
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

    const { goalId, targetDate, targetValue, metric } = validation.data;

    // Custom prediction based on input
    const entries: TrackerEntryData[] = await prisma.trackerEntry.findMany({
      where: { userId, date: { gte: subDays(new Date(), 90) } },
      select: { date: true, problemsSolved: true, commits: true, timeSpent: true },
      orderBy: { date: 'asc' },
    });

    let prediction: Prediction;

    if (goalId) {
      // Predict specific goal completion
      const goal = await prisma.goal.findFirst({
        where: { id: goalId, userId },
      });

      if (!goal) {
        return addHeaders(apiResponse.notFound('Goal', requestId), requestId, rateLimitResult);
      }

      const daysRemaining = goal.deadline ? differenceInDays(new Date(goal.deadline), new Date()) : 30;
      const progressNeeded = goal.target - goal.progress;
      const daysSinceStart = differenceInDays(new Date(), new Date(goal.startDate));
      const dailyRate = daysSinceStart > 0 ? goal.progress / daysSinceStart : 1;

      const estimatedDays = dailyRate > 0 ? Math.ceil(progressNeeded / dailyRate) : Infinity;

      prediction = {
        id: `pred_custom_goal_${goalId}`,
        type: 'goal_analysis',
        title: `Analysis: ${goal.title}`,
        description: 'Custom goal completion analysis',
        prediction: estimatedDays <= daysRemaining ? 'On Track' : 'Behind Schedule',
        confidence: Math.min(90, Math.max(10, Math.round((dailyRate / (progressNeeded / daysRemaining)) * 100))),
        factors: [
          `Current progress: ${goal.progress}/${goal.target}`,
          `Days until deadline: ${daysRemaining}`,
          `Estimated completion: ${estimatedDays} days`,
          `Required daily rate: ${(progressNeeded / daysRemaining).toFixed(1)}`,
        ],
        timeframe: `${daysRemaining} days`,
      };
    } else if (targetDate && targetValue && metric) {
      // Predict if target is achievable
      const daysUntilTarget = differenceInDays(new Date(targetDate), new Date());

      // Use type-safe helper function instead of unsafe cast
      const dailyValues = entries.map(e => getEntryMetricValue(e, metric));
      const avgDaily = dailyValues.length > 0
        ? dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length
        : 0;

      const projectedValue = avgDaily * daysUntilTarget;
      const isAchievable = projectedValue >= targetValue;

      prediction = {
        id: 'pred_custom_target',
        type: 'target_analysis',
        title: `Target Analysis: ${targetValue} ${metric}`,
        description: `Can you reach ${targetValue} ${metric} by ${format(new Date(targetDate), 'MMM d, yyyy')}?`,
        prediction: isAchievable ? 'Achievable' : 'Challenging',
        confidence: Math.min(85, Math.round((projectedValue / targetValue) * 100)),
        factors: [
          `Target: ${targetValue} ${metric}`,
          `Days remaining: ${daysUntilTarget}`,
          `Your daily average: ${avgDaily.toFixed(1)}`,
          `Projected total: ${Math.round(projectedValue)}`,
          `Required daily: ${(targetValue / daysUntilTarget).toFixed(1)}`,
        ],
        timeframe: `${daysUntilTarget} days`,
      };
    } else {
      return addHeaders(
        apiResponse.validationError('Provide goalId or (targetDate, targetValue, metric)', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    logger.info('Custom prediction generated', {
      userId,
      type: prediction.type,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success({ prediction }, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('POST analytics/predictions failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to generate prediction', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';