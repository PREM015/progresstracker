import { task } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import { UserService } from "@/services/userService";
import { StatsService } from "@/services/statsService";

export const updateUserStats = task({
    id: "update-user-stats",
    run: async (payload: { userId: string }) => {
        const { userId } = payload;

        // Parallelize aggregation and streak calculation
        const [aggregates, streakInfo] = await Promise.all([
            prisma.trackerEntry.aggregate({
                where: { userId, deletedAt: null },
                _sum: {
                    problemsSolved: true,
                    commits: true,
                    projectsCompleted: true,
                    certificationsEarned: true,
                    timeSpent: true,
                    points: true,
                    pointsEarned: true,
                },
            }),
            StatsService.calculateStreak(userId),
        ]);

        const achievementsCount = await prisma.userAchievement.count({
            where: { userId },
        });

        await prisma.user.update({
            where: { id: userId },
            data: {
                totalProblems: aggregates._sum.problemsSolved ?? 0,
                totalCommits: aggregates._sum.commits ?? 0,
                totalProjects: aggregates._sum.projectsCompleted ?? 0,
                totalCertifications: aggregates._sum.certificationsEarned ?? 0,
                totalPoints: (aggregates._sum.points ?? 0) + (aggregates._sum.pointsEarned ?? 0),
                totalAchievements: achievementsCount,
                currentStreak: streakInfo.current,
                longestStreak: streakInfo.longest,
                streakStartDate: streakInfo.streakStartDate,
                lastActivityDate: streakInfo.lastActivityDate || new Date(),
                updatedAt: new Date(),
            },
        });

        return { userId, updated: true };
    },
});
