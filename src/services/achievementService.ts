// src/services/achievementService.ts

import {prisma} from '@/lib/prisma';
import { 
  Achievement, 
  UserAchievement, 
  AchievementProgress,
  AchievementStats,
  AchievementCategory
} from '@/types/achievement';
import { achievements, getAchievementById } from '@/config/achievements';

export class AchievementService {
  // ========================================
  // GET USER ACHIEVEMENTS
  // ========================================
  static async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
      orderBy: { unlockedAt: 'desc' },
    });

    return userAchievements.map(ua => ({
      id: ua.id,
      oduserId: ua.userId,
      achievementId: ua.achievementId,
      achievement: this.formatAchievement(ua.achievement),
      unlockedAt: ua.unlockedAt,
    }));
  }

  // ========================================
  // GET ACHIEVEMENT PROGRESS
  // ========================================
  static async getAchievementProgress(userId: string): Promise<AchievementProgress[]> {
    const [userAchievements, stats] = await Promise.all([
      prisma.userAchievement.findMany({ where: { userId } }),
      this.getUserStats(userId),
    ]);

    const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));

    return achievements.map(achievement => {
      const isUnlocked = unlockedIds.has(achievement.id);
      const current = this.getCurrentValue(achievement, stats);
      const target = achievement.requirement.value;

      return {
        achievementId: achievement.id,
        achievement,
        current,
        target,
        percentage: Math.min(Math.round((current / target) * 100), 100),
        isUnlocked,
        unlockedAt: userAchievements.find(ua => ua.achievementId === achievement.id)?.unlockedAt,
      };
    });
  }

  // ========================================
  // GET AVAILABLE ACHIEVEMENTS
  // ========================================
  static async getAvailableAchievements(userId: string): Promise<Achievement[]> {
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });

    const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));

    return achievements.filter(a => !unlockedIds.has(a.id) && !a.secret);
  }

  // ========================================
  // GET ACHIEVEMENT STATS
  // ========================================
  static async getAchievementStats(userId: string): Promise<AchievementStats> {
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    });

    const unlockedAchievements = userAchievements.map(ua => 
      this.formatAchievement(ua.achievement)
    );

    const points = unlockedAchievements.reduce((sum, a) => sum + a.points, 0);

    // Calculate by category
    const byCategory: Record<AchievementCategory, { total: number; unlocked: number }> = {
      problems: { total: 0, unlocked: 0 },
      streak: { total: 0, unlocked: 0 },
      consistency: { total: 0, unlocked: 0 },
      goals: { total: 0, unlocked: 0 },
      platforms: { total: 0, unlocked: 0 },
      special: { total: 0, unlocked: 0 },
      milestone: { total: 0, unlocked: 0 },
    };

    const byRarity: Record<string, { total: number; unlocked: number }> = {
      common: { total: 0, unlocked: 0 },
      uncommon: { total: 0, unlocked: 0 },
      rare: { total: 0, unlocked: 0 },
      epic: { total: 0, unlocked: 0 },
      legendary: { total: 0, unlocked: 0 },
    };

    const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));

    achievements.forEach(a => {
      byCategory[a.category].total++;
      byRarity[a.rarity].total++;

      if (unlockedIds.has(a.id)) {
        byCategory[a.category].unlocked++;
        byRarity[a.rarity].unlocked++;
      }
    });

    return {
      total: achievements.length,
      unlocked: userAchievements.length,
      points,
      byCategory,
      byRarity: byRarity as any,
      recentUnlocks: userAchievements.slice(0, 5).map(ua => ({
        id: ua.id,
        oduserId: ua.userId,
        achievementId: ua.achievementId,
        achievement: this.formatAchievement(ua.achievement),
        unlockedAt: ua.unlockedAt,
      })),
    };
  }

  // ========================================
  // UNLOCK ACHIEVEMENT
  // ========================================
  static async unlockAchievement(
    userId: string, 
    achievementId: string
  ): Promise<UserAchievement | null> {
    // Check if already unlocked
    const existing = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: { userId, achievementId },
      },
    });

    if (existing) {
      return null; // Already unlocked
    }

    // Get or create achievement in DB
    let achievement = await prisma.achievement.findUnique({
      where: { id: achievementId },
    });

    if (!achievement) {
      const achievementDef = getAchievementById(achievementId);
      if (!achievementDef) {
        throw new Error(`Achievement ${achievementId} not found`);
      }

      achievement = await prisma.achievement.create({
        data: {
          id: achievementDef.id,
          name: achievementDef.name,
          description: achievementDef.description,
          icon: achievementDef.icon,
        },
      });
    }

    // Create user achievement
    const userAchievement = await prisma.userAchievement.create({
      data: {
        userId,
        achievementId: achievement.id,
      },
      include: { achievement: true },
    });

    return {
      id: userAchievement.id,
      oduserId: userAchievement.userId,
      achievementId: userAchievement.achievementId,
      achievement: this.formatAchievement(userAchievement.achievement),
      unlockedAt: userAchievement.unlockedAt,
    };
  }

  // ========================================
  // CHECK AND UNLOCK ACHIEVEMENTS
  // ========================================
  static async checkAndUnlockAchievements(userId: string): Promise<UserAchievement[]> {
    const [userAchievements, stats] = await Promise.all([
      prisma.userAchievement.findMany({ where: { userId } }),
      this.getUserStats(userId),
    ]);

    const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));
    const newUnlocks: UserAchievement[] = [];

    for (const achievement of achievements) {
      if (unlockedIds.has(achievement.id)) continue;

      const current = this.getCurrentValue(achievement, stats);
      
      if (current >= achievement.requirement.value) {
        const unlocked = await this.unlockAchievement(userId, achievement.id);
        if (unlocked) {
          newUnlocks.push(unlocked);
        }
      }
    }

    return newUnlocks;
  }

  // ========================================
  // CHECK SPECIFIC ACHIEVEMENT TYPES
  // ========================================
  static async checkGoalAchievements(userId: string): Promise<UserAchievement[]> {
    const completedGoals = await prisma.goal.count({
      where: {
        userId,
        completedAt: { not: null },
      },
    });

    const goalAchievements = achievements.filter(
      a => a.category === 'goals' && a.requirement.metric === 'goals_completed'
    );

    const newUnlocks: UserAchievement[] = [];

    for (const achievement of goalAchievements) {
      if (completedGoals >= achievement.requirement.value) {
        const unlocked = await this.unlockAchievement(userId, achievement.id);
        if (unlocked) {
          newUnlocks.push(unlocked);
        }
      }
    }

    return newUnlocks;
  }

  static async checkStreakAchievements(userId: string, streak: number): Promise<UserAchievement[]> {
    const streakAchievements = achievements.filter(
      a => a.category === 'streak' && a.requirement.metric === 'current_streak'
    );

    const newUnlocks: UserAchievement[] = [];

    for (const achievement of streakAchievements) {
      if (streak >= achievement.requirement.value) {
        const unlocked = await this.unlockAchievement(userId, achievement.id);
        if (unlocked) {
          newUnlocks.push(unlocked);
        }
      }
    }

    return newUnlocks;
  }

  static async checkProblemAchievements(userId: string): Promise<UserAchievement[]> {
    const totalProblems = await prisma.trackerEntry.aggregate({
      where: { userId },
      _sum: { problems: true },
    });

    const count = totalProblems._sum.problems || 0;
    const problemAchievements = achievements.filter(
      a => a.category === 'problems' && a.requirement.metric === 'problems_solved'
    );

    const newUnlocks: UserAchievement[] = [];

    for (const achievement of problemAchievements) {
      if (count >= achievement.requirement.value) {
        const unlocked = await this.unlockAchievement(userId, achievement.id);
        if (unlocked) {
          newUnlocks.push(unlocked);
        }
      }
    }

    return newUnlocks;
  }

  // ========================================
  // HELPER METHODS
  // ========================================
  private static async getUserStats(userId: string) {
    const [
      problemsCount,
      goalsCount,
      platformsCount,
      streakData,
      daysActive,
    ] = await Promise.all([
      prisma.trackerEntry.aggregate({
        where: { userId },
        _sum: { problems: true },
      }),
      prisma.goal.count({
        where: { userId, completedAt: { not: null } },
      }),
      prisma.userPlatform.count({ where: { userId } }),
      this.calculateStreak(userId),
      prisma.trackerEntry.groupBy({
        by: ['date'],
        where: { userId },
      }),
    ]);

    return {
      problems_solved: problemsCount._sum.problems || 0,
      goals_completed: goalsCount,
      platforms_connected: platformsCount,
      current_streak: streakData.current,
      longest_streak: streakData.longest,
      days_active: daysActive.length,
    };
  }

  private static async calculateStreak(userId: string) {
    // Simplified streak calculation
    const entries = await prisma.trackerEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    if (entries.length === 0) return { current: 0, longest: 0 };

    // Implementation similar to GoalService
    let current = 1;
    let longest = 1;

    return { current, longest };
  }

  private static getCurrentValue(achievement: Achievement, stats: any): number {
    const metric = achievement.requirement.metric;
    return stats[metric] || 0;
  }

  private static formatAchievement(dbAchievement: any): Achievement {
    const configAchievement = getAchievementById(dbAchievement.id || dbAchievement.name);
    
    if (configAchievement) {
      return configAchievement;
    }

    // Fallback
    return {
      id: dbAchievement.id,
      name: dbAchievement.name,
      description: dbAchievement.description,
      icon: dbAchievement.icon || '🏆',
      category: 'special',
      rarity: 'common',
      points: 10,
      requirement: { type: 'count', metric: 'custom', value: 1 },
    };
  }
}

export default AchievementService;