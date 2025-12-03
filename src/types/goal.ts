// src/types/goal.ts

export type GoalType = 'daily' | 'weekly' | 'monthly' | 'custom';
export type GoalCategory = 'problems' | 'time' | 'streak' | 'applications' | 'commits' | 'courses' | 'custom';
export type GoalStatus = 'active' | 'completed' | 'failed' | 'paused';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: GoalType;
  category: GoalCategory;
  target: number;
  progress: number;
  unit?: string;
  deadline?: Date | string;
  startDate: Date | string;
  completedAt?: Date | string;
  status: GoalStatus;
  platformId?: string;
  platform?: {
    id: string;
    name: string;
    icon?: string;
  };
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface GoalFormData {
  title: string;
  description?: string;
  type: GoalType;
  category: GoalCategory;
  target: number;
  unit?: string;
  deadline?: Date | string;
  platformId?: string;
}

export interface GoalUpdateData {
  title?: string;
  description?: string;
  target?: number;
  progress?: number;
  deadline?: Date | string;
  status?: GoalStatus;
}

export interface GoalProgress {
  current: number;
  target: number;
  percentage: number;
  remaining: number;
  isComplete: boolean;
  daysLeft?: number;
}

export interface GoalStats {
  total: number;
  active: number;
  completed: number;
  failed: number;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  thisWeek: {
    completed: number;
    total: number;
  };
  thisMonth: {
    completed: number;
    total: number;
  };
  byCategory: Record<GoalCategory, { completed: number; total: number }>;
}

export interface GoalWithProgress extends Goal {
  progressInfo: GoalProgress;
}

export interface CreateGoalRequest {
  title: string;
  description?: string;
  type: GoalType;
  category: GoalCategory;
  target: number;
  unit?: string;
  deadline?: string;
  platformId?: string;
}

export interface UpdateGoalRequest {
  title?: string;
  description?: string;
  target?: number;
  progress?: number;
  deadline?: string;
  status?: GoalStatus;
}

export interface GoalFilter {
  status?: GoalStatus;
  type?: GoalType;
  category?: GoalCategory;
  platformId?: string;
}

// Goal templates for quick creation
export interface GoalTemplate {
  id: string;
  title: string;
  description: string;
  type: GoalType;
  category: GoalCategory;
  target: number;
  unit: string;
  icon: string;
}

export const goalTemplates: GoalTemplate[] = [
  {
    id: 'daily-5-problems',
    title: 'Solve 5 Problems Daily',
    description: 'Complete 5 coding problems every day',
    type: 'daily',
    category: 'problems',
    target: 5,
    unit: 'problems',
    icon: '🎯',
  },
  {
    id: 'weekly-25-problems',
    title: 'Weekly 25 Problems',
    description: 'Solve 25 problems this week',
    type: 'weekly',
    category: 'problems',
    target: 25,
    unit: 'problems',
    icon: '📊',
  },
  {
    id: 'monthly-100-problems',
    title: 'Monthly 100 Club',
    description: 'Join the 100 problems per month club',
    type: 'monthly',
    category: 'problems',
    target: 100,
    unit: 'problems',
    icon: '🏆',
  },
  {
    id: 'daily-2-hours',
    title: '2 Hours Daily Coding',
    description: 'Code for at least 2 hours every day',
    type: 'daily',
    category: 'time',
    target: 120,
    unit: 'minutes',
    icon: '⏱️',
  },
  {
    id: 'weekly-commits',
    title: 'Weekly GitHub Commits',
    description: 'Make at least 20 commits this week',
    type: 'weekly',
    category: 'commits',
    target: 20,
    unit: 'commits',
    icon: '💻',
  },
  {
    id: 'job-applications',
    title: 'Apply to 10 Jobs',
    description: 'Send 10 job applications this week',
    type: 'weekly',
    category: 'applications',
    target: 10,
    unit: 'applications',
    icon: '💼',
  },
  {
    id: '7-day-streak',
    title: '7 Day Streak',
    description: 'Maintain a 7 day coding streak',
    type: 'custom',
    category: 'streak',
    target: 7,
    unit: 'days',
    icon: '🔥',
  },
  {
    id: 'complete-course',
    title: 'Complete a Course',
    description: 'Finish an online course this month',
    type: 'monthly',
    category: 'courses',
    target: 1,
    unit: 'course',
    icon: '📚',
  },
];