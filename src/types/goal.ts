// ===== FILE: src/types/goal.ts =====
// Complete goal types matching Prisma schema

import type { 
  GoalStatus as PrismaGoalStatus,
  GoalType as PrismaGoalType,
  GoalMetric as PrismaGoalMetric,
  PlatformCategory as PrismaPlatformCategory,
} from '@prisma/client';

// =============================================================================
// ENUMS & TYPE ALIASES
// =============================================================================

/** Goal type (matches Prisma) */
export type GoalType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom' | 'streak' | 'milestone';

/** Goal status (matches Prisma) */
export type GoalStatus = 'draft' | 'active' | 'paused' | 'completed' | 'failed' | 'archived' | 'cancelled';

/** Goal metric type (matches Prisma) */
export type GoalMetric = 
  | 'problems_solved'
  | 'commits'
  | 'pull_requests'
  | 'projects_completed'
  | 'courses_completed'
  | 'certifications'
  | 'applications_submitted'
  | 'contests_participated'
  | 'time_spent'
  | 'streak_days'
  | 'custom';

/** Goal category (simplified) */
export type GoalCategory = 
  | 'problems'
  | 'time'
  | 'streak'
  | 'applications'
  | 'commits'
  | 'courses'
  | 'projects'
  | 'certifications'
  | 'contests'
  | 'custom';

/** Map Prisma types to local types */
export const GOAL_TYPE_MAP: Record<PrismaGoalType, GoalType> = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
  CUSTOM: 'custom',
  STREAK: 'streak',
  MILESTONE: 'milestone',
};

export const GOAL_STATUS_MAP: Record<PrismaGoalStatus, GoalStatus> = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ARCHIVED: 'archived',
  CANCELLED: 'cancelled',
};

export const GOAL_METRIC_MAP: Record<PrismaGoalMetric, GoalMetric> = {
  PROBLEMS_SOLVED: 'problems_solved',
  COMMITS: 'commits',
  PULL_REQUESTS: 'pull_requests',
  PROJECTS_COMPLETED: 'projects_completed',
  COURSES_COMPLETED: 'courses_completed',
  CERTIFICATIONS: 'certifications',
  APPLICATIONS_SUBMITTED: 'applications_submitted',
  CONTESTS_PARTICIPATED: 'contests_participated',
  TIME_SPENT: 'time_spent',
  STREAK_DAYS: 'streak_days',
  CUSTOM: 'custom',
};

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Goal milestone */
export interface GoalMilestone {
  value: number;
  label: string;
  reached: boolean;
  reachedAt?: Date;
}

/** Goal best day record */
export interface GoalBestDay {
  date: string;
  progress: number;
}

/** Main Goal interface */
export interface Goal {
  id: string;
  userId: string;
  platformId?: string;
  
  // Basic info
  title: string;
  description?: string;
  
  // Classification
  category: PrismaPlatformCategory;
  goalType: GoalType;
  metric: GoalMetric;
  customMetric?: string;
  
  // Target & Progress
  target: number;
  progress: number;
  progressPercentage: number;
  unit?: string;
  
  // Time Period
  startDate: Date;
  endDate?: Date;
  deadline?: Date;
  
  // Status
  status: GoalStatus;
  completedAt?: Date;
  failedAt?: Date;
  
  // Milestones
  milestones?: GoalMilestone[];
  
  // Streaks
  currentStreakDays: number;
  requiredStreakDays?: number;
  
  // Sharing
  isPublic: boolean;
  shareCode?: string;
  
  // Reminders
  reminderEnabled: boolean;
  
  // Stats
  daysActive: number;
  avgDailyProgress: number;
  bestDay?: GoalBestDay;
  
  // Customization
  color?: string;
  icon?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  platform?: {
    id: string;
    name: string;
    slug: string;
    icon?: string;
    color?: string;
  };
  reminders?: GoalReminder[];
}

/** Goal reminder */
export interface GoalReminder {
  id: string;
  goalId: string;
  userId: string;
  frequency: 'daily' | 'weekdays' | 'weekly' | 'custom';
  time: string;
  timezone: string;
  days: number[];
  channel: 'in_app' | 'email' | 'push';
  isActive: boolean;
  lastSentAt?: Date;
  nextSendAt?: Date;
  sendCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Goal progress info */
export interface GoalProgress {
  current: number;
  target: number;
  percentage: number;
  remaining: number;
  isComplete: boolean;
  daysLeft?: number;
  daysElapsed: number;
  avgPerDay: number;
  projectedCompletion?: Date;
  onTrack: boolean;
}

/** Goal with progress */
export interface GoalWithProgress extends Goal {
  progressInfo: GoalProgress;
}

/** Goal statistics */
export interface GoalStats {
  total: number;
  active: number;
  completed: number;
  failed: number;
  paused: number;
  draft: number;
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
  byCategory: Record<GoalCategory, { completed: number; total: number; rate: number }>;
  byType: Record<GoalType, { completed: number; total: number; rate: number }>;
  recentCompleted: Goal[];
  upcomingDeadlines: Goal[];
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Create goal request */
export interface CreateGoalRequest {
  title: string;
  description?: string;
  category: PrismaPlatformCategory;
  goalType: GoalType;
  metric: GoalMetric;
  customMetric?: string;
  target: number;
  unit?: string;
  startDate?: string;
  deadline?: string;
  platformId?: string;
  isPublic?: boolean;
  reminderEnabled?: boolean;
  color?: string;
  icon?: string;
}

/** Update goal request */
export interface UpdateGoalRequest {
  title?: string;
  description?: string;
  target?: number;
  progress?: number;
  deadline?: string;
  status?: GoalStatus;
  isPublic?: boolean;
  reminderEnabled?: boolean;
  color?: string;
  icon?: string;
}

/** Goal form data */
export interface GoalFormData {
  title: string;
  description?: string;
  type: GoalType;
  category: GoalCategory;
  metric: GoalMetric;
  target: number;
  unit?: string;
  deadline?: Date | string;
  platformId?: string;
  reminderEnabled?: boolean;
  reminderTime?: string;
}

/** Goal filter options */
export interface GoalFilter {
  status?: GoalStatus | GoalStatus[];
  type?: GoalType | GoalType[];
  category?: GoalCategory | GoalCategory[];
  platformId?: string;
  isPublic?: boolean;
  hasDeadline?: boolean;
  search?: string;
}

/** Goal sort options */
export interface GoalSortOptions {
  field: 'createdAt' | 'deadline' | 'progress' | 'title' | 'updatedAt';
  order: 'asc' | 'desc';
}

// =============================================================================
// TEMPLATES
// =============================================================================

/** Goal template */
export interface GoalTemplate {
  id: string;
  title: string;
  description: string;
  type: GoalType;
  category: GoalCategory;
  metric: GoalMetric;
  target: number;
  unit: string;
  icon: string;
  emoji: string;
  color: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedDays?: number;
  tags: string[];
}

/** Predefined goal templates */
export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: 'daily-5-problems',
    title: 'Solve 5 Problems Daily',
    description: 'Complete 5 coding problems every day',
    type: 'daily',
    category: 'problems',
    metric: 'problems_solved',
    target: 5,
    unit: 'problems',
    icon: 'Target',
    emoji: '🎯',
    color: '#6366F1',
    difficulty: 'easy',
    tags: ['daily', 'problems', 'beginner'],
  },
  {
    id: 'weekly-25-problems',
    title: 'Weekly 25 Problems',
    description: 'Solve 25 problems this week',
    type: 'weekly',
    category: 'problems',
    metric: 'problems_solved',
    target: 25,
    unit: 'problems',
    icon: 'BarChart',
    emoji: '📊',
    color: '#10B981',
    difficulty: 'medium',
    tags: ['weekly', 'problems'],
  },
  {
    id: 'monthly-100-problems',
    title: 'Monthly 100 Club',
    description: 'Join the 100 problems per month club',
    type: 'monthly',
    category: 'problems',
    metric: 'problems_solved',
    target: 100,
    unit: 'problems',
    icon: 'Trophy',
    emoji: '🏆',
    color: '#F59E0B',
    difficulty: 'hard',
    tags: ['monthly', 'problems', 'challenge'],
  },
  {
    id: 'daily-2-hours',
    title: '2 Hours Daily Coding',
    description: 'Code for at least 2 hours every day',
    type: 'daily',
    category: 'time',
    metric: 'time_spent',
    target: 120,
    unit: 'minutes',
    icon: 'Clock',
    emoji: '⏱️',
    color: '#8B5CF6',
    difficulty: 'medium',
    tags: ['daily', 'time', 'consistency'],
  },
  {
    id: 'weekly-commits',
    title: 'Weekly GitHub Commits',
    description: 'Make at least 20 commits this week',
    type: 'weekly',
    category: 'commits',
    metric: 'commits',
    target: 20,
    unit: 'commits',
    icon: 'GitCommit',
    emoji: '💻',
    color: '#1F2937',
    difficulty: 'medium',
    tags: ['weekly', 'github', 'commits'],
  },
  {
    id: 'job-applications',
    title: 'Apply to 10 Jobs',
    description: 'Send 10 job applications this week',
    type: 'weekly',
    category: 'applications',
    metric: 'applications_submitted',
    target: 10,
    unit: 'applications',
    icon: 'Briefcase',
    emoji: '💼',
    color: '#10B981',
    difficulty: 'medium',
    tags: ['weekly', 'jobs', 'applications'],
  },
  {
    id: '7-day-streak',
    title: '7 Day Streak',
    description: 'Maintain a 7 day coding streak',
    type: 'streak',
    category: 'streak',
    metric: 'streak_days',
    target: 7,
    unit: 'days',
    icon: 'Flame',
    emoji: '🔥',
    color: '#EF4444',
    difficulty: 'easy',
    estimatedDays: 7,
    tags: ['streak', 'consistency', 'beginner'],
  },
  {
    id: '30-day-streak',
    title: '30 Day Streak',
    description: 'Maintain a 30 day coding streak',
    type: 'streak',
    category: 'streak',
    metric: 'streak_days',
    target: 30,
    unit: 'days',
    icon: 'Flame',
    emoji: '🔥',
    color: '#EF4444',
    difficulty: 'hard',
    estimatedDays: 30,
    tags: ['streak', 'consistency', 'challenge'],
  },
  {
    id: 'complete-course',
    title: 'Complete a Course',
    description: 'Finish an online course this month',
    type: 'monthly',
    category: 'courses',
    metric: 'courses_completed',
    target: 1,
    unit: 'course',
    icon: 'BookOpen',
    emoji: '📚',
    color: '#EC4899',
    difficulty: 'medium',
    tags: ['monthly', 'learning', 'courses'],
  },
  {
    id: 'earn-certification',
    title: 'Earn a Certification',
    description: 'Get a professional certification this month',
    type: 'monthly',
    category: 'certifications',
    metric: 'certifications',
    target: 1,
    unit: 'certification',
    icon: 'Award',
    emoji: '🏅',
    color: '#F59E0B',
    difficulty: 'hard',
    tags: ['monthly', 'certification', 'career'],
  },
];

// =============================================================================
// DISPLAY CONFIGURATIONS
// =============================================================================

/** Goal type configuration */
export const GOAL_TYPE_CONFIG: Record<GoalType, {
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  defaultDays: number | null;
}> = {
  daily: { label: 'Daily Goal', shortLabel: 'Daily', icon: 'Sun', color: '#F59E0B', defaultDays: 1 },
  weekly: { label: 'Weekly Goal', shortLabel: 'Weekly', icon: 'Calendar', color: '#10B981', defaultDays: 7 },
  monthly: { label: 'Monthly Goal', shortLabel: 'Monthly', icon: 'CalendarDays', color: '#6366F1', defaultDays: 30 },
  quarterly: { label: 'Quarterly Goal', shortLabel: 'Quarterly', icon: 'CalendarRange', color: '#8B5CF6', defaultDays: 90 },
  yearly: { label: 'Yearly Goal', shortLabel: 'Yearly', icon: 'CalendarClock', color: '#EC4899', defaultDays: 365 },
  custom: { label: 'Custom Goal', shortLabel: 'Custom', icon: 'Settings', color: '#6B7280', defaultDays: null },
  streak: { label: 'Streak Goal', shortLabel: 'Streak', icon: 'Flame', color: '#EF4444', defaultDays: null },
  milestone: { label: 'Milestone', shortLabel: 'Milestone', icon: 'Flag', color: '#14B8A6', defaultDays: null },
};

/** Goal status configuration */
export const GOAL_STATUS_CONFIG: Record<GoalStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  draft: { label: 'Draft', color: '#6B7280', bgColor: '#F3F4F6', icon: 'FileEdit' },
  active: { label: 'Active', color: '#3B82F6', bgColor: '#DBEAFE', icon: 'Play' },
  paused: { label: 'Paused', color: '#F59E0B', bgColor: '#FEF3C7', icon: 'Pause' },
  completed: { label: 'Completed', color: '#10B981', bgColor: '#D1FAE5', icon: 'CheckCircle' },
  failed: { label: 'Failed', color: '#EF4444', bgColor: '#FEE2E2', icon: 'XCircle' },
  archived: { label: 'Archived', color: '#6B7280', bgColor: '#F3F4F6', icon: 'Archive' },
  cancelled: { label: 'Cancelled', color: '#6B7280', bgColor: '#F3F4F6', icon: 'Ban' },
};

/** Goal category configuration */
export const GOAL_CATEGORY_CONFIG: Record<GoalCategory, {
  label: string;
  icon: string;
  color: string;
  metrics: GoalMetric[];
}> = {
  problems: { label: 'Problem Solving', icon: 'Code', color: '#6366F1', metrics: ['problems_solved'] },
  time: { label: 'Time Spent', icon: 'Clock', color: '#8B5CF6', metrics: ['time_spent'] },
  streak: { label: 'Streaks', icon: 'Flame', color: '#EF4444', metrics: ['streak_days'] },
  applications: { label: 'Job Applications', icon: 'Briefcase', color: '#10B981', metrics: ['applications_submitted'] },
  commits: { label: 'Git Commits', icon: 'GitCommit', color: '#1F2937', metrics: ['commits', 'pull_requests'] },
  courses: { label: 'Courses', icon: 'BookOpen', color: '#EC4899', metrics: ['courses_completed'] },
  projects: { label: 'Projects', icon: 'Folder', color: '#F59E0B', metrics: ['projects_completed'] },
  certifications: { label: 'Certifications', icon: 'Award', color: '#14B8A6', metrics: ['certifications'] },
  contests: { label: 'Contests', icon: 'Trophy', color: '#F97316', metrics: ['contests_participated'] },
  custom: { label: 'Custom', icon: 'Settings', color: '#6B7280', metrics: ['custom'] },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Calculate goal progress */
export function calculateGoalProgress(goal: Goal): GoalProgress {
  const percentage = goal.target > 0 ? Math.min(100, (goal.progress / goal.target) * 100) : 0;
  const remaining = Math.max(0, goal.target - goal.progress);
  const isComplete = goal.progress >= goal.target;
  
  const startDate = new Date(goal.startDate);
  const now = new Date();
  const daysElapsed = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const avgPerDay = goal.progress / daysElapsed;
  
  let daysLeft: number | undefined;
  let projectedCompletion: Date | undefined;
  let onTrack = true;
  
  if (goal.deadline) {
    const deadline = new Date(goal.deadline);
    daysLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    if (avgPerDay > 0 && remaining > 0) {
      const daysNeeded = remaining / avgPerDay;
      projectedCompletion = new Date(now.getTime() + daysNeeded * 24 * 60 * 60 * 1000);
      onTrack = projectedCompletion <= deadline;
    }
  }
  
  return {
    current: goal.progress,
    target: goal.target,
    percentage: Math.round(percentage * 10) / 10,
    remaining,
    isComplete,
    daysLeft,
    daysElapsed,
    avgPerDay: Math.round(avgPerDay * 10) / 10,
    projectedCompletion,
    onTrack,
  };
}

/** Get goal template by ID */
export function getGoalTemplate(id: string): GoalTemplate | undefined {
  return GOAL_TEMPLATES.find((t) => t.id === id);
}

/** Get templates by category */
export function getTemplatesByCategory(category: GoalCategory): GoalTemplate[] {
  return GOAL_TEMPLATES.filter((t) => t.category === category);
}

/** Check if goal is overdue */
export function isGoalOverdue(goal: Goal): boolean {
  if (!goal.deadline || goal.status === 'completed') return false;
  return new Date() > new Date(goal.deadline);
}

/** Get days until deadline */
export function getDaysUntilDeadline(goal: Goal): number | null {
  if (!goal.deadline) return null;
  const deadline = new Date(goal.deadline);
  const now = new Date();
  return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** Format goal progress text */
export function formatGoalProgress(goal: Goal): string {
  const unit = goal.unit || 'units';
  return `${goal.progress} / ${goal.target} ${unit}`;
}

export default Goal;