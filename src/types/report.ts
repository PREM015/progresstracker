// src/types/report.ts
// ===== FILE: src/types/report.ts =====
// Complete report types matching Prisma Report model

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Report type */
export type ReportType = 'weekly' | 'monthly' | 'yearly' | 'custom' | 'on_demand';

/** Report status */
export type ReportStatus = 'generating' | 'generated' | 'sent' | 'failed';

/** Report format */
export type ReportFormat = 'html' | 'pdf' | 'json';

/** Report delivery method */
export type ReportDeliveryMethod = 'email' | 'download' | 'both';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Report (matches Prisma Report model) */
export interface Report {
  id: string;
  userId: string;

  // Type
  type: string;

  // Period
  periodStart: Date;
  periodEnd: Date;

  // Content
  title: string;
  summary?: string;
  // data structure: { "stats": {...}, "charts": [...], "comparisons": {...} }
  data: ReportData;

  // Stats
  highlights?: ReportHighlight[];
  insights?: ReportInsight[];
  recommendations?: ReportRecommendation[];

  // Status
  status: string;

  // Delivery
  sentAt?: Date;
  sentTo?: string;

  // File
  pdfUrl?: string;

  // Timestamps
  createdAt: Date;

  // Relations
  user?: {
    id: string;
    name?: string;
    email?: string;
  };
}

/** Report data structure */
export interface ReportData {
  // Summary stats
  stats: ReportStats;

  // Charts data
  charts?: ReportChart[];

  // Comparisons with previous period
  comparisons?: ReportComparison;

  // Platform breakdown
  platforms?: PlatformBreakdown[];

  // Category breakdown
  categories?: CategoryBreakdown[];

  // Daily activity
  dailyActivity?: DailyActivity[];

  // Goals progress
  goals?: GoalProgress[];

  // Achievements
  achievements?: AchievementSummary[];
}

/** Report stats */
export interface ReportStats {
  // Problems
  totalProblems: number;
  easyProblems: number;
  mediumProblems: number;
  hardProblems: number;
  problemsChange?: number;

  // Code
  totalCommits: number;
  totalPullRequests: number;
  totalCodeReviews: number;
  commitsChange?: number;

  // Time
  totalTimeSpent: number; // minutes
  avgTimePerDay: number;
  timeChange?: number;

  // Points & Rating
  totalPoints: number;
  pointsEarned: number;
  pointsChange?: number;

  // Streak
  currentStreak: number;
  longestStreak: number;
  streakChange?: number;

  // Activity
  activeDays: number;
  totalDays: number;
  activityRate: number;

  // Learning
  coursesCompleted: number;
  certificationsEarned: number;

  // Jobs
  applicationsSubmitted: number;
  interviewsCompleted: number;
}

/** Report highlight */
export interface ReportHighlight {
  metric: string;
  value: number;
  change: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'stable';
  isPositive: boolean;
}

/** Report insight */
export interface ReportInsight {
  type: 'streak' | 'improvement' | 'milestone' | 'recommendation' | 'warning';
  title: string;
  message: string;
  icon?: string;
  color?: string;
}

/** Report recommendation */
export interface ReportRecommendation {
  action: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
}

/** Report chart */
export interface ReportChart {
  type: 'line' | 'bar' | 'pie' | 'area' | 'heatmap';
  title: string;
  data: unknown;
  config?: Record<string, unknown>;
}

/** Report comparison */
export interface ReportComparison {
  currentPeriod: ReportStats;
  previousPeriod: ReportStats;
  changes: Record<string, {
    absolute: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

/** Platform breakdown */
export interface PlatformBreakdown {
  platformId: string;
  platformName: string;
  platformSlug: string;
  icon?: string;
  color?: string;
  problems: number;
  commits: number;
  time: number;
  points: number;
  percentage: number;
}

/** Category breakdown */
export interface CategoryBreakdown {
  category: string;
  categoryLabel: string;
  problems: number;
  commits: number;
  time: number;
  entries: number;
  percentage: number;
}

/** Daily activity */
export interface DailyActivity {
  date: string;
  problems: number;
  commits: number;
  time: number;
  points: number;
  hadActivity: boolean;
}

/** Goal progress in report */
export interface GoalProgress {
  id: string;
  title: string;
  progress: number;
  target: number;
  percentage: number;
  status: string;
  deadline?: Date;
}

/** Achievement summary in report */
export interface AchievementSummary {
  id: string;
  title: string;
  description: string;
  icon?: string;
  rarity: string;
  unlockedAt: Date;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Generate report input */
export interface GenerateReportInput {
  type: ReportType;
  periodStart?: Date | string;
  periodEnd?: Date | string;
  format?: ReportFormat;
  deliveryMethod?: ReportDeliveryMethod;
  emailTo?: string;
  includeCharts?: boolean;
  includeComparisons?: boolean;
  platforms?: string[];
  categories?: string[];
}

/** Schedule report input */
export interface ScheduleReportInput {
  type: ReportType;
  frequency: 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:MM
  timezone: string;
  deliveryMethod: ReportDeliveryMethod;
  emailTo?: string;
  isActive: boolean;
}

/** Report filter */
export interface ReportFilter {
  type?: ReportType;
  status?: ReportStatus;
  startDate?: Date;
  endDate?: Date;
}

// =============================================================================
// DISPLAY CONFIGURATIONS
// =============================================================================

/** Report type configuration */
export const REPORT_TYPE_CONFIG: Record<ReportType, {
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultPeriodDays: number;
}> = {
  weekly: {
    label: 'Weekly Report',
    description: 'Your activity summary for the past week',
    icon: 'Calendar',
    color: '#3B82F6',
    defaultPeriodDays: 7
  },
  monthly: {
    label: 'Monthly Report',
    description: 'Your activity summary for the past month',
    icon: 'CalendarDays',
    color: '#8B5CF6',
    defaultPeriodDays: 30
  },
  yearly: {
    label: 'Yearly Report',
    description: 'Your activity summary for the past year',
    icon: 'CalendarRange',
    color: '#EC4899',
    defaultPeriodDays: 365
  },
  custom: {
    label: 'Custom Report',
    description: 'Choose your own date range',
    icon: 'Settings',
    color: '#F59E0B',
    defaultPeriodDays: 30
  },
  on_demand: {
    label: 'On-Demand Report',
    description: 'Generate a report anytime',
    icon: 'Zap',
    color: '#10B981',
    defaultPeriodDays: 7
  },
};

/** Report status configuration */
export const REPORT_STATUS_CONFIG: Record<ReportStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  generating: {
    label: 'Generating',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'Loader'
  },
  generated: {
    label: 'Generated',
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: 'CheckCircle'
  },
  sent: {
    label: 'Sent',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: 'Send'
  },
  failed: {
    label: 'Failed',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: 'XCircle'
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get report type config */
export function getReportTypeConfig(type: ReportType) {
  return REPORT_TYPE_CONFIG[type];
}

/** Get report status config */
export function getReportStatusConfig(status: ReportStatus) {
  return REPORT_STATUS_CONFIG[status];
}

/** Generate report title */
export function generateReportTitle(type: ReportType, periodStart: Date, periodEnd: Date): string {
  const typeConfig = REPORT_TYPE_CONFIG[type];
  const startStr = new Date(periodStart).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const endStr = new Date(periodEnd).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return `${typeConfig.label}: ${startStr} - ${endStr}`;
}

/** Calculate highlights */
export function calculateHighlights(
  current: ReportStats,
  previous?: ReportStats
): ReportHighlight[] {
  const highlights: ReportHighlight[] = [];

  const addHighlight = (metric: string, currentVal: number, previousVal?: number) => {
    const change = previousVal !== undefined ? currentVal - previousVal : 0;
    const changePercentage = previousVal ? ((change / previousVal) * 100) : 0;
    const trend: 'up' | 'down' | 'stable' =
      change > 0 ? 'up' : change < 0 ? 'down' : 'stable';

    highlights.push({
      metric,
      value: currentVal,
      change,
      changePercentage: Math.round(changePercentage * 10) / 10,
      trend,
      isPositive: change >= 0,
    });
  };

  addHighlight('Problems Solved', current.totalProblems, previous?.totalProblems);
  addHighlight('Commits', current.totalCommits, previous?.totalCommits);
  addHighlight('Time Spent', current.totalTimeSpent, previous?.totalTimeSpent);
  addHighlight('Current Streak', current.currentStreak, previous?.currentStreak);

  return highlights.sort((a, b) => Math.abs(b.changePercentage) - Math.abs(a.changePercentage));
}

/** Generate insights */
export function generateInsights(stats: ReportStats): ReportInsight[] {
  const insights: ReportInsight[] = [];

  // Streak insights
  if (stats.currentStreak >= 7) {
    insights.push({
      type: 'streak',
      title: 'Great Streak!',
      message: `You've maintained a ${stats.currentStreak}-day streak. Keep it up!`,
      icon: 'Flame',
      color: '#EF4444',
    });
  }

  // Improvement insights
  if (stats.problemsChange && stats.problemsChange > 10) {
    insights.push({
      type: 'improvement',
      title: 'Impressive Growth',
      message: `You solved ${stats.problemsChange} more problems than last period!`,
      icon: 'TrendingUp',
      color: '#10B981',
    });
  }

  // Milestone insights
  if (stats.totalProblems >= 100 && stats.totalProblems < 110) {
    insights.push({
      type: 'milestone',
      title: '100 Problems Milestone',
      message: 'Congratulations on solving 100+ problems!',
      icon: 'Trophy',
      color: '#F59E0B',
    });
  }

  // Warning insights
  if (stats.currentStreak === 0 && stats.activeDays < 3) {
    insights.push({
      type: 'warning',
      title: 'Low Activity',
      message: 'Try to be more consistent with your daily practice.',
      icon: 'AlertTriangle',
      color: '#F59E0B',
    });
  }

  return insights;
}

/** Generate recommendations */
export function generateRecommendations(stats: ReportStats): ReportRecommendation[] {
  const recommendations: ReportRecommendation[] = [];

  // Consistency recommendation
  if (stats.activityRate < 50) {
    recommendations.push({
      action: 'Improve consistency',
      reason: `Your activity rate is ${stats.activityRate}%. Try to practice daily.`,
      priority: 'high',
      category: 'consistency',
    });
  }

  // Difficulty recommendation
  if (stats.hardProblems === 0 && stats.mediumProblems > 10) {
    recommendations.push({
      action: 'Challenge yourself',
      reason: 'Try solving some hard problems to improve your skills.',
      priority: 'medium',
      category: 'difficulty',
    });
  }

  // Time recommendation
  if (stats.avgTimePerDay < 30) {
    recommendations.push({
      action: 'Increase practice time',
      reason: 'Try to spend at least 1 hour per day practicing.',
      priority: 'medium',
      category: 'time',
    });
  }

  return recommendations;
}

/** Format period string */
export function formatPeriodString(periodStart: Date, periodEnd: Date): string {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = end.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  }

  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/** Calculate comparison */
export function calculateComparison(
  current: ReportStats,
  previous: ReportStats
): ReportComparison {
  const calculateChange = (currentVal: number, previousVal: number) => {
    const absolute = currentVal - previousVal;
    const percentage = previousVal > 0 ? ((absolute / previousVal) * 100) : 0;
    const trend: 'up' | 'down' | 'stable' =
      Math.abs(percentage) < 1 ? 'stable' : absolute > 0 ? 'up' : 'down';

    return { absolute, percentage: Math.round(percentage * 10) / 10, trend };
  };

  return {
    currentPeriod: current,
    previousPeriod: previous,
    changes: {
      problems: calculateChange(current.totalProblems, previous.totalProblems),
      commits: calculateChange(current.totalCommits, previous.totalCommits),
      time: calculateChange(current.totalTimeSpent, previous.totalTimeSpent),
      points: calculateChange(current.totalPoints, previous.totalPoints),
      streak: calculateChange(current.currentStreak, previous.currentStreak),
    },
  };
}

/** Validate report period */
export function validateReportPeriod(start: Date, end: Date): {
  valid: boolean;
  errors: string[]
} {
  const errors: string[] = [];

  if (start >= end) {
    errors.push('End date must be after start date');
  }

  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 365) {
    errors.push('Report period cannot exceed 365 days');
  }

  if (diffDays < 1) {
    errors.push('Report period must be at least 1 day');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}


/** Export history item */
export interface ExportHistoryItem {
  id: string;
  userId: string;
  type: string;
  format: string;
  status: 'pending' | 'completed' | 'failed';
  url?: string;
  size?: number; // bytes
  createdAt: Date;
  completedAt?: Date;
}

export default Report;