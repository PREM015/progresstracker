// ===== FILE: src/types/analytics.ts =====
// Complete analytics types for charts, stats, and insights

import type { PlatformCategory as PrismaPlatformCategory } from '@prisma/client';

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Date grouping options */
export type DateGrouping = 'day' | 'week' | 'month' | 'quarter' | 'year';

/** Time range presets */
export type TimeRange = '7d' | '14d' | '30d' | '90d' | '180d' | '365d' | 'all' | 'custom';

/** Chart types */
export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'donut' | 'heatmap' | 'radar' | 'scatter';

/** Insight types */
export type InsightType =
  | 'streak'
  | 'improvement'
  | 'decline'
  | 'milestone'
  | 'recommendation'
  | 'warning'
  | 'celebration'
  | 'tip';

/** Insight priority */
export type InsightPriority = 'low' | 'medium' | 'high' | 'critical';

/** Comparison period */
export type ComparisonPeriod = 'previous' | 'lastWeek' | 'lastMonth' | 'lastYear' | 'custom';

/** Trend direction */
export type TrendDirection = 'up' | 'down' | 'stable';

// =============================================================================
// CORE STATS INTERFACES
// =============================================================================

/** Main statistics interface */
export interface Stats {
  // Totals
  totalProblems: number;
  totalCommits: number;
  totalPullRequests: number;
  totalTime: number; // minutes
  totalPoints: number;
  totalCertifications: number;
  totalApplications: number;

  // Activity
  activeDays: number;
  totalDays: number;
  activityRate: number; // percentage

  // Streaks
  currentStreak: number;
  longestStreak: number;
  streakStartDate?: Date;
  lastActivityDate?: Date;

  // Averages
  avgProblemsPerDay: number;
  avgTimePerDay: number;
  avgCommitsPerDay: number;
  avgPointsPerDay: number;

  // Breakdowns
  platformStats: PlatformStat[];
  categoryStats: CategoryStat[];
  recentActivity: Activity[];

  // Period info
  periodStart: Date;
  periodEnd: Date;
  daysInPeriod: number;
}

/** Platform-specific statistics */
export interface PlatformStat {
  platformId: string;
  platformSlug: string;
  platformName: string;
  platformIcon?: string;
  platformColor?: string;
  category: string;
  problems: number;
  commits: number;
  pullRequests: number;
  time: number;
  points: number;
  count: number; // number of entries
  percentage: number;
  rating?: number;
  rank?: string;
  lastActivity?: Date;
}

/** Category statistics */
export interface CategoryStat {
  category: PrismaPlatformCategory;
  categoryLabel: string;
  categoryColor: string;
  problems: number;
  commits: number;
  time: number;
  points: number;
  platformCount: number;
  entryCount: number;
  percentage: number;
}

/** Activity entry */
export interface Activity {
  id: string;
  date: Date;
  platformId?: string;
  platformName?: string;
  platformIcon?: string;
  platformColor?: string;
  category?: string;
  type: 'problems' | 'commits' | 'time' | 'course' | 'application' | 'other';
  value: number;
  label: string;
  description?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// CHART DATA INTERFACES
// =============================================================================

/** Generic chart data point */
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, unknown>;
}

/** Time series data point */
export interface TimeSeriesPoint {
  date: string; // ISO string or formatted date
  timestamp: number;
  value: number;
  label?: string;
}

/** Multi-series chart data */
export interface MultiSeriesData {
  series: Array<{
    name: string;
    data: TimeSeriesPoint[];
    color?: string;
  }>;
  categories: string[];
}

/** Monthly data for comparisons */
export interface MonthlyData {
  month: string; // "2024-01" format
  monthLabel: string; // "January 2024"
  problems: number;
  commits: number;
  time: number;
  points: number;
  activeDays: number;
  totalDays: number;
  activityRate: number;
  previousMonth?: MonthlyData;
  changePercentage?: number;
}

/** Heatmap data for activity calendar */
export interface HeatmapData {
  date: string; // "YYYY-MM-DD" format
  count: number;
  level: 0 | 1 | 2 | 3 | 4; // intensity level
  details?: {
    problems?: number;
    commits?: number;
    time?: number;
    platforms?: string[];
  };
}

/** Trend data for line charts */
export interface TrendData {
  date: string;
  dateLabel: string;
  problems: number;
  commits: number;
  time: number;
  points: number;
  movingAverage?: number;
  trend?: TrendDirection;
}

/** Pie/Donut chart data */
export interface PieChartData {
  name: string;
  value: number;
  percentage: number;
  color: string;
  icon?: string;
}

/** Radar chart data */
export interface RadarChartData {
  category: string;
  value: number;
  fullMark: number;
}

// =============================================================================
// COMPARISON & INSIGHTS
// =============================================================================

/** Comparison data between periods */
export interface ComparisonData {
  current: Stats;
  previous: Stats;
  changes: {
    problems: ChangeMetric;
    commits: ChangeMetric;
    time: ChangeMetric;
    points: ChangeMetric;
    activeDays: ChangeMetric;
    streak: ChangeMetric;
  };
  periodLabel: {
    current: string;
    previous: string;
  };
  summary: string;
}

/** Change metric with direction */
export interface ChangeMetric {
  current: number;
  previous: number;
  absolute: number;
  percentage: number;
  direction: TrendDirection;
  isPositive: boolean;
}

/** Analytics insight */
export interface Insight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  message: string;
  description?: string;
  value?: number;
  target?: number;
  icon: string;
  color: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  expiresAt?: Date;
}

/** Weekly report data */
export interface WeeklyReport {
  weekNumber: number;
  year: number;
  startDate: Date;
  endDate: Date;
  stats: Stats;
  comparison: ComparisonData;
  highlights: Insight[];
  topPlatforms: PlatformStat[];
  achievements: Array<{
    id: string;
    title: string;
    unlockedAt: Date;
  }>;
  goalsProgress: Array<{
    id: string;
    title: string;
    progress: number;
    target: number;
  }>;
  recommendations: string[];
}

/** Monthly report data */
export interface MonthlyReport {
  month: number;
  year: number;
  monthLabel: string;
  stats: Stats;
  weeklyBreakdown: MonthlyData[];
  comparison: ComparisonData;
  insights: Insight[];
  topAchievements: UserAchievement[];
  completedGoals: Goal[];
  platformGrowth: Array<{
    platform: string;
    growth: number;
    trend: TrendDirection;
  }>;
}

// =============================================================================
// FILTER & QUERY TYPES
// =============================================================================

/** Analytics query parameters */
export interface AnalyticsQuery {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  timeRange?: TimeRange;
  groupBy?: DateGrouping;
  platforms?: string[];
  categories?: PrismaPlatformCategory[];
  includeComparison?: boolean;
  comparisonPeriod?: ComparisonPeriod;
}

/** Dashboard widget configuration */
export interface DashboardWidget {
  id: string;
  type: 'stats' | 'chart' | 'list' | 'progress' | 'heatmap';
  title: string;
  size: 'small' | 'medium' | 'large' | 'full';
  position: { row: number; col: number };
  config: Record<string, unknown>;
  isVisible: boolean;
}

/** Analytics export options */
export interface AnalyticsExportOptions {
  format: 'csv' | 'json' | 'pdf';
  timeRange: TimeRange;
  customRange?: { start: Date; end: Date };
  includeCharts: boolean;
  includePlatformBreakdown: boolean;
  includeDailyData: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Calculate change percentage */
export function calculateChange(current: number, previous: number): ChangeMetric {
  const absolute = current - previous;
  const percentage = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;
  const direction: TrendDirection = absolute > 0 ? 'up' : absolute < 0 ? 'down' : 'stable';

  return {
    current,
    previous,
    absolute,
    percentage: Math.round(percentage * 10) / 10,
    direction,
    isPositive: absolute >= 0,
  };
}

/** Get trend direction */
export function getTrendDirection(values: number[]): TrendDirection {
  if (values.length < 2) return 'stable';
  const first = values.slice(0, Math.floor(values.length / 2));
  const second = values.slice(Math.floor(values.length / 2));
  const avgFirst = first.reduce((a, b) => a + b, 0) / first.length;
  const avgSecond = second.reduce((a, b) => a + b, 0) / second.length;
  const diff = avgSecond - avgFirst;
  if (Math.abs(diff) < avgFirst * 0.05) return 'stable';
  return diff > 0 ? 'up' : 'down';
}

/** Calculate activity level for heatmap */
export function calculateActivityLevel(count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  const ratio = count / maxCount;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/** Format time duration */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/** Get time range dates */
export function getTimeRangeDates(range: TimeRange): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case '7d':
      start.setDate(end.getDate() - 7);
      break;
    case '14d':
      start.setDate(end.getDate() - 14);
      break;
    case '30d':
      start.setDate(end.getDate() - 30);
      break;
    case '90d':
      start.setDate(end.getDate() - 90);
      break;
    case '180d':
      start.setDate(end.getDate() - 180);
      break;
    case '365d':
      start.setDate(end.getDate() - 365);
      break;
    case 'all':
      start.setFullYear(2020, 0, 1);
      break;
    default:
      start.setDate(end.getDate() - 30);
  }

  return { start, end };
}

/** Get insight color */
export function getInsightColor(type: InsightType): string {
  const colors: Record<InsightType, string> = {
    streak: '#EF4444',
    improvement: '#10B981',
    decline: '#F59E0B',
    milestone: '#8B5CF6',
    recommendation: '#3B82F6',
    warning: '#F59E0B',
    celebration: '#EC4899',
    tip: '#06B6D4',
  };
  return colors[type];
}

/** Get insight icon */
export function getInsightIcon(type: InsightType): string {
  const icons: Record<InsightType, string> = {
    streak: 'Flame',
    improvement: 'TrendingUp',
    decline: 'TrendingDown',
    milestone: 'Flag',
    recommendation: 'Lightbulb',
    warning: 'AlertTriangle',
    celebration: 'PartyPopper',
    tip: 'Info',
  };
  return icons[type];
}

// Import for UserAchievement and Goal references
import type { UserAchievement } from './achievement';
import type { Goal } from './goal';

export default Stats;