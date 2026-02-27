// ============================================================================
// FILE: types/streak.ts
// PURPOSE: Streak-related type definitions
// ============================================================================


import type { TrackerEntry } from './tracker';

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Streak end reasons */
export type StreakEndReason = 'natural' | 'broken' | 'freeze_used';

/** Streak status */
export type StreakStatus = 'active' | 'at_risk' | 'broken' | 'frozen';

/** Streak risk level */
export type StreakRiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

/** Streak milestone thresholds */
export const STREAK_MILESTONES = [7, 14, 30, 50, 100, 150, 200, 365, 500, 1000] as const;
export type StreakMilestone = typeof STREAK_MILESTONES[number];

/** Hours before midnight for risk levels */
export const STREAK_RISK_HOURS = {
  low: 12,
  medium: 6,
  high: 3,
  critical: 1,
} as const;

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Current streak information */
export interface Streak {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date | null;
  streakStartDate: Date | null;
  streakFreezeCount: number;
  streakFreezeUsedAt: Date | null;
  status: StreakStatus;
  isAtRisk: boolean;
  riskLevel: StreakRiskLevel;
  hoursUntilMidnight: number;
  hadActivityToday: boolean;
  nextMilestone: StreakMilestone | null;
  daysUntilNextMilestone: number | null;
}

/** Streak history record (from Prisma) */
export interface StreakHistory {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  length: number;
  isActive: boolean;
  isCurrent: boolean;
  endReason?: string | null;
  totalProblems: number;
  totalCommits: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Streak statistics */
export interface StreakStats {
  current: number;
  longest: number;
  totalStreaks: number;
  avgLength: number;
  totalDaysInStreaks: number;
  streaks: StreakHistory[];
  currentYear: {
    longest: number;
    total: number;
    activeDays: number;
  };
  achievements: StreakAchievement[];
  milestones: StreakMilestoneProgress[];
}

/** Streak milestone definition */
export interface StreakMilestoneDefinition {
  days: number;
  label: string;
  emoji: string;
  color: string;
  points: number;
  message: string;
}

/** Streak milestone progress */
export interface StreakMilestoneProgress {
  milestone: StreakMilestoneDefinition;
  reached: boolean;
  reachedAt?: Date;
  isCurrent: boolean;
  daysRemaining?: number;
  progress: number;
}

/** Streak achievement */
export interface StreakAchievement {
  id: string;
  type: 'milestone' | 'comeback' | 'consistency' | 'freeze_master';
  title: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  streakLength?: number;
}

/** Streak freeze information */
export interface StreakFreeze {
  available: number;
  used: number;
  lastUsedAt: Date | null;
  canUseToday: boolean;
  nextFreezeAt?: Date;
  source: 'subscription' | 'purchase' | 'reward';
}

/** Streak calendar day */
export interface StreakCalendarDay {
  date: string; // YYYY-MM-DD format
  dayOfWeek: number;
  hasActivity: boolean;
  isToday: boolean;
  isInStreak: boolean;
  isFrozen: boolean;
  activityCount?: number;
  problems?: number;
  commits?: number;
  timeSpent?: number;
  entries?: TrackerEntry[];
}

/** Streak calendar data */
export interface StreakCalendar {
  year: number;
  month: number;
  days: StreakCalendarDay[];
  streakDays: number;
  activeDays: number;
  frozenDays: number;
  longestStreak: number;
}

/** Streak at risk status */
export interface StreakRisk {
  isAtRisk: boolean;
  level: StreakRiskLevel;
  hoursRemaining: number;
  minutesRemaining: number;
  deadline: Date;
  canUseFreeze: boolean;
  suggestedAction: string;
  notificationSent: boolean;
}

/** Streak update result */
export interface StreakUpdateResult {
  success: boolean;
  streakBroken: boolean;
  newStreak: number;
  milestoneReached?: number;
  message: string;
  previousStreak?: number;
  freezeUsed?: boolean;
}

/** Streak comparison */
export interface StreakComparison {
  user: {
    id: string;
    username?: string;
    name?: string;
    currentStreak: number;
    longestStreak: number;
  };
  rank: number;
  percentile: number;
  betterThan: number; // percentage
  comparison: 'ahead' | 'behind' | 'tied';
  difference: number;
}

/** Streak leaderboard entry */
export interface StreakLeaderboardEntry {
  rank: number;
  userId: string;
  username?: string;
  name?: string;
  image?: string;
  currentStreak: number;
  longestStreak: number;
  isCurrentUser?: boolean;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Create streak history input */
export interface CreateStreakHistoryInput {
  userId: string;
  startDate: Date;
  endDate: Date;
  length: number;
  endReason?: StreakEndReason;
  totalProblems?: number;
  totalCommits?: number;
}

/** Update streak input */
export interface UpdateStreakInput {
  currentStreak?: number;
  longestStreak?: number;
  lastActivityDate?: Date;
  streakStartDate?: Date;
  streakFreezeCount?: number;
  streakFreezeUsedAt?: Date;
}

/** Streak filter options */
export interface StreakFilters {
  userId?: string;
  minLength?: number;
  maxLength?: number;
  isActive?: boolean;
  isCurrent?: boolean;
  startDate?: Date;
  endDate?: Date;
  endReason?: StreakEndReason;
  sortBy?: 'length' | 'startDate' | 'endDate';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/** Use streak freeze input */
export interface UseStreakFreezeInput {
  userId: string;
  reason?: string;
}

/** Add streak freezes input */
export interface AddStreakFreezesInput {
  userId: string;
  count: number;
  source: 'subscription' | 'purchase' | 'reward';
  expiresAt?: Date;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/** Streak API response */
export interface StreakResponse {
  streak: Streak;
  history?: StreakHistory[];
  stats?: StreakStats;
  calendar?: StreakCalendar;
  risk?: StreakRisk;
  freeze?: StreakFreeze;
  leaderboard?: StreakLeaderboardEntry[];
  comparison?: StreakComparison;
}

/** Streak info response (from service) */
export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date | null;
  streakStartDate: Date | null;
  isAtRisk: boolean;
  hoursUntilMidnight: number;
  hadActivityToday: boolean;
}

/** Streak check result */
export interface StreakCheckResult {
  checked: number;
  atRisk: number;
  broken: number;
  notified: number;
  errors: number;
  timestamp: Date;
}

/** Batch streak update result */
export interface BatchStreakUpdateResult {
  success: boolean;
  updated: number;
  failed: number;
  errors: Array<{
    userId: string;
    error: string;
  }>;
}

// =============================================================================
// DISPLAY CONFIGURATIONS
// =============================================================================

/** Streak milestone configuration */
export const STREAK_MILESTONE_CONFIG: Record<StreakMilestone, StreakMilestoneDefinition> = {
  7: {
    days: 7,
    label: 'Week Warrior',
    emoji: '🔥',
    color: '#F59E0B',
    points: 50,
    message: 'One week streak! Keep the momentum going!',
  },
  14: {
    days: 14,
    label: 'Fortnight Fighter',
    emoji: '⚡',
    color: '#8B5CF6',
    points: 100,
    message: 'Two weeks strong! You\'re building a habit!',
  },
  30: {
    days: 30,
    label: 'Monthly Master',
    emoji: '🏆',
    color: '#10B981',
    points: 250,
    message: 'One month streak! You\'re unstoppable!',
  },
  50: {
    days: 50,
    label: 'Streak Specialist',
    emoji: '💎',
    color: '#3B82F6',
    points: 500,
    message: '50 days! You\'re in the elite club!',
  },
  100: {
    days: 100,
    label: 'Century Champion',
    emoji: '💯',
    color: '#EF4444',
    points: 1000,
    message: '100 days! Legendary dedication!',
  },
  150: {
    days: 150,
    label: 'Streak Superhero',
    emoji: '🦸',
    color: '#EC4899',
    points: 1500,
    message: '150 days! You\'re a coding superhero!',
  },
  200: {
    days: 200,
    label: 'Bicentennial Boss',
    emoji: '👑',
    color: '#F59E0B',
    points: 2000,
    message: '200 days! Bow to the streak royalty!',
  },
  365: {
    days: 365,
    label: 'Year-long Yoda',
    emoji: '🌟',
    color: '#10B981',
    points: 5000,
    message: 'One full year! You\'ve mastered consistency!',
  },
  500: {
    days: 500,
    label: 'Streak Sage',
    emoji: '🧙',
    color: '#6366F1',
    points: 7500,
    message: '500 days! You\'re a coding sage!',
  },
  1000: {
    days: 1000,
    label: 'Millennium Master',
    emoji: '🚀',
    color: '#8B5CF6',
    points: 10000,
    message: '1000 days! You\'ve achieved the impossible!',
  },
};

/** Streak risk level configuration */
export const STREAK_RISK_CONFIG: Record<StreakRiskLevel, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  message: string;
}> = {
  none: {
    label: 'Safe',
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: 'CheckCircle',
    message: 'Your streak is safe for today!',
  },
  low: {
    label: 'Low Risk',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: 'Info',
    message: 'Plenty of time left to maintain your streak',
  },
  medium: {
    label: 'Medium Risk',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'AlertCircle',
    message: 'Don\'t forget to log your activity today',
  },
  high: {
    label: 'High Risk',
    color: '#F97316',
    bgColor: '#FED7AA',
    icon: 'AlertTriangle',
    message: 'Your streak is at risk! Log activity soon',
  },
  critical: {
    label: 'Critical',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: 'AlertOctagon',
    message: 'Act now or lose your streak!',
  },
};

/** Streak status configuration */
export const STREAK_STATUS_CONFIG: Record<StreakStatus, {
  label: string;
  color: string;
  icon: string;
}> = {
  active: { label: 'Active', color: '#10B981', icon: 'Flame' },
  at_risk: { label: 'At Risk', color: '#F59E0B', icon: 'AlertTriangle' },
  broken: { label: 'Broken', color: '#EF4444', icon: 'XCircle' },
  frozen: { label: 'Frozen', color: '#3B82F6', icon: 'Snowflake' },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Calculate streak risk level */
export function calculateStreakRiskLevel(hoursRemaining: number): StreakRiskLevel {
  if (hoursRemaining <= STREAK_RISK_HOURS.critical) return 'critical';
  if (hoursRemaining <= STREAK_RISK_HOURS.high) return 'high';
  if (hoursRemaining <= STREAK_RISK_HOURS.medium) return 'medium';
  if (hoursRemaining <= STREAK_RISK_HOURS.low) return 'low';
  return 'none';
}

/** Get next milestone */
export function getNextMilestone(currentStreak: number): StreakMilestone | null {
  for (const milestone of STREAK_MILESTONES) {
    if (currentStreak < milestone) {
      return milestone;
    }
  }
  return null;
}

/** Get reached milestones */
export function getReachedMilestones(streak: number): StreakMilestone[] {
  return STREAK_MILESTONES.filter(m => m <= streak);
}

/** Calculate days until milestone */
export function getDaysUntilMilestone(currentStreak: number, milestone: StreakMilestone): number {
  return Math.max(0, milestone - currentStreak);
}

/** Format streak duration */
export function formatStreakDuration(days: number): string {
  if (days === 0) return 'No streak';
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    if (remainingDays === 0) return `${weeks} week${weeks > 1 ? 's' : ''}`;
    return `${weeks} week${weeks > 1 ? 's' : ''}, ${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    if (remainingDays === 0) return `${months} month${months > 1 ? 's' : ''}`;
    return `${months} month${months > 1 ? 's' : ''}, ${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
  }
  const years = Math.floor(days / 365);
  const remainingDays = days % 365;
  if (remainingDays === 0) return `${years} year${years > 1 ? 's' : ''}`;
  const remainingMonths = Math.floor(remainingDays / 30);
  if (remainingMonths === 0) {
    return `${years} year${years > 1 ? 's' : ''}, ${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
  }
  return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
}

/** Get streak emoji based on length */
export function getStreakEmoji(days: number): string {
  if (days === 0) return '❄️';
  if (days < 7) return '🔥';
  if (days < 14) return '⚡';
  if (days < 30) return '🚀';
  if (days < 50) return '💎';
  if (days < 100) return '🏆';
  if (days < 200) return '👑';
  if (days < 365) return '🌟';
  if (days < 500) return '🧙';
  return '🚀';
}

/** Calculate streak completion percentage to next milestone */
export function calculateMilestoneProgress(currentStreak: number, milestone: StreakMilestone): number {
  if (currentStreak >= milestone) return 100;
  
  // Find previous milestone
  let previousMilestone = 0;
  for (const m of STREAK_MILESTONES) {
    if (m >= milestone) break;
    if (m < currentStreak) previousMilestone = m;
  }
  
  const range = milestone - previousMilestone;
  const progress = currentStreak - previousMilestone;
  return Math.round((progress / range) * 100);
}

/** Check if streak is at risk */
export function isStreakAtRisk(
  lastActivityDate: Date | null,
  timezone: string = 'UTC'
): { atRisk: boolean; hoursRemaining: number } {
  if (!lastActivityDate) return { atRisk: false, hoursRemaining: 24 };
  
  const now = new Date();
  const todayStart = getStartOfDay(now, timezone);
  const hadActivityToday = lastActivityDate >= todayStart;
  
  if (hadActivityToday) {
    return { atRisk: false, hoursRemaining: 24 };
  }
  
  const hoursRemaining = calculateHoursUntilMidnight(timezone);
  const atRisk = hoursRemaining <= STREAK_RISK_HOURS.medium;
  
  return { atRisk, hoursRemaining };
}

/** Get start of day in timezone */
export function getStartOfDay(date: Date, timezone: string): Date {
  try {
    const dateStr = date.toLocaleDateString('en-CA', { timeZone: timezone });
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  } catch {
    // Fallback to UTC
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
}

/** Calculate hours until midnight in timezone */
export function calculateHoursUntilMidnight(timezone: string): number {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0');

    return Math.max(0, 23 - hour + (60 - minute) / 60);
  } catch {
    // Fallback
    return 6;
  }
}

/** Check if date is today */
export function isToday(date: Date, timezone: string = 'UTC'): boolean {
  const now = new Date();
  const todayStart = getStartOfDay(now, timezone);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  return date >= todayStart && date < todayEnd;
}

/** Validate streak freeze usage */
export function canUseStreakFreeze(freeze: StreakFreeze, timezone: string = 'UTC'): boolean {
  if (freeze.available <= 0) return false;
  if (!freeze.lastUsedAt) return true;
  
  const todayStart = getStartOfDay(new Date(), timezone);
  return freeze.lastUsedAt < todayStart;
}

export default Streak;