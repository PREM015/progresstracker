// src/services/goalService.ts

import {prisma} from '@/lib/prisma';
import { 
  Goal, 
  GoalFormData, 
  GoalUpdateData, 
  GoalStats, 
  GoalStatus,
  GoalProgress,
  GoalWithProgress,
  GoalFilter
} from '@/types/goal';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { AchievementService } from './achievementService';

export class GoalService {
  // ========================================
  // CREATE GOAL
  // ========================================
  static async createGoal(userId: string, data: GoalFormData): Promise<Goal> {
    const goal = await prisma.goal.create({
      data: {
        userId,
        title: data.title,
        target: data.target,
        progress: 0,
        deadline: data.deadline ? new Date(data.deadline) : null,
        // Store additional data in a JSON field or separate table
        // For now, using title to include type info
      },
    });

    return this.formatGoal(goal);
  }

  // ========================================
  // GET USER GOALS
  // ========================================
  static async getUserGoals(
    userId: string, 
    filter?: GoalFilter
  ): Promise<GoalWithProgress[]> {
    const where: any = { userId };

    if (filter?.status) {
      if (filter.status === 'completed') {
        where.completedAt = { not: null };
      } else if (filter.status === 'active') {
        where.completedAt = null;
      }
    }

    const goals = await prisma.goal.findMany({
      where,
      orderBy: [
        { completedAt: 'asc' },
        { deadline: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return goals.map(goal => this.formatGoalWithProgress(goal));
  }

  // ========================================
  // GET ACTIVE GOALS
  // ========================================
  static async getActiveGoals(userId: string): Promise<GoalWithProgress[]> {
    const goals = await prisma.goal.findMany({
      where: {
        userId,
        completedAt: null,
      },
      orderBy: [
        { deadline: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return goals.map(goal => this.formatGoalWithProgress(goal));
  }

  // ========================================
  // GET COMPLETED GOALS
  // ========================================
  static async getCompletedGoals(userId: string, limit?: number): Promise<Goal[]> {
    const goals = await prisma.goal.findMany({
      where: {
        userId,
        completedAt: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
    });

    return goals.map(goal => this.formatGoal(goal));
  }

  // ========================================
  // GET GOAL BY ID
  // ========================================
  static async getGoalById(userId: string, goalId: string): Promise<Goal | null> {
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId,
      },
    });

    return goal ? this.formatGoal(goal) : null;
  }

  // ========================================
  // UPDATE GOAL
  // ========================================
  static async updateGoal(
    userId: string, 
    goalId: string, 
    data: GoalUpdateData
  ): Promise<Goal> {
    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        title: data.title,
        target: data.target,
        progress: data.progress,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
      },
    });

    return this.formatGoal(goal);
  }

  // ========================================
  // UPDATE GOAL PROGRESS
  // ========================================
  static async updateProgress(
    userId: string,
    goalId: string,
    progress: number
  ): Promise<Goal> {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        progress,
        completedAt: progress >= goal.target ? new Date() : null,
      },
    });

    // Check for achievement unlocks
    if (progress >= goal.target && !goal.completedAt) {
      await AchievementService.checkGoalAchievements(userId);
    }

    return this.formatGoal(updatedGoal);
  }

  // ========================================
  // INCREMENT GOAL PROGRESS
  // ========================================
  static async incrementProgress(
    userId: string,
    goalId: string,
    increment: number = 1
  ): Promise<Goal> {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    const newProgress = (goal.progress || 0) + increment;

    return this.updateProgress(userId, goalId, newProgress);
  }

  // ========================================
  // COMPLETE GOAL
  // ========================================
  static async completeGoal(userId: string, goalId: string): Promise<Goal> {
    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        completedAt: new Date(),
      },
    });

    // Check for achievements
    await AchievementService.checkGoalAchievements(userId);

    return this.formatGoal(goal);
  }

  // ========================================
  // DELETE GOAL
  // ========================================
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

  // ========================================
  // GET GOAL STATS
  // ========================================
  static async getGoalStats(userId: string): Promise<GoalStats> {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const [allGoals, weekGoals, monthGoals] = await Promise.all([
      prisma.goal.findMany({ where: { userId } }),
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
    ]);

    const total = allGoals.length;
    const completed = allGoals.filter(g => g.completedAt).length;
    const active = allGoals.filter(g => !g.completedAt).length;
    const failed = 0; // Would need deadline logic

    // Calculate streak (consecutive days with completed goals)
    const streak = await this.calculateStreak(userId);

    return {
      total,
      active,
      completed,
      failed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      currentStreak: streak.current,
      longestStreak: streak.longest,
      thisWeek: {
        completed: weekGoals.filter(g => g.completedAt).length,
        total: weekGoals.length,
      },
      thisMonth: {
        completed: monthGoals.filter(g => g.completedAt).length,
        total: monthGoals.length,
      },
      byCategory: {
        problems: { completed: 0, total: 0 },
        time: { completed: 0, total: 0 },
        streak: { completed: 0, total: 0 },
        applications: { completed: 0, total: 0 },
        commits: { completed: 0, total: 0 },
        courses: { completed: 0, total: 0 },
        custom: { completed: 0, total: 0 },
      },
    };
  }

  // ========================================
  // CALCULATE STREAK
  // ========================================
  static async calculateStreak(userId: string): Promise<{ current: number; longest: number }> {
    // Get all tracker entries ordered by date
    const entries = await prisma.trackerEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    if (entries.length === 0) {
      return { current: 0, longest: 0 };
    }

    // Get unique dates
    const uniqueDates = [...new Set(
      entries.map(e => startOfDay(e.date).getTime())
    )].sort((a, b) => b - a);

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
        if (diff === 86400000) { // Exactly 1 day
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

  // ========================================
  // AUTO-UPDATE GOALS FROM TRACKER
  // ========================================
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

    // Calculate totals
    const totalProblems = todayEntries.reduce((sum, e) => sum + (e.problems || 0), 0);
    const totalTime = todayEntries.reduce((sum, e) => sum + (e.timeSpent || 0), 0);

    // Get active goals
    const activeGoals = await prisma.goal.findMany({
      where: {
        userId,
        completedAt: null,
      },
    });

    // Update relevant goals
    for (const goal of activeGoals) {
      // This is simplified - would need category tracking
      if (goal.title.toLowerCase().includes('problem')) {
        await this.updateProgress(userId, goal.id, totalProblems);
      } else if (goal.title.toLowerCase().includes('hour') || goal.title.toLowerCase().includes('time')) {
        await this.updateProgress(userId, goal.id, totalTime);
      }
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================
  private static formatGoal(goal: any): Goal {
    return {
      id: goal.id,
      userId: goal.userId,
      title: goal.title,
      target: goal.target,
      progress: goal.progress || 0,
      deadline: goal.deadline,
      startDate: goal.createdAt,
      completedAt: goal.completedAt,
      status: goal.completedAt ? 'completed' : 'active',
      type: 'custom',
      category: 'custom',
      createdAt: goal.createdAt,
    };
  }

  private static formatGoalWithProgress(goal: any): GoalWithProgress {
    const formatted = this.formatGoal(goal);
    const progress = goal.progress || 0;
    const target = goal.target;
    const percentage = target > 0 ? Math.min(Math.round((progress / target) * 100), 100) : 0;

    let daysLeft: number | undefined;
    if (goal.deadline) {
      daysLeft = Math.max(0, differenceInDays(new Date(goal.deadline), new Date()));
    }

    return {
      ...formatted,
      progressInfo: {
        current: progress,
        target,
        percentage,
        remaining: Math.max(0, target - progress),
        isComplete: progress >= target,
        daysLeft,
      },
    };
  }
}

export default GoalService;