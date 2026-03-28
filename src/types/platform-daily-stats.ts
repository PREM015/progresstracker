// src/types/platform-daily-stats.ts
// Per-platform daily statistics types

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Platform daily stats record (matches Prisma PlatformDailyStats model) */
export interface PlatformDailyStats {
  id: string;
  userId: string;
  platformId: string;
  date: Date;
  problemsSolved: number;
  minutesSpent: number;
  xpEarned: number;
  difficulty?: PlatformDailyStatsDifficulty | null;
  topics?: string[] | null;
  rawData?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Platform daily stats with platform info */
export interface PlatformDailyStatsWithPlatform extends PlatformDailyStats {
  platform: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    color?: string | null;
  };
}

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export interface PlatformDailyStatsDifficulty {
  easy?: number;
  medium?: number;
  hard?: number;
  expert?: number;
}

// =============================================================================
// AGGREGATE TYPES
// =============================================================================

/** Platform progress over time */
export interface PlatformProgressSeries {
  platformId: string;
  platformName: string;
  data: Array<{
    date: string; // YYYY-MM-DD
    problems: number;
    minutes: number;
  }>;
  total: {
    problems: number;
    minutes: number;
    xp: number;
  };
}

/** Platform comparison for a period */
export interface PlatformPeriodComparison {
  platformId: string;
  platformName: string;
  current: { problems: number; minutes: number; xp: number };
  previous: { problems: number; minutes: number; xp: number };
  changePercent: { problems: number; minutes: number; xp: number };
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreatePlatformDailyStatsInput {
  platformId: string;
  date: Date;
  problemsSolved: number;
  minutesSpent?: number;
  xpEarned?: number;
  difficulty?: PlatformDailyStatsDifficulty;
  topics?: string[];
}

export interface UpdatePlatformDailyStatsInput extends Partial<CreatePlatformDailyStatsInput> {}

// =============================================================================
// QUERY TYPES
// =============================================================================

export interface PlatformDailyStatsQuery {
  userId?: string;
  platformId?: string;
  startDate: Date;
  endDate: Date;
}

export default PlatformDailyStats;
