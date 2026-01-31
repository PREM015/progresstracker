// src/services/goalService.ts
// Complete goal service matching Prisma schema

import { prisma } from '@/lib/prisma';
import { 
  GoalStatus, 
  GoalType, 
  GoalMetric, 
  PlatformCategory,
  Prisma
} from '@prisma/client';
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  differenceInDays,
  addDays
} from 'date-fns';

// =============================================================================
// TYPES
// =============================================================================

export interface GoalFormData {
  title: string;
  description?: string;
  target: number;
  unit?: string;
  deadline?: string | Date;
  category: PlatformCategory;
  goalType?: GoalType;
  metric?: GoalMetric;
  customMetric?: string;
  platformId?: string;
  isPublic?: boolean;
  reminderEnabled?: boolean;
  color?: string;
  icon?: string;
  requiredStreakDays?: number;
}

export interface GoalUpdateData {
  title?: string;
  description?: string;
  target?: number;
  progress?: number;
  unit?: string;
  deadline?: string | Date | null;
  status?: GoalStatus;
  isPublic?: boolean;
  reminderEnabled?: boolean;
  color?: string;
  icon?: string;
}

export interface GoalFilter {
  status?: GoalStatus | GoalStatus[];
  category?: PlatformCategory | PlatformCategory[];
  goalType?: GoalType | GoalType[];
  metric?: GoalMetric;
  platformId?: string;
  isPublic?: boolean;
  hasDeadline?: boolean;
  search?: string;
}

export interface GoalProgress {
  current: number;
  target: number;
  percentage: number;
  remaining: number;
  isComplete: boolean;
  daysLeft?: number;
  daysElapsed: number;
  avgPerDay: number;
  requiredPerDay?: number;
  projectedCompletion?: Date;
  onTrack: boolean;
}

export interface GoalWithProgress {
  id: string;
  userId: string;
  platformId: string | null;
  title: string;
  description: string | null;
  category: PlatformCategory;
  goalType: GoalType;
  metric: GoalMetric;
  customMetric: string | null;
  target: number;
  progress: number;
  progressPercentage: number;
  unit: string | null;
  startDate: Date;
  endDate: Date | null;
  deadline: Date | null;
  status: GoalStatus;
  completedAt: Date | null;
  failedAt: Date | null;
  milestones: GoalMilestone[] | null;
  currentStreakDays: number;
  requiredStreakDays: number | null;
  isPublic: boolean;
  shareCode: string | null;
  reminderEnabled: boolean;
  daysActive: number;
  avgDailyProgress: number;
  bestDay: GoalBestDay | null;
  color: string | null;
  icon: string | null;
  createdAt: Date;
  updatedAt: Date;
  platform?: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    color: string | null;
  } | null;
  progressInfo: GoalProgress;
}

export interface GoalMilestone {
  value: number;
  label: string;
  reached: boolean;
  reachedAt?: string;
}

export interface GoalBestDay {
  date: string;
  progress: number;
}

export interface GoalStats {
  total: number;
  active: number;
  completed: number;
  failed: number;
  paused: number;
  draft: number;
  archived: number;
  cancelled: number;
  completionRate: number;
  avgCompletionTime: number;
  currentStreak: number;
  longestStreak: number;
  thisWeek: {
    completed: number;
    total: number;
    progress: number;
  };
  thisMonth: {
    completed: number;
    total: number;
    progress: number;
  };
  byCategory: Record<string, { completed: number; total: number; rate: number }>;
  byType: Record<string, { completed: number; total: number; rate: number }>;
  recentCompleted: GoalWithProgress[];
  upcomingDeadlines: GoalWithProgress[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function calculateProgressPercentage(progress: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((progress / target) * 100 * 10) / 10);
}

function parseJsonField<T>(field: unknown): T | null {
  if (!field) return null;
  if (typeof field === 'object') return field as T;
  try {
    return JSON.parse(field as string) as T;
  } catch {
    return null;
  }
}

// =============================================================================
// GOAL SERVICE CLASS
// =============================================================================

export class GoalService {
  // ===========================================================================
  // CREATE GOAL
  // ===========================================================================

  /**
   * Create a new goal
   */
  static async createGoal(userId: string, data: GoalFormData): Promise<GoalWithProgress> {
    // Validate required fields
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Title is required');
    }

    if (!data.category) {
      throw new Error('Category is required');
    }

    if (!data.target || data.target <= 0) {
      throw new Error('Target must be greater than 0');
    }

    // Validate platform if provided
    if (data.platformId) {
      const platform = await prisma.platform.findUnique({
        where: { id: data.platformId },
        select: { id: true },
      });
      if (!platform) {
        throw new Error('Platform not found');
      }
    }

    // Calculate deadline based on goal type if not provided
    let deadline = data.deadline ? new Date(data.deadline) : null;
    const startDate = new Date();

    if (!deadline && data.goalType) {
      switch (data.goalType) {
        case GoalType.DAILY:
          deadline = endOfDay(startDate);
          break;
        case GoalType.WEEKLY:
          deadline = endOfWeek(startDate);
          break;
        case GoalType.MONTHLY:
          deadline = endOfMonth(startDate);
          break;
        case GoalType.QUARTERLY:
          deadline = addDays(startDate, 90);
          break;
        case GoalType.YEARLY:
          deadline = addDays(startDate, 365);
          break;
      }
    }

    // Generate share code if public
    const shareCode = data.isPublic ? generateShareCode() : null;

    // Create default milestones
    const milestones: GoalMilestone[] = [
      { value: 25, label: '25%', reached: false },
      { value: 50, label: '50%', reached: false },
      { value: 75, label: '75%', reached: false },
      { value: 100, label: '100%', reached: false },
    ];

    const goal = await prisma.goal.create({
      data: {
        userId,
        platformId: data.platformId || null,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        category: data.category,
        goalType: data.goalType || GoalType.CUSTOM,
        metric: data.metric || GoalMetric.PROBLEMS_SOLVED,
        customMetric: data.customMetric || null,
        target: data.target,
        progress: 0,
        progressPercentage: 0,
        unit: data.unit || null,
        startDate,
        endDate: null,
        deadline,
        status: GoalStatus.ACTIVE,
        completedAt: null,
        failedAt: null,
        milestones: milestones as unknown as Prisma.InputJsonValue,
        currentStreakDays: 0,
        requiredStreakDays: data.requiredStreakDays || null,
        isPublic: data.isPublic || false,
        shareCode,
        reminderEnabled: data.reminderEnabled || false,
        daysActive: 0,
        avgDailyProgress: 0,
        bestDay: undefined,
        color: data.color || null,
        icon: data.icon || null,
      },
      include: {
        platform: {
          select: { id: true, name: true, slug: true, icon: true, color: true },
        },
      },
    });

    return this.formatGoalWithProgress(goal);
  }

  // ===========================================================================
  // GET GOALS
  // ===========================================================================

  /**
   * Get user goals with optional filters
   */
  static async getUserGoals(
    userId: string,
    filter?: GoalFilter,
    options?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ goals: GoalWithProgress[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options || {};

    const where: Prisma.GoalWhereInput = { userId };

    if (filter) {
      // Status filter
      if (filter.status) {
        if (Array.isArray(filter.status)) {
          where.status = { in: filter.status };
        } else {
          where.status = filter.status;
        }
      }

      // Category filter
      if (filter.category) {
        if (Array.isArray(filter.category)) {
          where.category = { in: filter.category };
        } else {
          where.category = filter.category;
        }
      }

      // Goal type filter
      if (filter.goalType) {
        if (Array.isArray(filter.goalType)) {
          where.goalType = { in: filter.goalType };
        } else {
          where.goalType = filter.goalType;
        }
      }

      // Metric filter
      if (filter.metric) {
        where.metric = filter.metric;
      }

      // Platform filter
      if (filter.platformId) {
        where.platformId = filter.platformId;
      }

      // Public filter
      if (filter.isPublic !== undefined) {
        where.isPublic = filter.isPublic;
      }

      // Has deadline filter
      if (filter.hasDeadline !== undefined) {
        where.deadline = filter.hasDeadline ? { not: null } : null;
      }

      // Search filter
      if (filter.search) {
        where.OR = [
          { title: { contains: filter.search, mode: 'insensitive' } },
          { description: { contains: filter.search, mode: 'insensitive' } },
        ];
      }
    }

    const [goals, total] = await Promise.all([
      prisma.goal.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          platform: {
            select: { id: true, name: true, slug: true, icon: true, color: true },
          },
        },
      }),
      prisma.goal.count({ where }),
    ]);

    return {
      goals: goals.map((goal) => this.formatGoalWithProgress(goal)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get active goals
   */
  static async getActiveGoals(userId: string): Promise<GoalWithProgress[]> {
    const result = await this.getUserGoals(userId, { status: GoalStatus.ACTIVE }, { limit: 100 });
    return result.goals;
  }

  /**
   * Get completed goals
   */
  static async getCompletedGoals(userId: string, limit?: number): Promise<GoalWithProgress[]> {
    const result = await this.getUserGoals(
      userId,
      { status: GoalStatus.COMPLETED },
      { limit: limit || 10, sortBy: 'completedAt', sortOrder: 'desc' }
    );
    return result.goals;
  }

  /**
   * Get goal by ID
   */
  static async getGoalById(userId: string, goalId: string): Promise<GoalWithProgress | null> {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
      include: {
        platform: {
          select: { id: true, name: true, slug: true, icon: true, color: true },
        },
        reminders: true,
      },
    });

    return goal ? this.formatGoalWithProgress(goal) : null;
  }

  /**
   * Get goal by share code (public)
   */
  static async getGoalByShareCode(shareCode: string): Promise<GoalWithProgress | null> {
    const goal = await prisma.goal.findUnique({
      where: { shareCode },
      include: {
        platform: {
          select: { id: true, name: true, slug: true, icon: true, color: true },
        },
        user: {
          select: { id: true, name: true, username: true, image: true },
        },
      },
    });

    if (!goal || !goal.isPublic) {
      return null;
    }

    return this.formatGoalWithProgress(goal);
  }

  // ===========================================================================
  // UPDATE GOAL
  // ===========================================================================

  /**
   * Update goal
   */
  static async updateGoal(
    userId: string,
    goalId: string,
    data: GoalUpdateData
  ): Promise<GoalWithProgress> {
    // Verify ownership
    const existing = await prisma.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!existing) {
      throw new Error('Goal not found');
    }

    // Prevent updating completed/failed goals (except status changes)
    if (
      existing.status === GoalStatus.COMPLETED ||
      existing.status === GoalStatus.FAILED
    ) {
      if (!data.status) {
        throw new Error('Cannot update a completed or failed goal');
      }
    }

    const updateData: Prisma.GoalUpdateInput = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) {
      if (!data.title.trim()) {
        throw new Error('Title cannot be empty');
      }
      updateData.title = data.title.trim();
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }

    if (data.target !== undefined) {
      if (data.target <= 0) {
        throw new Error('Target must be greater than 0');
      }
      updateData.target = data.target;
      // Recalculate percentage
      const currentProgress = data.progress ?? existing.progress;
      updateData.progressPercentage = calculateProgressPercentage(currentProgress, data.target);
    }

    if (data.progress !== undefined) {
      if (data.progress < 0) {
        throw new Error('Progress cannot be negative');
      }
      updateData.progress = data.progress;
      const currentTarget = data.target ?? existing.target;
      updateData.progressPercentage = calculateProgressPercentage(data.progress, currentTarget);

      // Auto-complete if progress >= target
      if (data.progress >= currentTarget && existing.status === GoalStatus.ACTIVE) {
        updateData.status = GoalStatus.COMPLETED;
        updateData.completedAt = new Date();
      }
    }

    if (data.unit !== undefined) {
      updateData.unit = data.unit || null;
    }

    if (data.deadline !== undefined) {
      updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === GoalStatus.COMPLETED && !existing.completedAt) {
        updateData.completedAt = new Date();
      }
      if (data.status === GoalStatus.FAILED && !existing.failedAt) {
        updateData.failedAt = new Date();
      }
    }

    if (data.isPublic !== undefined) {
      updateData.isPublic = data.isPublic;
      // Generate share code if making public
      if (data.isPublic && !existing.shareCode) {
        updateData.shareCode = generateShareCode();
      }
    }

    if (data.reminderEnabled !== undefined) {
      updateData.reminderEnabled = data.reminderEnabled;
    }

    if (data.color !== undefined) {
      updateData.color = data.color || null;
    }

    if (data.icon !== undefined) {
      updateData.icon = data.icon || null;
    }

    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: updateData,
      include: {
        platform: {
          select: { id: true, name: true, slug: true, icon: true, color: true },
        },
      },
    });

    return this.formatGoalWithProgress(goal);
  }

  // ===========================================================================
  // UPDATE PROGRESS
  // ===========================================================================

  /**
   * Update goal progress
   */
  static async updateProgress(
    userId: string,
    goalId: string,
    progress: number
  ): Promise<GoalWithProgress> {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    if (goal.status !== GoalStatus.ACTIVE) {
      throw new Error('Can only update progress on active goals');
    }

    if (progress < 0) {
      throw new Error('Progress cannot be negative');
    }

    const percentage = calculateProgressPercentage(progress, goal.target);
    const isNowComplete = progress >= goal.target;

    // Update milestones
    const milestones = parseJsonField<GoalMilestone[]>(goal.milestones) || [];
    const now = new Date().toISOString();
    for (const milestone of milestones) {
      const milestoneValue = (milestone.value / 100) * goal.target;
      if (progress >= milestoneValue && !milestone.reached) {
        milestone.reached = true;
        milestone.reachedAt = now;
      }
    }

    // Track best day
    const today = new Date().toISOString().split('T')[0];
    const dailyProgress = progress - goal.progress;
    let bestDay = parseJsonField<GoalBestDay>(goal.bestDay);
    if (!bestDay || dailyProgress > bestDay.progress) {
      bestDay = { date: today, progress: dailyProgress };
    }

    // Calculate days active and avg daily progress
    const daysElapsed = Math.max(1, differenceInDays(new Date(), goal.startDate));
    const avgDailyProgress = progress / daysElapsed;

    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        progress,
        progressPercentage: percentage,
        status: isNowComplete ? GoalStatus.COMPLETED : goal.status,
        completedAt: isNowComplete ? new Date() : null,
        milestones: milestones as unknown as Prisma.InputJsonValue,
        bestDay: bestDay as unknown as Prisma.InputJsonValue,
        daysActive: daysElapsed,
        avgDailyProgress: Math.round(avgDailyProgress * 100) / 100,
        updatedAt: new Date(),
      },
      include: {
        platform: {
          select: { id: true, name: true, slug: true, icon: true, color: true },
        },
      },
    });

    // Check achievements if completed
    if (isNowComplete) {
      // Import dynamically to avoid circular dependency
      const { AchievementService } = await import('./achievementService');
      await AchievementService.checkGoalAchievements(userId).catch(console.error);
    }

    return this.formatGoalWithProgress(updatedGoal);
  }

  /**
   * Increment goal progress
   */
  static async incrementProgress(
    userId: string,
    goalId: string,
    increment: number = 1
  ): Promise<GoalWithProgress> {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
      select: { progress: true },
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    const newProgress = Math.max(0, goal.progress + increment);
    return this.updateProgress(userId, goalId, newProgress);
  }

  // ===========================================================================
  // STATUS CHANGES
  // ===========================================================================

  /**
   * Complete a goal
   */
  static async completeGoal(userId: string, goalId: string): Promise<GoalWithProgress> {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        status: GoalStatus.COMPLETED,
        completedAt: new Date(),
        progress: goal.target,
        progressPercentage: 100,
        updatedAt: new Date(),
      },
      include: {
        platform: {
          select: { id: true, name: true, slug: true, icon: true, color: true },
        },
      },
    });

    // Check achievements
    const { AchievementService } = await import('./achievementService');
    await AchievementService.checkGoalAchievements(userId).catch(console.error);

    return this.formatGoalWithProgress(updatedGoal);
  }

  /**
   * Fail a goal
   */
  static async failGoal(userId: string, goalId: string): Promise<GoalWithProgress> {
    return this.updateGoal(userId, goalId, { status: GoalStatus.FAILED });
  }

  /**
   * Pause a goal
   */
  static async pauseGoal(userId: string, goalId: string): Promise<GoalWithProgress> {
    return this.updateGoal(userId, goalId, { status: GoalStatus.PAUSED });
  }

  /**
   * Resume a goal
   */
  static async resumeGoal(userId: string, goalId: string): Promise<GoalWithProgress> {
    return this.updateGoal(userId, goalId, { status: GoalStatus.ACTIVE });
  }

  /**
   * Archive a goal
   */
  static async archiveGoal(userId: string, goalId: string): Promise<GoalWithProgress> {
    return this.updateGoal(userId, goalId, { status: GoalStatus.ARCHIVED });
  }

  /**
   * Cancel a goal
   */
  static async cancelGoal(userId: string, goalId: string): Promise<GoalWithProgress> {
    return this.updateGoal(userId, goalId, { status: GoalStatus.CANCELLED });
  }

  // ===========================================================================
  // DELETE GOAL
  // ===========================================================================

  /**
   * Delete a goal
   */
  static async deleteGoal(userId: string, goalId: string): Promise<boolean> {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      return false;
    }

    await prisma.goal.delete({
      where: { id: goalId },
    });

    return true;
  }

  // ===========================================================================
  // DUPLICATE GOAL
  // ===========================================================================

  /**
   * Duplicate a goal
   */
  static async duplicateGoal(userId: string, goalId: string): Promise<GoalWithProgress> {
    const original = await prisma.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!original) {
      throw new Error('Goal not found');
    }

    return this.createGoal(userId, {
      title: `${original.title} (Copy)`,
      description: original.description || undefined,
      target: original.target,
      unit: original.unit || undefined,
      category: original.category,
      goalType: original.goalType,
      metric: original.metric,
      customMetric: original.customMetric || undefined,
      platformId: original.platformId || undefined,
      isPublic: false,
      reminderEnabled: original.reminderEnabled,
      color: original.color || undefined,
      icon: original.icon || undefined,
    });
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get goal statistics
   */
  static async getGoalStats(userId: string): Promise<GoalStats> {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const [allGoals, weeklyGoals, monthlyGoals, recentCompleted, upcomingDeadlines] =
      await Promise.all([
        prisma.goal.findMany({
          where: { userId },
          include: {
            platform: {
              select: { id: true, name: true, slug: true, icon: true, color: true },
            },
          },
        }),
        prisma.goal.findMany({
          where: {
            userId,
            createdAt: { gte: weekStart, lte: weekEnd },
          },
        }),
        prisma.goal.findMany({
          where: {
            userId,
            createdAt: { gte: monthStart, lte: monthEnd },
          },
        }),
        prisma.goal.findMany({
          where: {
            userId,
            status: GoalStatus.COMPLETED,
          },
          orderBy: { completedAt: 'desc' },
          take: 5,
          include: {
            platform: {
              select: { id: true, name: true, slug: true, icon: true, color: true },
            },
          },
        }),
        prisma.goal.findMany({
          where: {
            userId,
            status: GoalStatus.ACTIVE,
            deadline: { not: null, gte: now },
          },
          orderBy: { deadline: 'asc' },
          take: 5,
          include: {
            platform: {
              select: { id: true, name: true, slug: true, icon: true, color: true },
            },
          },
        }),
      ]);

    // Count by status
    const total = allGoals.length;
    const active = allGoals.filter((g) => g.status === GoalStatus.ACTIVE).length;
    const completed = allGoals.filter((g) => g.status === GoalStatus.COMPLETED).length;
    const failed = allGoals.filter((g) => g.status === GoalStatus.FAILED).length;
    const paused = allGoals.filter((g) => g.status === GoalStatus.PAUSED).length;
    const draft = allGoals.filter((g) => g.status === GoalStatus.DRAFT).length;
    const archived = allGoals.filter((g) => g.status === GoalStatus.ARCHIVED).length;
    const cancelled = allGoals.filter((g) => g.status === GoalStatus.CANCELLED).length;

    // Calculate completion rate
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate average completion time (in days)
    const completedGoals = allGoals.filter((g) => g.completedAt);
    let avgCompletionTime = 0;
    if (completedGoals.length > 0) {
      const totalDays = completedGoals.reduce((sum, g) => {
        return sum + differenceInDays(g.completedAt!, g.startDate);
      }, 0);
      avgCompletionTime = Math.round(totalDays / completedGoals.length);
    }

    // Calculate streaks
    const streak = await this.calculateStreak(userId);

    // Weekly stats
    const weeklyCompleted = weeklyGoals.filter((g) => g.status === GoalStatus.COMPLETED).length;
    const weeklyTotal = weeklyGoals.length;
    const weeklyProgress =
      weeklyTotal > 0 ? Math.round((weeklyCompleted / weeklyTotal) * 100) : 0;

    // Monthly stats
    const monthlyCompleted = monthlyGoals.filter((g) => g.status === GoalStatus.COMPLETED).length;
    const monthlyTotal = monthlyGoals.length;
    const monthlyProgress =
      monthlyTotal > 0 ? Math.round((monthlyCompleted / monthlyTotal) * 100) : 0;

    // Stats by category
    const byCategory: Record<string, { completed: number; total: number; rate: number }> = {};
    for (const goal of allGoals) {
      const cat = goal.category;
      if (!byCategory[cat]) {
        byCategory[cat] = { completed: 0, total: 0, rate: 0 };
      }
      byCategory[cat].total++;
      if (goal.status === GoalStatus.COMPLETED) {
        byCategory[cat].completed++;
      }
    }
    for (const cat in byCategory) {
      byCategory[cat].rate =
        byCategory[cat].total > 0
          ? Math.round((byCategory[cat].completed / byCategory[cat].total) * 100)
          : 0;
    }

    // Stats by type
    const byType: Record<string, { completed: number; total: number; rate: number }> = {};
    for (const goal of allGoals) {
      const type = goal.goalType;
      if (!byType[type]) {
        byType[type] = { completed: 0, total: 0, rate: 0 };
      }
      byType[type].total++;
      if (goal.status === GoalStatus.COMPLETED) {
        byType[type].completed++;
      }
    }
    for (const type in byType) {
      byType[type].rate =
        byType[type].total > 0
          ? Math.round((byType[type].completed / byType[type].total) * 100)
          : 0;
    }

    return {
      total,
      active,
      completed,
      failed,
      paused,
      draft,
      archived,
      cancelled,
      completionRate,
      avgCompletionTime,
      currentStreak: streak.current,
      longestStreak: streak.longest,
      thisWeek: {
        completed: weeklyCompleted,
        total: weeklyTotal,
        progress: weeklyProgress,
      },
      thisMonth: {
        completed: monthlyCompleted,
        total: monthlyTotal,
        progress: monthlyProgress,
      },
      byCategory,
      byType,
      recentCompleted: recentCompleted.map((g) => this.formatGoalWithProgress(g)),
      upcomingDeadlines: upcomingDeadlines.map((g) => this.formatGoalWithProgress(g)),
    };
  }

  /**
   * Calculate activity streak
   */
  static async calculateStreak(userId: string): Promise<{ current: number; longest: number }> {
    const entries = await prisma.trackerEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    if (entries.length === 0) {
      return { current: 0, longest: 0 };
    }

    // Get unique dates
    const uniqueDates = [
      ...new Set(entries.map((e) => startOfDay(e.date).getTime())),
    ].sort((a, b) => b - a);

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;
    const today = startOfDay(new Date()).getTime();
    const yesterday = today - 86400000;

    // Check if streak is active (today or yesterday)
    if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
      currentStreak = 1;

      for (let i = 1; i < uniqueDates.length; i++) {
        const diff = uniqueDates[i - 1] - uniqueDates[i];
        if (diff === 86400000) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    for (let i = 1; i < uniqueDates.length; i++) {
      const diff = uniqueDates[i - 1] - uniqueDates[i];
      if (diff === 86400000) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, currentStreak, tempStreak);

    return { current: currentStreak, longest: longestStreak };
  }

  // ===========================================================================
  // AUTO-UPDATE FROM TRACKER
  // ===========================================================================

  /**
   * Auto-update goals based on tracker entries
   */
  static async autoUpdateGoals(userId: string): Promise<void> {
    const today = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    // Get today's tracker entries
    const todayEntries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: today, lte: todayEnd },
      },
    });

    // Calculate totals by metric
    const totals = {
      [GoalMetric.PROBLEMS_SOLVED]: todayEntries.reduce(
        (sum, e) => sum + (e.problemsSolved || 0),
        0
      ),
      [GoalMetric.COMMITS]: todayEntries.reduce((sum, e) => sum + (e.commits || 0), 0),
      [GoalMetric.PULL_REQUESTS]: todayEntries.reduce((sum, e) => sum + (e.pullRequests || 0), 0),
      [GoalMetric.TIME_SPENT]: todayEntries.reduce((sum, e) => sum + (e.timeSpent || 0), 0),
      [GoalMetric.PROJECTS_COMPLETED]: todayEntries.reduce(
        (sum, e) => sum + (e.projectsCompleted || 0),
        0
      ),
      [GoalMetric.COURSES_COMPLETED]: todayEntries.reduce(
        (sum, e) => sum + (e.coursesCompleted || 0),
        0
      ),
      [GoalMetric.CERTIFICATIONS]: todayEntries.reduce(
        (sum, e) => sum + (e.certificationsEarned || 0),
        0
      ),
      [GoalMetric.APPLICATIONS_SUBMITTED]: todayEntries.reduce(
        (sum, e) => sum + (e.applicationsSubmitted || 0),
        0
      ),
      [GoalMetric.CONTESTS_PARTICIPATED]: todayEntries.reduce(
        (sum, e) => sum + (e.contestsParticipated || 0),
        0
      ),
    };

    // Get daily goals that need updating
    const activeGoals = await prisma.goal.findMany({
      where: {
        userId,
        status: GoalStatus.ACTIVE,
        goalType: GoalType.DAILY,
      },
    });

    for (const goal of activeGoals) {
      const newProgress = totals[goal.metric as keyof typeof totals] || 0;

      if (newProgress !== goal.progress) {
        await this.updateProgress(userId, goal.id, newProgress).catch(console.error);
      }
    }
  }

  // ===========================================================================
  // HELPER: FORMAT GOAL
  // ===========================================================================

  private static formatGoalWithProgress(goal: Record<string, unknown>): GoalWithProgress {
    const progress = (goal.progress as number) || 0;
    const target = (goal.target as number) || 1;
    const percentage = calculateProgressPercentage(progress, target);

    const startDate = new Date(goal.startDate as Date);
    const deadline = goal.deadline ? new Date(goal.deadline as Date) : null;
    const now = new Date();

    const daysElapsed = Math.max(1, differenceInDays(now, startDate));
    const avgPerDay = progress / daysElapsed;

    let daysLeft: number | undefined;
    let requiredPerDay: number | undefined;
    let projectedCompletion: Date | undefined;
    let onTrack = true;

    if (deadline) {
      daysLeft = Math.max(0, differenceInDays(deadline, now));
      const remaining = target - progress;

      if (daysLeft > 0 && remaining > 0) {
        requiredPerDay = remaining / daysLeft;
        const daysNeeded = avgPerDay > 0 ? remaining / avgPerDay : Infinity;
        projectedCompletion = addDays(now, daysNeeded);
        onTrack = projectedCompletion <= deadline;
      } else if (remaining <= 0) {
        onTrack = true;
      } else {
        onTrack = false;
      }
    }

    return {
      id: goal.id as string,
      userId: goal.userId as string,
      platformId: goal.platformId as string | null,
      title: goal.title as string,
      description: goal.description as string | null,
      category: goal.category as PlatformCategory,
      goalType: goal.goalType as GoalType,
      metric: goal.metric as GoalMetric,
      customMetric: goal.customMetric as string | null,
      target,
      progress,
      progressPercentage: percentage,
      unit: goal.unit as string | null,
      startDate,
      endDate: goal.endDate ? new Date(goal.endDate as Date) : null,
      deadline,
      status: goal.status as GoalStatus,
      completedAt: goal.completedAt ? new Date(goal.completedAt as Date) : null,
      failedAt: goal.failedAt ? new Date(goal.failedAt as Date) : null,
      milestones: parseJsonField<GoalMilestone[]>(goal.milestones),
      currentStreakDays: (goal.currentStreakDays as number) || 0,
      requiredStreakDays: goal.requiredStreakDays as number | null,
      isPublic: (goal.isPublic as boolean) || false,
      shareCode: goal.shareCode as string | null,
      reminderEnabled: (goal.reminderEnabled as boolean) || false,
      daysActive: (goal.daysActive as number) || daysElapsed,
      avgDailyProgress: (goal.avgDailyProgress as number) || avgPerDay,
      bestDay: parseJsonField<GoalBestDay>(goal.bestDay),
      color: goal.color as string | null,
      icon: goal.icon as string | null,
      createdAt: new Date(goal.createdAt as Date),
      updatedAt: new Date(goal.updatedAt as Date),
      platform: goal.platform as GoalWithProgress['platform'],
      progressInfo: {
        current: progress,
        target,
        percentage,
        remaining: Math.max(0, target - progress),
        isComplete: progress >= target,
        daysLeft,
        daysElapsed,
        avgPerDay: Math.round(avgPerDay * 100) / 100,
        requiredPerDay: requiredPerDay ? Math.round(requiredPerDay * 100) / 100 : undefined,
        projectedCompletion,
        onTrack,
      },
    };
  }
}

export default GoalService;