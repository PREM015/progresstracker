// src/types/daily-stats.ts
// Daily activity statistics types

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Daily stats record (matches Prisma DailyStats model) */
export interface DailyStats {
  id: string;
  userId: string;
  date: Date;
  totalProblems: number;
  totalMinutes: number;
  totalXp: number;
  platformCount: number;
  goalsMet: number;
  goalsTotal: number;
  streakDay: number;
  isRestDay: boolean;
  notes?: string | null;
  mood?: number | null; // 1-5 rating
  createdAt: Date;
  updatedAt: Date;
}

/** Daily stats with platform breakdown */
export interface DailyStatsWithPlatforms extends DailyStats {
  platformStats: PlatformDailyStatsSummary[];
}

/** Lightweight summary for calendar heatmap */
export interface DailyStatsSummary {
  date: string; // YYYY-MM-DD
  totalProblems: number;
  totalMinutes: number;
  isRestDay: boolean;
  streakDay: number;
  intensity: 0 | 1 | 2 | 3 | 4; // For heatmap coloring
}

/** Reference to platform stats within daily stats */
export interface PlatformDailyStatsSummary {
  platformId: string;
  platformName: string;
  problems: number;
  minutes: number;
  xp: number;
}

// =============================================================================
// AGGREGATE TYPES
// =============================================================================

/** Weekly summary */
export interface WeeklyStatsSummary {
  weekStart: Date;
  weekEnd: Date;
  totalProblems: number;
  totalMinutes: number;
  totalXp: number;
  activeDays: number;
  avgProblemsPerDay: number;
  bestDay?: DailyStats;
}

/** Monthly summary */
export interface MonthlyStatsSummary {
  year: number;
  month: number;
  totalProblems: number;
  totalMinutes: number;
  totalXp: number;
  activeDays: number;
  longestStreak: number;
  currentStreak: number;
  goalCompletionRate: number;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface UpdateDailyStatsInput {
  date?: Date;
  notes?: string;
  mood?: number;
  isRestDay?: boolean;
}

// =============================================================================
// QUERY TYPES
// =============================================================================

export interface DailyStatsQuery {
  startDate: Date;
  endDate: Date;
  userId?: string;
  includePlatforms?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getDailyStatsIntensity(problems: number): 0 | 1 | 2 | 3 | 4 {
  if (problems === 0) return 0;
  if (problems < 3) return 1;
  if (problems < 6) return 2;
  if (problems < 10) return 3;
  return 4;
}

export function formatDate(date: Date): string {
  return new Date(date).toISOString().split('T')[0];
}

export default DailyStats;
