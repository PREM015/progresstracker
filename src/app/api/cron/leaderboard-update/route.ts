import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { withCronAuth } from '@/lib/server/cron-auth';

export const dynamic = "force-dynamic";

async function _cronHandler(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Fetch users sorted by points
    const users = await prisma.user.findMany({
      where: { isActive: true, deletedAt: null, isPublic: true },
      orderBy: { totalPoints: 'desc' },
      select: { id: true, totalPoints: true, rank: true }
    });

    // 2. Calculate ranks (standard competition ranking: 1,1,3,4)
    let rank = 1;
    const updatePromises = [];

    for (let i = 0; i < users.length; i++) {
      if (i > 0 && users[i].totalPoints < users[i - 1].totalPoints) {
        rank = i + 1;
      }

      if (users[i].rank !== rank) {
        updatePromises.push(prisma.user.update({
          where: { id: users[i].id },
          data: { rank }
        }));
      }
    }

    // 3. Update DB
    if (updatePromises.length > 0) {
      await prisma.$transaction(updatePromises);
    }

    // 4. Clear cached leaderboard
    try {
      await redis.del('leaderboard:global');
    } catch {
      // Non-critical: Redis may be unavailable
    }

    return NextResponse.json({
      success: true,
      data: {
        usersRanked: users.length,
        rankChanges: updatePromises.length,
        duration: Date.now() - startTime
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Leaderboard update failed" },
      { status: 500 }
    );
  }
}

// SECURITY: withCronAuth validates CRON_SECRET and optional IP allowlist
export const GET = withCronAuth(_cronHandler);
export const POST = withCronAuth(_cronHandler);
