// src/trigger/achievement-check.ts
// New file: Check and unlock achievements after sync

import { task } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface CheckAchievementsPayload {
  userId: string;
}

interface AchievementCheckResult {
  checked: number;
  unlocked: string[];
}

export const checkAchievementsTask = task({
  id: "check-achievements",
  maxDuration: 60,
  run: async (payload: CheckAchievementsPayload): Promise<AchievementCheckResult> => {
    const { userId } = payload;

    logger.info(`Checking achievements for user`, { userId });

    // Get user stats
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalProblems: true,
        totalCommits: true,
        currentStreak: true,
        longestStreak: true,
        totalAchievements: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Get all achievements user doesn't have yet
    const existingAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });

    const existingIds = new Set(existingAchievements.map((a) => a.achievementId));

    const availableAchievements = await prisma.achievement.findMany({
      where: {
        isActive: true,
        id: { notIn: Array.from(existingIds) },
      },
    });

    const unlocked: string[] = [];

    for (const achievement of availableAchievements) {
      const requirement = achievement.requirement as Record<string, unknown> | null;
      if (!requirement) continue;

      let shouldUnlock = false;

      switch (requirement.type) {
        case "problems_solved":
          shouldUnlock = user.totalProblems >= (requirement.value as number);
          break;
        case "commits":
          shouldUnlock = user.totalCommits >= (requirement.value as number);
          break;
        case "streak":
          shouldUnlock = user.currentStreak >= (requirement.value as number);
          break;
        case "longest_streak":
          shouldUnlock = user.longestStreak >= (requirement.value as number);
          break;
        default:
          continue;
      }

      if (shouldUnlock) {
        await prisma.userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id,
            progress: requirement.value as number,
            progressPercentage: 100,
            unlockedAt: new Date(),
          },
        });

        // Create notification
        await prisma.notification.create({
          data: {
            userId,
            type: "ACHIEVEMENT_UNLOCKED",
            priority: "NORMAL",
            title: `🏆 Achievement Unlocked!`,
            message: `You've earned: ${achievement.title}`,
            actionUrl: "/achievements",
            actionLabel: "View Achievement",
            metadata: {
              achievementId: achievement.id,
              achievementTitle: achievement.title,
              tier: achievement.tier,
              points: achievement.points,
            },
          },
        });

        // Update achievement stats
        await prisma.achievement.update({
          where: { id: achievement.id },
          data: {
            totalUnlocked: { increment: 1 },
          },
        });

        unlocked.push(achievement.title);
        logger.info(`Achievement unlocked: ${achievement.title}`, { userId, achievementId: achievement.id });
      }
    }

    // Update user achievement count if any unlocked
    if (unlocked.length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          totalAchievements: { increment: unlocked.length },
        },
      });
    }

    return {
      checked: availableAchievements.length,
      unlocked,
    };
  },
});