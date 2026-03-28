// src/types/streak-history.ts
// Streak history tracking types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type StreakType = 'daily' | 'weekly';
export type StreakEndReason = 'missed_day' | 'reset' | 'manual' | 'system';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Streak history record (matches Prisma StreakHistory model) */
export interface StreakHistory {
  id: string;
  userId: string;
  streakType: StreakType;
  startDate: Date;
  endDate?: Date | null;
  length: number;
  maxLength: number;
  isActive: boolean;
  endReason?: StreakEndReason | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Streak milestone */
export interface StreakMilestone {
  streakHistoryId: string;
  day: number;
  achievedAt: Date;
  label: string;
  reward?: string | null;
}

/** Streak calendar data */
export interface StreakCalendarDay {
  date: string; // YYYY-MM-DD
  isActive: boolean;
  isRestDay: boolean;
  streakDay?: number;
  problems?: number;
}

// =============================================================================
// AGGREGATE TYPES
// =============================================================================

/** User streak statistics */
export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  streakStartDate?: Date | null;
  lastActiveDate?: Date | null;
  streakHistory: StreakHistorySummary[];
  calendarData: StreakCalendarDay[];
}

/** Streak history summary for list display */
export interface StreakHistorySummary {
  id: string;
  startDate: Date;
  endDate?: Date | null;
  length: number;
  isActive: boolean;
  endReason?: StreakEndReason | null;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface UpdateStreakInput {
  date: Date;
  hasActivity: boolean;
  isRestDay?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getStreakLevel(days: number): string {
  if (days >= 365) return 'Legendary';
  if (days >= 100) return 'Elite';
  if (days >= 30) return 'Pro';
  if (days >= 7) return 'Committed';
  if (days >= 3) return 'Getting Started';
  return 'Beginner';
}

export function getStreakEmoji(days: number): string {
  if (days >= 100) return '🔥🔥🔥';
  if (days >= 30) return '🔥🔥';
  if (days >= 7) return '🔥';
  if (days >= 3) return '✨';
  return '⭐';
}

export function formatStreakDuration(days: number): string {
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.floor(days / 7)}w ${days % 7}d`;
  const months = Math.floor(days / 30);
  const remaining = days % 30;
  return remaining > 0 ? `${months}mo ${remaining}d` : `${months} months`;
}

export default StreakHistory;
