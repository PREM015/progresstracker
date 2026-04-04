import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkUserAchievements } from "@/services/achievementService";
import { withCronAuth } from '@/lib/server/cron-auth';

export const dynamic = "force-dynamic";

async function _cronHandler(req: NextRequest) {
  const startTime = Date.now();
  let usersChecked = 0;
  let achievementsUnlocked = 0;
  const newUnlocks: unknown[] = [];
  let errors = 0;

  const BATCH_SIZE = 100;
  let skip = 0;
  let hasMore = true;

  try {
    while (hasMore) {
      const users = await prisma.user.findMany({
        where: { isActive: true, deletedAt: null },
        select: { id: true, totalProblems: true, totalCommits: true, currentStreak: true },
        skip,
        take: BATCH_SIZE
      });

      if (users.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        skip += BATCH_SIZE;
      }

      for (const user of users) {
        usersChecked++;
        try {
          const result = await checkUserAchievements(user.id);
          if (Array.isArray(result) && result.length > 0) {
            achievementsUnlocked += result.length;
            newUnlocks.push(...result);
          }
        } catch (e) {
          errors++;
          console.error(`Failed to check achievements for user ${user.id}`, e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        usersChecked,
        achievementsUnlocked,
        newUnlocks,
        errors,
        duration: Date.now() - startTime
      }
    });

  } catch (e: any) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// SECURITY: withCronAuth validates CRON_SECRET and optional IP allowlist
export const GET = withCronAuth(_cronHandler);
export const POST = withCronAuth(_cronHandler);
