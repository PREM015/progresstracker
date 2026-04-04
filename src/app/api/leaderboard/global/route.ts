import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import apiResponse from "@/lib/apiResponse";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL = 15 * 60; // 15 minutes

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const timeframe = searchParams.get('timeframe') || 'all'; // all, month, week

    // Determine date filter
    let dateFilter: { gte: Date } | undefined;
    const now = new Date();
    
    if (timeframe === 'week') {
      dateFilter = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
    } else if (timeframe === 'month') {
      dateFilter = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    }

    // Get top users sorted by points
    const [users, total, userRank] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true, isPublic: true },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          totalPoints: true,
          currentStreak: true,
          rank: true,
          totalProblems: true,
          totalCommits: true,
        },
        orderBy: { totalPoints: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.user.count({ where: { isActive: true, isPublic: true } }),
      prisma.user.count({ where: { isPublic: true } }),
    ]);

    const response = apiResponse.paginated(users, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    });

    // Add cache headers
    response.headers.set('Cache-Control', `public, max-age=${CACHE_TTL}`);
    response.headers.set('X-Total-Count', String(total));

    logger.info('Global leaderboard fetched', { page, limit, total });
    return response;
  } catch (error) {
    logger.error('Global leaderboard failed', {}, error);
    return apiResponse.internalError('Failed to fetch leaderboard');
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}
