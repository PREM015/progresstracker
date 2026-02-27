// ===== FILE: src/config/reports.ts =====
// Report generation configuration - synced with Prisma Report model

import type { PlatformCategory } from '@prisma/client';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface ReportConfig {
  /** Enable report generation */
  enabled: boolean;
  /** Available report types */
  types: ReportType[];
  /** Report generation settings */
  generation: ReportGenerationConfig;
  /** Email delivery settings */
  delivery: ReportDeliveryConfig;
  /** Storage settings */
  storage: ReportStorageConfig;
}

export interface ReportType {
  id: string;
  name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  sections: ReportSection[];
  isDefault: boolean;
  isPremium: boolean;
}

export interface ReportSection {
  id: string;
  name: string;
  description: string;
  order: number;
  enabled: boolean;
}

export interface ReportGenerationConfig {
  /** Maximum concurrent report generations */
  maxConcurrent: number;
  /** Timeout for report generation (ms) */
  timeout: number;
  /** Retry attempts on failure */
  retryAttempts: number;
  /** Queue processing interval (ms) */
  queueInterval: number;
}

export interface ReportDeliveryConfig {
  /** Enable email delivery */
  emailEnabled: boolean;
  /** Default send time (HH:MM) */
  defaultSendTime: string;
  /** Retry delivery on failure */
  retryOnFailure: boolean;
  /** Maximum retry attempts */
  maxRetries: number;
}

export interface ReportStorageConfig {
  /** Days to keep generated reports */
  retentionDays: number;
  /** Maximum file size (bytes) */
  maxFileSize: number;
  /** Supported formats */
  formats: ('pdf' | 'html' | 'json')[];
}

export interface ReportData {
  period: {
    start: Date;
    end: Date;
    type: string;
  };
  summary: ReportSummary;
  platforms: ReportPlatformData[];
  goals: ReportGoalData[];
  achievements: ReportAchievementData[];
  streaks: ReportStreakData;
  insights: ReportInsight[];
  recommendations: ReportRecommendation[];
}

export interface ReportSummary {
  totalProblems: number;
  totalCommits: number;
  totalTimeSpent: number;
  totalPoints: number;
  activeDays: number;
  platformsUsed: number;
  goalsCompleted: number;
  achievementsUnlocked: number;
  comparisonToPrevious: {
    problems: number;
    commits: number;
    timeSpent: number;
    trend: 'up' | 'down' | 'stable';
  };
}

export interface ReportPlatformData {
  platformId: string;
  platformName: string;
  category: PlatformCategory;
  metrics: Record<string, number>;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

export interface ReportGoalData {
  goalId: string;
  title: string;
  progress: number;
  target: number;
  status: string;
  daysRemaining: number | null;
}

export interface ReportAchievementData {
  achievementId: string;
  name: string;
  unlockedAt: Date;
  points: number;
  rarity: string;
}

export interface ReportStreakData {
  current: number;
  longest: number;
  totalDays: number;
  freezesUsed: number;
  streakHistory: Array<{ start: Date; end: Date; length: number }>;
}

export interface ReportInsight {
  type: 'positive' | 'negative' | 'neutral';
  category: string;
  message: string;
  metric?: string;
  value?: number;
}

export interface ReportRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  actionUrl?: string;
}

// =============================================================================
// REPORT SECTIONS
// =============================================================================

export const REPORT_SECTIONS: ReportSection[] = [
  {
    id: 'summary',
    name: 'Executive Summary',
    description: 'High-level overview of your progress',
    order: 1,
    enabled: true,
  },
  {
    id: 'platforms',
    name: 'Platform Breakdown',
    description: 'Detailed stats for each connected platform',
    order: 2,
    enabled: true,
  },
  {
    id: 'goals',
    name: 'Goal Progress',
    description: 'Status of your active goals',
    order: 3,
    enabled: true,
  },
  {
    id: 'achievements',
    name: 'Achievements',
    description: 'Recently unlocked achievements',
    order: 4,
    enabled: true,
  },
  {
    id: 'streaks',
    name: 'Streak Analysis',
    description: 'Your coding streak history',
    order: 5,
    enabled: true,
  },
  {
    id: 'charts',
    name: 'Visual Charts',
    description: 'Graphs and charts of your progress',
    order: 6,
    enabled: true,
  },
  {
    id: 'insights',
    name: 'Insights',
    description: 'AI-powered insights about your progress',
    order: 7,
    enabled: true,
  },
  {
    id: 'recommendations',
    name: 'Recommendations',
    description: 'Personalized suggestions for improvement',
    order: 8,
    enabled: true,
  },
  {
    id: 'comparison',
    name: 'Period Comparison',
    description: 'Compare with previous period',
    order: 9,
    enabled: true,
  },
];

// =============================================================================
// REPORT TYPES
// =============================================================================

export const REPORT_TYPES: ReportType[] = [
  {
    id: 'weekly',
    name: 'Weekly Report',
    description: 'Summary of your progress over the past week',
    frequency: 'weekly',
    sections: REPORT_SECTIONS,
    isDefault: true,
    isPremium: false,
  },
  {
    id: 'monthly',
    name: 'Monthly Report',
    description: 'Comprehensive monthly progress analysis',
    frequency: 'monthly',
    sections: REPORT_SECTIONS,
    isDefault: false,
    isPremium: false,
  },
  {
    id: 'yearly',
    name: 'Yearly Wrapped',
    description: 'Annual review of your coding journey',
    frequency: 'yearly',
    sections: REPORT_SECTIONS,
    isDefault: false,
    isPremium: true,
  },
  {
    id: 'custom',
    name: 'Custom Report',
    description: 'Generate a report for any date range',
    frequency: 'custom',
    sections: REPORT_SECTIONS,
    isDefault: false,
    isPremium: true,
  },
];

// =============================================================================
// MAIN CONFIGURATION
// =============================================================================

export const reportConfig: ReportConfig = {
  enabled: true,
  types: REPORT_TYPES,
  generation: {
    maxConcurrent: 5,
    timeout: 60000, // 1 minute
    retryAttempts: 3,
    queueInterval: 5000, // 5 seconds
  },
  delivery: {
    emailEnabled: true,
    defaultSendTime: '09:00',
    retryOnFailure: true,
    maxRetries: 3,
  },
  storage: {
    retentionDays: 90,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    formats: ['pdf', 'html', 'json'],
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get report type by ID
 */
export function getReportTypeById(typeId: string): ReportType | undefined {
  return REPORT_TYPES.find((t) => t.id === typeId);
}

/**
 * Get default report type
 */
export function getDefaultReportType(): ReportType {
  return REPORT_TYPES.find((t) => t.isDefault) || REPORT_TYPES[0];
}

/**
 * Get available report types for user tier
 */
export function getAvailableReportTypes(isPremium: boolean): ReportType[] {
  if (isPremium) return REPORT_TYPES;
  return REPORT_TYPES.filter((t) => !t.isPremium);
}

/**
 * Get section by ID
 */
export function getSectionById(sectionId: string): ReportSection | undefined {
  return REPORT_SECTIONS.find((s) => s.id === sectionId);
}

/**
 * Get enabled sections
 */
export function getEnabledSections(): ReportSection[] {
  return REPORT_SECTIONS.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
}

/**
 * Calculate report period
 */
export function calculateReportPeriod(
  type: 'weekly' | 'monthly' | 'yearly',
  referenceDate: Date = new Date()
): { start: Date; end: Date } {
  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);
  
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  
  switch (type) {
    case 'weekly':
      start.setDate(start.getDate() - 7);
      break;
    case 'monthly':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'yearly':
      start.setFullYear(start.getFullYear() - 1);
      break;
  }
  
  return { start, end };
}

/**
 * Generate report filename
 */
export function generateReportFilename(
  userId: string,
  type: string,
  format: string,
  date: Date = new Date()
): string {
  const dateStr = date.toISOString().split('T')[0];
  return `report_${type}_${userId}_${dateStr}.${format}`;
}

/**
 * Format duration for report
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Calculate trend
 */
export function calculateTrend(
  current: number,
  previous: number
): { trend: 'up' | 'down' | 'stable'; changePercent: number } {
  if (previous === 0) {
    return { trend: current > 0 ? 'up' : 'stable', changePercent: 0 };
  }
  
  const changePercent = ((current - previous) / previous) * 100;
  
  if (Math.abs(changePercent) < 5) {
    return { trend: 'stable', changePercent };
  }
  
  return {
    trend: changePercent > 0 ? 'up' : 'down',
    changePercent: Math.round(changePercent * 10) / 10,
  };
}

/**
 * Generate insight from data
 */
export function generateInsight(
  type: 'positive' | 'negative' | 'neutral',
  category: string,
  template: string,
  data: Record<string, string | number>
): ReportInsight {
  let message = template;
  Object.entries(data).forEach(([key, value]) => {
    message = message.replace(`{${key}}`, String(value));
  });
  
  return { type, category, message };
}

export default reportConfig;