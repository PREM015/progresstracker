import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import apiResponse from "@/lib/apiResponse";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse> {
  try {
    const userId = (await params).userId;

    // Get user with their current rank
    const user = await prisma.user.findUnique({
      where: { id: userId, isPublic: true },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        totalPoints: true,
        rank: true,
        currentStreak: true,
        totalProblems: true,
        totalCommits: true,
        createdAt: true,
      }
    });

    if (!user) {
      return apiResponse.notFound('User not found');
    }

    // Get current rank by counting users with more points
    const exactRank = await prisma.user.count({
      where: {
        totalPoints: { gt: user.totalPoints },
        isActive: true,
        isPublic: true,
      },
    });

    const currentRank = exactRank + 1;

    // Get nearby users (±5 positions)
    const nearbyUsers = await prisma.user.findMany({
      where: { isActive: true, isPublic: true },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        totalPoints: true,
        currentStreak: true,
      },
      orderBy: { totalPoints: 'desc' },
      take: 11,
      skip: Math.max(0, currentRank - 6),
    });

    const response = apiResponse.success({
      user: { ...user, rank: currentRank },
      rank: currentRank,
      totalUsers: await prisma.user.count({ where: { isActive: true, isPublic: true } }),
      nearbyUsers: nearbyUsers.map((u: any, i: number) => ({
        ...u,
        rank: Math.max(0, currentRank - 6) + i + 1,
        isTarget: u.id === userId,
      })),
      percentile: Math.round(((await prisma.user.count({ where: { isActive: true, isPublic: true } }) - currentRank) / await prisma.user.count({ where: { isActive: true, isPublic: true } })) * 100),
    });

    // Add cache headers
    response.headers.set('Cache-Control', 'public, max-age=300');

    logger.info('User leaderboard rank fetched', { userId, rank: currentRank });
    return response;
  } catch (error) {
    logger.error('User leaderboard fetch failed', {}, error);
    return apiResponse.internalError('Failed to fetch user rank');
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}
