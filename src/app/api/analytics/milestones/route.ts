// src/app/api/analytics/milestones/route.ts
// =============================================================================
// Milestones & Achievements Progress
// =============================================================================
// Methods: GET, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 50 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 50;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Cache-Control': 'private, max-age=120',
};

// Predefined milestones
const PROBLEM_MILESTONES = [1, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
const COMMIT_MILESTONES = [1, 10, 50, 100, 250, 500, 1000, 2500, 5000];
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 90, 100, 180, 365];
const POINT_MILESTONES = [100, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  includeUpcoming: z.enum(['true', 'false']).optional().transform(v => v !== 'false'),
  includeCompleted: z.enum(['true', 'false']).optional().transform(v => v !== 'false'),
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
  const rateLimitKey = `analytics-milestones:${ip}`;
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

interface Milestone {
  id: string;
  type: 'problems' | 'commits' | 'streak' | 'points';
  target: number;
  current: number;
  progress: number;
  isCompleted: boolean;
  title: string;
  description: string;
  icon: string;
  color: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
}

function getMilestoneTier(index: number, total: number): 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' {
  const ratio = index / total;
  if (ratio < 0.2) return 'bronze';
  if (ratio < 0.4) return 'silver';
  if (ratio < 0.6) return 'gold';
  if (ratio < 0.8) return 'platinum';
  return 'diamond';
}

function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
    diamond: '#B9F2FF',
  };
  return colors[tier] || '#6B7280';
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
    response.headers.set('X-Milestone-Types', 'problems,commits,streak,points');

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD analytics/milestones failed', { requestId }, error);
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
      includeUpcoming: searchParams.get('includeUpcoming'),
      includeCompleted: searchParams.get('includeCompleted'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const params = queryValidation.data;

    // Get user stats
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalProblems: true,
        totalCommits: true,
        totalPoints: true,
        currentStreak: true,
        longestStreak: true,
      },
    });

    if (!user) {
      return addHeaders(apiResponse.notFound('User', requestId), requestId, rateLimitResult);
    }

    // Build milestones
    const allMilestones: Milestone[] = [];

    // Problem milestones
    PROBLEM_MILESTONES.forEach((target, index) => {
      const isCompleted = user.totalProblems >= target;
      const progress = Math.min(100, Math.round((user.totalProblems / target) * 100));
      const tier = getMilestoneTier(index, PROBLEM_MILESTONES.length);

      allMilestones.push({
        id: `problems_${target}`,
        type: 'problems',
        target,
        current: user.totalProblems,
        progress,
        isCompleted,
        title: `${target} Problems Solved`,
        description: `Solve ${target} problems across all platforms`,
        icon: 'Code',
        color: getTierColor(tier),
        tier,
      });
    });

    // Commit milestones
    COMMIT_MILESTONES.forEach((target, index) => {
      const isCompleted = user.totalCommits >= target;
      const progress = Math.min(100, Math.round((user.totalCommits / target) * 100));
      const tier = getMilestoneTier(index, COMMIT_MILESTONES.length);

      allMilestones.push({
        id: `commits_${target}`,
        type: 'commits',
        target,
        current: user.totalCommits,
        progress,
        isCompleted,
        title: `${target} Commits`,
        description: `Make ${target} commits`,
        icon: 'GitCommit',
        color: getTierColor(tier),
        tier,
      });
    });

    // Streak milestones
    STREAK_MILESTONES.forEach((target, index) => {
      const isCompleted = user.longestStreak >= target;
      const progress = Math.min(100, Math.round((user.currentStreak / target) * 100));
      const tier = getMilestoneTier(index, STREAK_MILESTONES.length);

      allMilestones.push({
        id: `streak_${target}`,
        type: 'streak',
        target,
        current: user.currentStreak,
        progress,
        isCompleted,
        title: `${target}-Day Streak`,
        description: `Maintain a ${target}-day activity streak`,
        icon: 'Flame',
        color: getTierColor(tier),
        tier,
      });
    });

    // Point milestones
    POINT_MILESTONES.forEach((target, index) => {
      const isCompleted = user.totalPoints >= target;
      const progress = Math.min(100, Math.round((user.totalPoints / target) * 100));
      const tier = getMilestoneTier(index, POINT_MILESTONES.length);

      allMilestones.push({
        id: `points_${target}`,
        type: 'points',
        target,
        current: user.totalPoints,
        progress,
        isCompleted,
        title: `${target.toLocaleString()} Points`,
        description: `Earn ${target.toLocaleString()} total points`,
        icon: 'Star',
        color: getTierColor(tier),
        tier,
      });
    });

    // Filter based on params
    let filteredMilestones = allMilestones;

    if (!params.includeCompleted) {
      filteredMilestones = filteredMilestones.filter(m => !m.isCompleted);
    }

    if (!params.includeUpcoming) {
      filteredMilestones = filteredMilestones.filter(m => m.isCompleted || m.progress > 0);
    }

    // Sort: in-progress first, then by progress descending
    filteredMilestones.sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      return b.progress - a.progress;
    });

    // Get next milestone for each type
    const nextMilestones = ['problems', 'commits', 'streak', 'points'].reduce<Record<string, Milestone | null>>((acc, type) => {
      const next = allMilestones.find(m => m.type === type && !m.isCompleted);
      acc[type] = next || null;
      return acc;
    }, {});

    // Summary stats
    const completed = allMilestones.filter(m => m.isCompleted).length;
    const total = allMilestones.length;

    // Build response
    const response = {
      milestones: filteredMilestones,
      next: nextMilestones,
      summary: {
        completed,
        total,
        completionRate: Math.round((completed / total) * 100),
        byType: {
          problems: {
            completed: PROBLEM_MILESTONES.filter(t => user.totalProblems >= t).length,
            total: PROBLEM_MILESTONES.length,
          },
          commits: {
            completed: COMMIT_MILESTONES.filter(t => user.totalCommits >= t).length,
            total: COMMIT_MILESTONES.length,
          },
          streak: {
            completed: STREAK_MILESTONES.filter(t => user.longestStreak >= t).length,
            total: STREAK_MILESTONES.length,
          },
          points: {
            completed: POINT_MILESTONES.filter(t => user.totalPoints >= t).length,
            total: POINT_MILESTONES.length,
          },
        },
        byTier: {
          bronze: allMilestones.filter(m => m.tier === 'bronze' && m.isCompleted).length,
          silver: allMilestones.filter(m => m.tier === 'silver' && m.isCompleted).length,
          gold: allMilestones.filter(m => m.tier === 'gold' && m.isCompleted).length,
          platinum: allMilestones.filter(m => m.tier === 'platinum' && m.isCompleted).length,
          diamond: allMilestones.filter(m => m.tier === 'diamond' && m.isCompleted).length,
        },
      },
      current: {
        problems: user.totalProblems,
        commits: user.totalCommits,
        streak: user.currentStreak,
        longestStreak: user.longestStreak,
        points: user.totalPoints,
      },
    };

    logger.info('Milestones fetched', {
      userId,
      completed,
      total,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(response, { meta: { requestId } }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.error('GET analytics/milestones failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch milestones', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';