// src/services/achievementService.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { 
  Achievement as DbAchievement, 
  UserAchievement as DbUserAchievement,
  PlatformCategory,
  Prisma
} from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export type AchievementCategory = 
  | 'problems' 
  | 'streak' 
  | 'consistency' 
  | 'goals' 
  | 'platforms' 
  | 'special' 
  | 'milestone';

export type AchievementRarity = 
  | 'common' 
  | 'uncommon' 
  | 'rare' 
  | 'epic' 
  | 'legendary';

export type AchievementTier = 
  | 'bronze' 
  | 'silver' 
  | 'gold' 
  | 'platinum' 
  | 'diamond';

export interface AchievementRequirement {
  type: 'count' | 'streak' | 'milestone' | 'special';
  metric: string;
  value: number;
  platform?: string;
}

export interface Achievement {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: PlatformCategory;
  tier: AchievementTier;
  icon: string;
  color?: string;
  badgeImage?: string;
  points: number;
  xpReward: number;
  rarity: AchievementRarity;
  requirement: AchievementRequirement;
  requirementText?: string;
  isHidden: boolean;
  isSecret: boolean;
  isActive: boolean;
}

export interface UserAchievementWithDetails {
  id: string;
  userId: string;
  achievementId: string;
  achievement: Achievement;
  progress: number;
  progressPercentage: number;
  currentThreshold: number;
  unlockedAt: Date;
  isPinned: boolean;
  isHidden: boolean;
}

export interface AchievementProgress {
  achievementId: string;
  achievement: Achievement;
  current: number;
  target: number;
  percentage: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
}

export interface AchievementStats {
  total: number;
  unlocked: number;
  points: number;
  byCategory: Record<string, { total: number; unlocked: number }>;
  byRarity: Record<AchievementRarity, { total: number; unlocked: number }>;
  byTier: Record<AchievementTier, { total: number; unlocked: number }>;
  recentUnlocks: UserAchievementWithDetails[];
}

interface UserStats {
  problems_solved: number;
  goals_completed: number;
  platforms_connected: number;
  current_streak: number;
  longest_streak: number;
  days_active: number;
  total_commits: number;
  total_time_spent: number;
}

// =============================================================================
// ACHIEVEMENT SERVICE
// =============================================================================

export class AchievementService {
  private static readonly log = logger.child({ service: 'AchievementService' });

  // ===========================================================================
  // GET USER ACHIEVEMENTS
  // ===========================================================================

  static async getUserAchievements(userId: string): Promise<UserAchievementWithDetails[]> {
    try {
      const userAchievements = await prisma.userAchievement.findMany({
        where: { userId },
        include: {
          achievement: true,
        },
        orderBy: { unlockedAt: 'desc' },
      });

      this.log.info('User achievements fetched', { userId, count: userAchievements.length });

      return userAchievements.map((ua) => this.formatUserAchievement(ua));
    } catch (error) {
      this.log.error('Error fetching user achievements', { userId }, error);
      throw error;
    }
  }

  static async getPinnedAchievements(userId: string, limit: number = 5) {
    try {
      const userAchievements = await prisma.userAchievement.findMany({
        where: { 
          userId,
          isPinned: true,
          isHidden: false,
        },
        include: { achievement: true },
        orderBy: { unlockedAt: 'desc' },
        take: limit,
      });

      this.log.info('Pinned achievements fetched', { userId, count: userAchievements.length });

      return userAchievements.map((ua) => this.formatUserAchievement(ua));
    } catch (error) {
      this.log.error('Error fetching pinned achievements', { userId }, error);
      throw error;
    }
  }

  // ===========================================================================
  // GET ACHIEVEMENT PROGRESS
  // ===========================================================================

  static async getAchievementProgress(userId: string): Promise<AchievementProgress[]> {
    try {
      const [userAchievements, allAchievements, stats] = await Promise.all([
        prisma.userAchievement.findMany({ where: { userId } }),
        prisma.achievement.findMany({ 
          where: { isActive: true },
          orderBy: [
            { category: 'asc' },
            { sortOrder: 'asc' },
          ],
        }),
        this.getUserStats(userId),
      ]);

      const unlockedMap = new Map(
        userAchievements.map((ua) => [ua.achievementId, ua])
      );

      const progress = allAchievements.map((achievement) => {
        const userAchievement = unlockedMap.get(achievement.id);
        const isUnlocked = !!userAchievement;
        const requirement = this.parseRequirement(achievement.requirement);
        const current = this.getCurrentValue(requirement, stats);
        const target = requirement?.value || 1;

        return {
          achievementId: achievement.id,
          achievement: this.formatAchievement(achievement),
          current,
          target,
          percentage: Math.min(Math.round((current / target) * 100), 100),
          isUnlocked,
          unlockedAt: userAchievement?.unlockedAt,
        };
      });

      this.log.info('Achievement progress calculated', { userId, total: progress.length });

      return progress;
    } catch (error) {
      this.log.error('Error calculating achievement progress', { userId }, error);
      throw error;
    }
  }

  // ===========================================================================
  // GET AVAILABLE ACHIEVEMENTS
  // ===========================================================================

  static async getAvailableAchievements(userId: string): Promise<Achievement[]> {
    try {
      const userAchievements = await prisma.userAchievement.findMany({
        where: { userId },
        select: { achievementId: true },
      });

      const unlockedIds = new Set(userAchievements.map((ua) => ua.achievementId));

      const available = await prisma.achievement.findMany({
        where: {
          isActive: true,
          isSecret: false,
          isHidden: false,
          id: { notIn: Array.from(unlockedIds) },
        },
        orderBy: [
          { tier: 'asc' },
          { points: 'asc' },
        ],
      });

      this.log.info('Available achievements fetched', { userId, count: available.length });

      return available.map((a) => this.formatAchievement(a));
    } catch (error) {
      this.log.error('Error fetching available achievements', { userId }, error);
      throw error;
    }
  }

  // ===========================================================================
  // GET ACHIEVEMENT STATS
  // ===========================================================================

  static async getAchievementStats(userId: string): Promise<AchievementStats> {
    try {
      const [userAchievements, allAchievements] = await Promise.all([
        prisma.userAchievement.findMany({
          where: { userId },
          include: { achievement: true },
          orderBy: { unlockedAt: 'desc' },
        }),
        prisma.achievement.findMany({
          where: { isActive: true },
        }),
      ]);

      const unlockedIds = new Set(userAchievements.map((ua) => ua.achievementId));
      const points = userAchievements.reduce(
        (sum, ua) => sum + (ua.achievement.points || 0),
        0
      );

      const byCategory: Record<string, { total: number; unlocked: number }> = {};
      const byRarity: Record<AchievementRarity, { total: number; unlocked: number }> = {
        common: { total: 0, unlocked: 0 },
        uncommon: { total: 0, unlocked: 0 },
        rare: { total: 0, unlocked: 0 },
        epic: { total: 0, unlocked: 0 },
        legendary: { total: 0, unlocked: 0 },
      };
      const byTier: Record<AchievementTier, { total: number; unlocked: number }> = {
        bronze: { total: 0, unlocked: 0 },
        silver: { total: 0, unlocked: 0 },
        gold: { total: 0, unlocked: 0 },
        platinum: { total: 0, unlocked: 0 },
        diamond: { total: 0, unlocked: 0 },
      };

      allAchievements.forEach((a) => {
        const category = a.category;
        const rarity = (a.rarity || 'common') as AchievementRarity;
        const tier = (a.tier || 'bronze') as AchievementTier;
        const isUnlocked = unlockedIds.has(a.id);

        if (!byCategory[category]) {
          byCategory[category] = { total: 0, unlocked: 0 };
        }
        byCategory[category].total++;
        if (isUnlocked) byCategory[category].unlocked++;

        if (byRarity[rarity]) {
          byRarity[rarity].total++;
          if (isUnlocked) byRarity[rarity].unlocked++;
        }

        if (byTier[tier]) {
          byTier[tier].total++;
          if (isUnlocked) byTier[tier].unlocked++;
        }
      });

      this.log.info('Achievement stats calculated', { userId, unlocked: userAchievements.length });

      return {
        total: allAchievements.length,
        unlocked: userAchievements.length,
        points,
        byCategory,
        byRarity,
        byTier,
        recentUnlocks: userAchievements
          .slice(0, 5)
          .map((ua) => this.formatUserAchievement(ua)),
      };
    } catch (error) {
      this.log.error('Error calculating achievement stats', { userId }, error);
      throw error;
    }
  }

  // ===========================================================================
  // UNLOCK ACHIEVEMENT
  // ===========================================================================

  static async unlockAchievement(
    userId: string,
    achievementId: string
  ): Promise<UserAchievementWithDetails | null> {
    try {
      const existing = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: { userId, achievementId },
        },
      });

      if (existing) {
        this.log.info('Achievement already unlocked', { userId, achievementId });
        return null;
      }

      const achievement = await prisma.achievement.findUnique({
        where: { id: achievementId },
      });

      if (!achievement) {
        throw new Error(`Achievement ${achievementId} not found`);
      }

      if (!achievement.isActive) {
        throw new Error(`Achievement ${achievementId} is not active`);
      }

      const userAchievement = await prisma.userAchievement.create({
        data: {
          userId,
          achievementId: achievement.id,
          progress: 100,
          progressPercentage: 100,
          unlockedAt: new Date(),
        },
        include: { achievement: true },
      });

      await prisma.achievement.update({
        where: { id: achievementId },
        data: {
          totalUnlocked: { increment: 1 },
        },
      });

      await prisma.user.update({
        where: { id: userId },
        data: {
          totalAchievements: { increment: 1 },
          totalPoints: { increment: achievement.points },
        },
      });

      this.log.info('Achievement unlocked', { userId, achievementId });

      return this.formatUserAchievement(userAchievement);
    } catch (error) {
      this.log.error('Error unlocking achievement', { userId, achievementId }, error);
      throw error;
    }
  }

  // ===========================================================================
  // CHECK AND UNLOCK ACHIEVEMENTS
  // ===========================================================================

  static async checkAndUnlockAchievements(
    userId: string
  ): Promise<UserAchievementWithDetails[]> {
    try {
      const [userAchievements, allAchievements, stats] = await Promise.all([
        prisma.userAchievement.findMany({
          where: { userId },
          select: { achievementId: true },
        }),
        prisma.achievement.findMany({
          where: { isActive: true },
        }),
        this.getUserStats(userId),
      ]);

      const unlockedIds = new Set(userAchievements.map((ua) => ua.achievementId));
      const newUnlocks: UserAchievementWithDetails[] = [];

      for (const achievement of allAchievements) {
        if (unlockedIds.has(achievement.id)) continue;

        const requirement = this.parseRequirement(achievement.requirement);
        if (!requirement) continue;

        const current = this.getCurrentValue(requirement, stats);

        if (current >= requirement.value) {
          const unlocked = await this.unlockAchievement(userId, achievement.id);
          if (unlocked) {
            newUnlocks.push(unlocked);
          }
        }
      }

      this.log.info('Achievements checked and unlocked', { userId, newUnlocks: newUnlocks.length });

      return newUnlocks;
    } catch (error) {
      this.log.error('Error checking achievements', { userId }, error);
      throw error;
    }
  }

  // ===========================================================================
  // CHECK SPECIFIC ACHIEVEMENT TYPES
  // ===========================================================================

  static async checkGoalAchievements(userId: string): Promise<UserAchievementWithDetails[]> {
    try {
      const completedGoals = await prisma.goal.count({
        where: {
          userId,
          status: 'COMPLETED',
        },
      });

      const goalAchievements = await prisma.achievement.findMany({
        where: {
          isActive: true,
          requirement: {
            path: ['metric'],
            equals: 'goals_completed',
          },
        },
      });

      const newUnlocks: UserAchievementWithDetails[] = [];

      for (const achievement of goalAchievements) {
        const requirement = this.parseRequirement(achievement.requirement);
        if (requirement && completedGoals >= requirement.value) {
          const unlocked = await this.unlockAchievement(userId, achievement.id);
          if (unlocked) {
            newUnlocks.push(unlocked);
          }
        }
      }

      this.log.info('Goal achievements checked', { userId, newUnlocks: newUnlocks.length });

      return newUnlocks;
    } catch (error) {
      this.log.error('Error checking goal achievements', { userId }, error);
      throw error;
    }
  }

  static async checkStreakAchievements(
    userId: string,
    currentStreak: number
  ): Promise<UserAchievementWithDetails[]> {
    try {
      const streakAchievements = await prisma.achievement.findMany({
        where: {
          isActive: true,
          requirement: {
            path: ['metric'],
            equals: 'current_streak',
          },
        },
      });

      const newUnlocks: UserAchievementWithDetails[] = [];

      for (const achievement of streakAchievements) {
        const requirement = this.parseRequirement(achievement.requirement);
        if (requirement && currentStreak >= requirement.value) {
          const unlocked = await this.unlockAchievement(userId, achievement.id);
          if (unlocked) {
            newUnlocks.push(unlocked);
          }
        }
      }

      this.log.info('Streak achievements checked', { userId, newUnlocks: newUnlocks.length });

      return newUnlocks;
    } catch (error) {
      this.log.error('Error checking streak achievements', { userId }, error);
      throw error;
    }
  }

  static async checkProblemAchievements(
    userId: string
  ): Promise<UserAchievementWithDetails[]> {
    try {
      const totalProblems = await prisma.trackerEntry.aggregate({
        where: { userId },
        _sum: { problemsSolved: true },
      });

      const count = totalProblems._sum.problemsSolved || 0;

      const problemAchievements = await prisma.achievement.findMany({
        where: {
          isActive: true,
          requirement: {
            path: ['metric'],
            equals: 'problems_solved',
          },
        },
      });

      const newUnlocks: UserAchievementWithDetails[] = [];

      for (const achievement of problemAchievements) {
        const requirement = this.parseRequirement(achievement.requirement);
        if (requirement && count >= requirement.value) {
          const unlocked = await this.unlockAchievement(userId, achievement.id);
          if (unlocked) {
            newUnlocks.push(unlocked);
          }
        }
      }

      this.log.info('Problem achievements checked', { userId, newUnlocks: newUnlocks.length });

      return newUnlocks;
    } catch (error) {
      this.log.error('Error checking problem achievements', { userId }, error);
      throw error;
    }
  }

  static async checkPlatformAchievements(
    userId: string
  ): Promise<UserAchievementWithDetails[]> {
    try {
      const connectedPlatforms = await prisma.userPlatform.count({
        where: { userId, isActive: true },
      });

      const platformAchievements = await prisma.achievement.findMany({
        where: {
          isActive: true,
          requirement: {
            path: ['metric'],
            equals: 'platforms_connected',
          },
        },
      });

      const newUnlocks: UserAchievementWithDetails[] = [];

      for (const achievement of platformAchievements) {
        const requirement = this.parseRequirement(achievement.requirement);
        if (requirement && connectedPlatforms >= requirement.value) {
          const unlocked = await this.unlockAchievement(userId, achievement.id);
          if (unlocked) {
            newUnlocks.push(unlocked);
          }
        }
      }

      this.log.info('Platform achievements checked', { userId, newUnlocks: newUnlocks.length });

      return newUnlocks;
    } catch (error) {
      this.log.error('Error checking platform achievements', { userId }, error);
      throw error;
    }
  }

  // ===========================================================================
  // PIN/UNPIN ACHIEVEMENTS
  // ===========================================================================

  static async togglePinAchievement(
    userId: string,
    achievementId: string
  ): Promise<{ isPinned: boolean }> {
    try {
      const userAchievement = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: { userId, achievementId },
        },
      });

      if (!userAchievement) {
        throw new Error('Achievement not unlocked');
      }

      if (!userAchievement.isPinned) {
        const pinnedCount = await prisma.userAchievement.count({
          where: { userId, isPinned: true },
        });

        if (pinnedCount >= 5) {
          throw new Error('Maximum 5 achievements can be pinned');
        }
      }

      const updated = await prisma.userAchievement.update({
        where: {
          userId_achievementId: { userId, achievementId },
        },
        data: {
          isPinned: !userAchievement.isPinned,
        },
      });

      this.log.info('Achievement pin toggled', { userId, achievementId, isPinned: updated.isPinned });

      return { isPinned: updated.isPinned };
    } catch (error) {
      this.log.error('Error toggling achievement pin', { userId, achievementId }, error);
      throw error;
    }
  }

  // ===========================================================================
  // ADMIN FUNCTIONS
  // ===========================================================================

  static async createAchievement(data: {
    slug: string;
    title: string;
    description: string;
    category: PlatformCategory;
    tier?: AchievementTier;
    icon?: string;
    color?: string;
    points?: number;
    xpReward?: number;
    rarity?: AchievementRarity;
    requirement: AchievementRequirement;
    requirementText?: string;
    isHidden?: boolean;
    isSecret?: boolean;
  }): Promise<Achievement> {
    try {
      const achievement = await prisma.achievement.create({
        data: {
          slug: data.slug,
          title: data.title,
          description: data.description,
          category: data.category,
          tier: data.tier || 'bronze',
          icon: data.icon,
          color: data.color,
          points: data.points || 10,
          xpReward: data.xpReward || 0,
          rarity: data.rarity || 'common',
          requirement: data.requirement as unknown as Prisma.InputJsonValue,
          requirementText: data.requirementText,
          isHidden: data.isHidden || false,
          isSecret: data.isSecret || false,
          isActive: true,
        },
      });

      this.log.info('Achievement created', { id: achievement.id, slug: data.slug });

      return this.formatAchievement(achievement);
    } catch (error) {
      this.log.error('Error creating achievement', { slug: data.slug }, error);
      throw error;
    }
  }

  static async getAllAchievements(): Promise<Achievement[]> {
    try {
      const achievements = await prisma.achievement.findMany({
        orderBy: [
          { category: 'asc' },
          { tier: 'asc' },
          { sortOrder: 'asc' },
        ],
      });

      this.log.info('All achievements fetched', { count: achievements.length });

      return achievements.map((a) => this.formatAchievement(a));
    } catch (error) {
      this.log.error('Error fetching all achievements', {}, error);
      throw error;
    }
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private static async getUserStats(userId: string): Promise<UserStats> {
    try {
      const [
        problemsAgg,
        goalsCount,
        platformsCount,
        user,
        daysActive,
        commitsAgg,
        timeAgg,
      ] = await Promise.all([
        prisma.trackerEntry.aggregate({
          where: { userId },
          _sum: { problemsSolved: true },
        }),
        prisma.goal.count({
          where: { userId, status: 'COMPLETED' },
        }),
        prisma.userPlatform.count({
          where: { userId, isActive: true },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            currentStreak: true,
            longestStreak: true,
          },
        }),
        prisma.trackerEntry.groupBy({
          by: ['date'],
          where: { userId },
        }),
        prisma.trackerEntry.aggregate({
          where: { userId },
          _sum: { commits: true },
        }),
        prisma.trackerEntry.aggregate({
          where: { userId },
          _sum: { timeSpent: true },
        }),
      ]);

      return {
        problems_solved: problemsAgg._sum.problemsSolved || 0,
        goals_completed: goalsCount,
        platforms_connected: platformsCount,
        current_streak: user?.currentStreak || 0,
        longest_streak: user?.longestStreak || 0,
        days_active: daysActive.length,
        total_commits: commitsAgg._sum.commits || 0,
        total_time_spent: timeAgg._sum.timeSpent || 0,
      };
    } catch (error) {
      this.log.error('Error getting user stats', { userId }, error);
      throw error;
    }
  }

  private static parseRequirement(
    requirement: unknown
  ): AchievementRequirement | null {
    if (!requirement) return null;

    if (typeof requirement === 'object') {
      const req = requirement as Record<string, unknown>;
      return {
        type: (req.type as 'count' | 'streak' | 'milestone' | 'special') || 'count',
        metric: (req.metric as string) || 'problems_solved',
        value: (req.value as number) || 1,
        platform: req.platform as string | undefined,
      };
    }

    return null;
  }

  private static getCurrentValue(
    requirement: AchievementRequirement | null,
    stats: UserStats
  ): number {
    if (!requirement) return 0;

    const metricMap: Record<string, keyof UserStats> = {
      problems_solved: 'problems_solved',
      goals_completed: 'goals_completed',
      platforms_connected: 'platforms_connected',
      current_streak: 'current_streak',
      longest_streak: 'longest_streak',
      days_active: 'days_active',
      total_commits: 'total_commits',
      total_time_spent: 'total_time_spent',
    };

    const key = metricMap[requirement.metric];
    return key ? stats[key] : 0;
  }

  private static formatAchievement(dbAchievement: DbAchievement): Achievement {
    const requirement = this.parseRequirement(dbAchievement.requirement);

    return {
      id: dbAchievement.id,
      slug: dbAchievement.slug,
      title: dbAchievement.title,
      description: dbAchievement.description,
      category: dbAchievement.category,
      tier: (dbAchievement.tier || 'bronze') as AchievementTier,
      icon: dbAchievement.icon || '🏆',
      color: dbAchievement.color || undefined,
      badgeImage: dbAchievement.badgeImage || undefined,
      points: dbAchievement.points,
      xpReward: dbAchievement.xpReward,
      rarity: (dbAchievement.rarity || 'common') as AchievementRarity,
      requirement: requirement || { type: 'count', metric: 'custom', value: 1 },
      requirementText: dbAchievement.requirementText || undefined,
      isHidden: dbAchievement.isHidden,
      isSecret: dbAchievement.isSecret,
      isActive: dbAchievement.isActive,
    };
  }

  private static formatUserAchievement(
    ua: DbUserAchievement & { achievement: DbAchievement }
  ): UserAchievementWithDetails {
    return {
      id: ua.id,
      userId: ua.userId,
      achievementId: ua.achievementId,
      achievement: this.formatAchievement(ua.achievement),
      progress: ua.progress,
      progressPercentage: ua.progressPercentage,
      currentThreshold: ua.currentThreshold,
      unlockedAt: ua.unlockedAt,
      isPinned: ua.isPinned,
      isHidden: ua.isHidden,
    };
  }
}

export default AchievementService;