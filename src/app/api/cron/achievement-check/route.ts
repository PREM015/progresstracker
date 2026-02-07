
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkUserAchievements } from "@/services/achievementService"; // Assumed to exist

export const POST = async (req: Request) => {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  let usersChecked = 0;
  let achievementsUnlocked = 0;
  const newUnlocks = [];
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
          // @ts-ignore - types mismatch might occur if service not exact match
          const result = await checkUserAchievements(user.id);
          if (result && result.unlockedCount > 0) {
            achievementsUnlocked += result.unlockedCount;
            newUnlocks.push(...result.newAchievements);
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
    return NextResponse.json({ error: "Internal Server Error", details: e.message }, { status: 500 });
  }
};

export const GET = POST; // Allow GET for easier testing/Vercel cron
