// ============================================================================
// FILE: lib/streak-utils.ts
// PURPOSE: Streak calculation utilities
// ============================================================================

import { format, differenceInDays, differenceInHours, subDays, addDays, isSameDay } from 'date-fns';
import { 
  STREAK_CONFIG,
  STREAK_MILESTONES,
  STREAK_MILESTONE_DAYS,
  STREAK_RISK_LEVELS,
  STREAK_REWARD_TIERS,
  getStreakEmoji as getEmoji,
  calculateDailyRewards,
  getStreakRiskLevel as getRiskLevel,
} from '@/config/streak';
import { getStartOfDay,  hoursUntilMidnight, convertToUserTimezone } from '@/lib/timezone';
import type { 

  StreakStatus, 
  StreakRiskLevel, 
 
  StreakCalendarDay,
  StreakMilestoneProgress,
} from '@/types/streak';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TrackerEntryForStreak {
  date: Date;
  problemsSolved?: number;
  commits?: number;
  timeSpent?: number;
  platform?: string;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date | null;
  streakStartDate: Date | null;
  totalActiveDays: number;
  activeDates: Date[];
  gaps: Array<{ start: Date; end: Date; length: number }>;
}

export interface StreakAnalysis {
  streak: number;
  isActive: boolean;
  isAtRisk: boolean;
  riskLevel: StreakRiskLevel;
  hoursRemaining: number;
  status: StreakStatus;
  nextMilestone: number | null;
  daysToMilestone: number;
  progress: number;
  rewards: {
    points: number;
    xp: number;
    multiplier: number;
  };
}

export interface DayActivity {
  date: Date;
  hasActivity: boolean;
  isToday: boolean;
  isInStreak: boolean;
  isFrozen: boolean;
}

// ============================================================================
// CORE STREAK CALCULATIONS
// ============================================================================

/**
 * Calculate current streak from array of activity dates
 * 
 * @param activities - Array of activity dates (sorted or unsorted)
 * @param timezone - User's timezone
 * @returns Current streak count
 * 
 * @example
 * ```ts
 * const dates = [new Date('2024-01-15'), new Date('2024-01-14'), new Date('2024-01-13')];
 * const streak = calculateStreak(dates, 'America/New_York');
 * // Returns: 3
 * ```
 */
export function calculateStreak(activities: Date[], timezone: string = 'UTC'): number {
  if (!activities || activities.length === 0) {
    return 0;
  }

  // Remove duplicates and sort descending
  const uniqueDates = getUniqueDates(activities, timezone);
  
  if (uniqueDates.length === 0) {
    return 0;
  }

  const today = getStartOfDay(new Date(), timezone);
  const yesterday = subDays(today, 1);

  // Check if most recent activity is today or yesterday
  const mostRecent = uniqueDates[0];
  
  if (!isSameDay(mostRecent, today) && !isSameDay(mostRecent, yesterday)) {
    return 0; // Streak is broken
  }

  // Count consecutive days
  let streak = 1;
  
  for (let i = 1; i < uniqueDates.length; i++) {
    const expectedDate = subDays(uniqueDates[i - 1], 1);
    
    if (isSameDay(uniqueDates[i], expectedDate)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate streak from tracker entries
 * 
 * @param entries - Array of tracker entries
 * @param timezone - User's timezone
 * @returns Complete streak data
 */
export function calculateStreakFromEntries(
  entries: TrackerEntryForStreak[],
  timezone: string = 'UTC'
): StreakData {
  if (!entries || entries.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      streakStartDate: null,
      totalActiveDays: 0,
      activeDates: [],
      gaps: [],
    };
  }

  // Filter entries with actual activity
  const activeEntries = entries.filter(entry => 
    (entry.problemsSolved && entry.problemsSolved > 0) ||
    (entry.commits && entry.commits > 0) ||
    (entry.timeSpent && entry.timeSpent > 0)
  );

  if (activeEntries.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      streakStartDate: null,
      totalActiveDays: 0,
      activeDates: [],
      gaps: [],
    };
  }

  // Get unique dates sorted descending
  const dates = activeEntries.map(e => e.date);
  const uniqueDates = getUniqueDates(dates, timezone);

  // Calculate current streak
  const currentStreak = calculateStreak(dates, timezone);

  // Calculate longest streak
  const longestStreak = calculateLongestStreak(uniqueDates);

  // Find gaps
  const gaps = findStreakGaps(uniqueDates);

  // Determine streak start date
  let streakStartDate: Date | null = null;
  if (currentStreak > 0) {
    streakStartDate = uniqueDates[currentStreak - 1];
  }

  return {
    currentStreak,
    longestStreak,
    lastActivityDate: uniqueDates[0] || null,
    streakStartDate,
    totalActiveDays: uniqueDates.length,
    activeDates: uniqueDates,
    gaps,
  };
}

/**
 * Calculate longest streak from sorted dates
 */
export function calculateLongestStreak(sortedDates: Date[]): number {
  if (sortedDates.length === 0) return 0;
  if (sortedDates.length === 1) return 1;

  let longest = 1;
  let current = 1;

  // Dates should be sorted descending
  for (let i = 1; i < sortedDates.length; i++) {
    const dayDiff = differenceInDays(sortedDates[i - 1], sortedDates[i]);
    
    if (dayDiff === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

// ============================================================================
// STREAK STATUS FUNCTIONS
// ============================================================================

/**
 * Check if streak is at risk
 * 
 * @param lastActivityDate - Last activity date
 * @param timezone - User's timezone
 * @returns True if streak is at risk
 */
export function isStreakAtRisk(
  lastActivityDate: Date | null,
  timezone: string = 'UTC'
): boolean {
  if (!lastActivityDate) {
    return false;
  }

  const today = getStartOfDay(new Date(), timezone);
  const hadActivityToday = isSameDay(
    convertToUserTimezone(lastActivityDate, timezone),
    convertToUserTimezone(new Date(), timezone)
  );

  if (hadActivityToday) {
    return false;
  }

  const hours = hoursUntilMidnight(timezone);
  return hours <= STREAK_CONFIG.AT_RISK_THRESHOLD_HOURS;
}

/**
 * Get streak risk level
 * 
 * @param lastActivityDate - Last activity date
 * @param timezone - User's timezone
 * @returns Risk level
 */
export function getStreakRiskLevel(
  lastActivityDate: Date | null,
  timezone: string = 'UTC'
): StreakRiskLevel {
  if (!lastActivityDate) {
    return 'none';
  }

  const today = getStartOfDay(new Date(), timezone);
  const activityDay = getStartOfDay(lastActivityDate, timezone);

  if (isSameDay(activityDay, today)) {
    return 'none';
  }

  const hours = hoursUntilMidnight(timezone);

  if (hours <= 1) return 'critical';
  if (hours <= 3) return 'high';
  if (hours <= 6) return 'medium';
  if (hours <= 12) return 'low';
  return 'none';
}

/**
 * Determine if streak should be broken
 * 
 * @param lastActivityDate - Last activity date
 * @param gracePeriodHours - Grace period in hours
 * @param timezone - User's timezone
 * @returns True if streak should be broken
 */
export function shouldBreakStreak(
  lastActivityDate: Date | null,
  gracePeriodHours: number = STREAK_CONFIG.GRACE_PERIOD_HOURS,
  timezone: string = 'UTC'
): boolean {
  if (!lastActivityDate) {
    return false; // No streak to break
  }

  const now = new Date();
  const todayStart = getStartOfDay(now, timezone);
  const yesterdayStart = subDays(todayStart, 1);
  
  // Convert last activity to user timezone for comparison
  const lastActivity = convertToUserTimezone(lastActivityDate, timezone);

  // If last activity was today, streak is not broken
  if (lastActivity >= todayStart) {
    return false;
  }

  // If last activity was yesterday, check grace period
  if (lastActivity >= yesterdayStart) {
    const hoursSinceMidnight = differenceInHours(now, todayStart);
    return hoursSinceMidnight > gracePeriodHours;
  }

  // Last activity was before yesterday, streak is broken
  return true;
}

/**
 * Get streak status
 * 
 * @param lastActivityDate - Last activity date
 * @param currentStreak - Current streak count
 * @param timezone - User's timezone
 * @returns Streak status
 */
export function getStreakStatus(
  lastActivityDate: Date | null,
  currentStreak: number,
  timezone: string = 'UTC'
): StreakStatus {
  if (currentStreak === 0) {
    return 'broken';
  }

  if (!lastActivityDate) {
    return 'broken';
  }

  const today = getStartOfDay(new Date(), timezone);
  const activityDay = getStartOfDay(lastActivityDate, timezone);

  if (isSameDay(activityDay, today)) {
    return 'active';
  }

  const yesterday = subDays(today, 1);
  if (isSameDay(activityDay, yesterday)) {
    const hours = hoursUntilMidnight(timezone);
    return hours <= STREAK_CONFIG.AT_RISK_THRESHOLD_HOURS ? 'at_risk' : 'active';
  }

  return 'broken';
}

// ============================================================================
// MILESTONE FUNCTIONS
// ============================================================================

/**
 * Get next milestone for current streak
 * 
 * @param currentStreak - Current streak count
 * @returns Next milestone or null if all achieved
 */
export function getNextMilestone(currentStreak: number): number | null {
  for (const milestone of STREAK_MILESTONE_DAYS) {
    if (milestone > currentStreak) {
      return milestone;
    }
  }
  return null;
}

/**
 * Get previous milestone
 * 
 * @param currentStreak - Current streak count
 * @returns Previous milestone or 0
 */
export function getPreviousMilestone(currentStreak: number): number {
  let previous = 0;
  for (const milestone of STREAK_MILESTONE_DAYS) {
    if (milestone > currentStreak) break;
    previous = milestone;
  }
  return previous;
}

/**
 * Get streak progress towards next milestone
 * 
 * @param currentStreak - Current streak count
 * @param nextMilestone - Next milestone to reach
 * @returns Progress percentage (0-100)
 */
export function getStreakProgress(currentStreak: number, nextMilestone: number | null): number {
  if (!nextMilestone || nextMilestone <= 0) {
    return 100;
  }

  if (currentStreak >= nextMilestone) {
    return 100;
  }

  const previousMilestone = getPreviousMilestone(currentStreak);
  const range = nextMilestone - previousMilestone;
  const progress = currentStreak - previousMilestone;

  return Math.round((progress / range) * 100);
}

/**
 * Get all reached milestones
 * 
 * @param currentStreak - Current streak count
 * @returns Array of reached milestone values
 */
export function getReachedMilestones(currentStreak: number): number[] {
  return STREAK_MILESTONE_DAYS.filter(m => m <= currentStreak);
}

/**
 * Get milestone progress with details
 * 
 * @param currentStreak - Current streak count
 * @returns Milestone progress details
 */
export function getMilestoneProgress(currentStreak: number): StreakMilestoneProgress[] {
  return STREAK_MILESTONE_DAYS.map(days => {
    const config = STREAK_MILESTONES[days];
    const reached = currentStreak >= days;
    const isCurrent = !reached && getNextMilestone(currentStreak) === days;

    return {
      milestone: {
        days,
        label: config.label,
        emoji: config.emoji,
        color: config.color,
        points: config.points,
        message: config.message,
      },
      reached,
      isCurrent,
      daysRemaining: reached ? 0 : days - currentStreak,
      progress: reached ? 100 : getStreakProgress(currentStreak, days),
    };
  });
}

// ============================================================================
// TIME FUNCTIONS
// ============================================================================

/**
 * Get streak reset time in user's timezone
 * 
 * @param timezone - User's timezone
 * @returns Date when streak resets (midnight)
 */
export function getStreakResetTime(timezone: string = 'UTC'): Date {
  const now = new Date();
  const tomorrow = addDays(now, 1);
  return getStartOfDay(tomorrow, timezone);
}

/**
 * Get hours until streak reset
 * 
 * @param timezone - User's timezone
 * @returns Hours until midnight
 */
export function getHoursUntilReset(timezone: string = 'UTC'): number {
  return hoursUntilMidnight(timezone);
}

/**
 * Get minutes until streak reset
 * 
 * @param timezone - User's timezone
 * @returns Minutes until midnight
 */
export function getMinutesUntilReset(timezone: string = 'UTC'): number {
  const hours = hoursUntilMidnight(timezone);
  return Math.floor(hours * 60);
}

/**
 * Format time remaining until reset
 * 
 * @param timezone - User's timezone
 * @returns Formatted time string
 */
export function formatTimeUntilReset(timezone: string = 'UTC'): string {
  const hours = hoursUntilMidnight(timezone);
  
  if (hours < 1) {
    const minutes = Math.floor(hours * 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.floor((hours - wholeHours) * 60);
  
  if (minutes === 0) {
    return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''}`;
  }
  
  return `${wholeHours}h ${minutes}m`;
}

// ============================================================================
// FORMATTING FUNCTIONS
// ============================================================================

/**
 * Format streak duration in human readable format
 * 
 * @param days - Number of days
 * @returns Formatted duration string
 * 
 * @example
 * ```ts
 * formatStreakDuration(1);   // '1 day'
 * formatStreakDuration(7);   // '1 week'
 * formatStreakDuration(30);  // '1 month'
 * formatStreakDuration(365); // '1 year'
 * formatStreakDuration(400); // '1 year, 1 month'
 * ```
 */
export function formatStreakDuration(days: number): string {
  if (days === 0) return 'No streak';
  if (days === 1) return '1 day';
  
  if (days < 7) {
    return `${days} days`;
  }
  
  if (days < 14) {
    return `1 week, ${days - 7} day${days - 7 !== 1 ? 's' : ''}`;
  }
  
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    if (remainingDays === 0) {
      return `${weeks} weeks`;
    }
    return `${weeks} week${weeks !== 1 ? 's' : ''}, ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
  }
  
  if (days < 365) {
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    if (remainingDays === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
    if (remainingDays >= 7) {
      const weeks = Math.floor(remainingDays / 7);
      return `${months} month${months !== 1 ? 's' : ''}, ${weeks} week${weeks !== 1 ? 's' : ''}`;
    }
    return `${months} month${months !== 1 ? 's' : ''}, ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
  }
  
  const years = Math.floor(days / 365);
  const remainingDays = days % 365;
  
  if (remainingDays === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`;
  }
  
  const months = Math.floor(remainingDays / 30);
  if (months > 0) {
    return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
  }
  
  return `${years} year${years !== 1 ? 's' : ''}, ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
}

/**
 * Get streak emoji based on length
 * 
 * @param days - Streak length in days
 * @returns Emoji representing streak
 */
export function getStreakEmoji(days: number): string {
  return getEmoji(days);
}

/**
 * Format streak for display
 * 
 * @param days - Streak length
 * @returns Formatted streak string with emoji
 */
export function formatStreak(days: number): string {
  const emoji = getStreakEmoji(days);
  
  if (days === 0) {
    return `${emoji} No streak`;
  }
  
  return `${emoji} ${days} day${days !== 1 ? 's' : ''}`;
}

/**
 * Get streak color based on length
 * 
 * @param days - Streak length
 * @returns Hex color code
 */
export function getStreakColor(days: number): string {
  if (days === 0) return '#6B7280';      // Gray
  if (days < 7) return '#10B981';         // Green
  if (days < 14) return '#F59E0B';        // Amber
  if (days < 30) return '#3B82F6';        // Blue
  if (days < 100) return '#8B5CF6';       // Purple
  if (days < 365) return '#EC4899';       // Pink
  return '#EF4444';                        // Red (legendary)
}

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Analyze streak with full details
 * 
 * @param currentStreak - Current streak count
 * @param lastActivityDate - Last activity date
 * @param timezone - User's timezone
 * @returns Full streak analysis
 */
export function analyzeStreak(
  currentStreak: number,
  lastActivityDate: Date | null,
  timezone: string = 'UTC'
): StreakAnalysis {
  const status = getStreakStatus(lastActivityDate, currentStreak, timezone);
  const riskLevel = getStreakRiskLevel(lastActivityDate, timezone);
  const hours = hoursUntilMidnight(timezone);
  const nextMilestone = getNextMilestone(currentStreak);
  const progress = getStreakProgress(currentStreak, nextMilestone);
  const rewards = calculateDailyRewards(currentStreak);

  return {
    streak: currentStreak,
    isActive: status === 'active',
    isAtRisk: status === 'at_risk',
    riskLevel,
    hoursRemaining: hours,
    status,
    nextMilestone,
    daysToMilestone: nextMilestone ? nextMilestone - currentStreak : 0,
    progress,
    rewards: {
      points: rewards.points,
      xp: rewards.xp,
      multiplier: rewards.multiplier,
    },
  };
}

/**
 * Check if activity was recorded today
 * 
 * @param lastActivityDate - Last activity date
 * @param timezone - User's timezone
 * @returns True if activity today
 */
export function hadActivityToday(
  lastActivityDate: Date | null,
  timezone: string = 'UTC'
): boolean {
  if (!lastActivityDate) {
    return false;
  }

  const today = getStartOfDay(new Date(), timezone);
  const activityDay = getStartOfDay(lastActivityDate, timezone);
  
  return isSameDay(activityDay, today);
}

/**
 * Check if user should receive streak reminder
 * 
 * @param lastActivityDate - Last activity date
 * @param timezone - User's timezone
 * @param currentStreak - Current streak (only remind if > 0)
 * @returns True if reminder should be sent
 */
export function shouldSendReminder(
  lastActivityDate: Date | null,
  timezone: string = 'UTC',
  currentStreak: number = 0
): boolean {
  if (currentStreak === 0) {
    return false;
  }

  if (!lastActivityDate) {
    return false;
  }

  const alreadyActive = hadActivityToday(lastActivityDate, timezone);
  if (alreadyActive) {
    return false;
  }

  const riskLevel = getStreakRiskLevel(lastActivityDate, timezone);
  return riskLevel !== 'none';
}

// ============================================================================
// CALENDAR FUNCTIONS
// ============================================================================

/**
 * Generate calendar data for streak visualization
 * 
 * @param activities - Array of activity dates
 * @param year - Year to generate calendar for
 * @param month - Month to generate calendar for (0-11)
 * @param timezone - User's timezone
 * @returns Array of day data
 */
export function generateStreakCalendar(
  activities: Date[],
  year: number,
  month: number,
  timezone: string = 'UTC'
): StreakCalendarDay[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const uniqueDates = getUniqueDates(activities, timezone);
  const today = getStartOfDay(new Date(), timezone);
  
  const calendar: StreakCalendarDay[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = format(date, 'yyyy-MM-dd');
    const hasActivity = uniqueDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    const isToday = isSameDay(date, today);

    calendar.push({
      date: dateStr,
      dayOfWeek: date.getDay(),
      hasActivity,
      isToday,
      isInStreak: hasActivity,
      isFrozen: false,
    });
  }

  return calendar;
}

/**
 * Get contribution stats for heatmap
 * 
 * @param activities - Array of activity dates with data
 * @param days - Number of days to include
 * @returns Activity level per day (0-4)
 */
export function getContributionLevels(
  activities: Array<{ date: Date; count: number }>,
  days: number = 365
): Map<string, number> {
  const levels = new Map<string, number>();
  const startDate = subDays(new Date(), days);

  // Calculate max for normalization
  const max = Math.max(...activities.map(a => a.count), 1);

  for (const activity of activities) {
    if (activity.date >= startDate) {
      const dateStr = format(activity.date, 'yyyy-MM-dd');
      const normalizedLevel = Math.min(4, Math.ceil((activity.count / max) * 4));
      levels.set(dateStr, normalizedLevel);
    }
  }

  return levels;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get unique dates from array, sorted descending
 */
function getUniqueDates(dates: Date[], timezone: string): Date[] {
  const dateMap = new Map<string, Date>();

  for (const date of dates) {
    const dayStart = getStartOfDay(date, timezone);
    const key = format(dayStart, 'yyyy-MM-dd');
    
    if (!dateMap.has(key)) {
      dateMap.set(key, dayStart);
    }
  }

  return Array.from(dateMap.values()).sort((a, b) => b.getTime() - a.getTime());
}

/**
 * Find gaps in streak
 */
function findStreakGaps(sortedDates: Date[]): Array<{ start: Date; end: Date; length: number }> {
  const gaps: Array<{ start: Date; end: Date; length: number }> = [];

  for (let i = 1; i < sortedDates.length; i++) {
    const dayDiff = differenceInDays(sortedDates[i - 1], sortedDates[i]);
    
    if (dayDiff > 1) {
      gaps.push({
        start: addDays(sortedDates[i], 1),
        end: subDays(sortedDates[i - 1], 1),
        length: dayDiff - 1,
      });
    }
  }

  return gaps;
}

/**
 * Calculate streak statistics
 * 
 * @param activities - Array of activity dates
 * @param timezone - User's timezone
 * @returns Streak statistics
 */
export function calculateStreakStats(
  activities: Date[],
  timezone: string = 'UTC'
): {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  averageGap: number;
  consistencyRate: number;
} {
  const data = calculateStreakFromEntries(
    activities.map(d => ({ date: d, problemsSolved: 1 })),
    timezone
  );

  const totalGapDays = data.gaps.reduce((sum, gap) => sum + gap.length, 0);
  const averageGap = data.gaps.length > 0 ? totalGapDays / data.gaps.length : 0;

  // Calculate consistency (active days / total possible days)
  let consistencyRate = 0;
  if (data.activeDates.length >= 2) {
    const firstDay = data.activeDates[data.activeDates.length - 1];
    const lastDay = data.activeDates[0];
    const totalDays = differenceInDays(lastDay, firstDay) + 1;
    consistencyRate = (data.totalActiveDays / totalDays) * 100;
  }

  return {
    currentStreak: data.currentStreak,
    longestStreak: data.longestStreak,
    totalActiveDays: data.totalActiveDays,
    averageGap: Math.round(averageGap * 10) / 10,
    consistencyRate: Math.round(consistencyRate * 10) / 10,
  };
}

/**
 * Get streak comparison with previous period
 * 
 * @param currentStreak - Current streak
 * @param previousStreak - Previous streak
 * @returns Comparison result
 */
export function compareStreaks(
  currentStreak: number,
  previousStreak: number
): {
  difference: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'same';
} {
  const difference = currentStreak - previousStreak;
  const percentageChange = previousStreak > 0 
    ? Math.round(((currentStreak - previousStreak) / previousStreak) * 100)
    : currentStreak > 0 ? 100 : 0;

  let trend: 'up' | 'down' | 'same' = 'same';
  if (difference > 0) trend = 'up';
  else if (difference < 0) trend = 'down';

  return {
    difference,
    percentageChange,
    trend,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

const streakUtils ={
  // Core calculations
  calculateStreak,
  calculateStreakFromEntries,
  calculateLongestStreak,

  // Status functions
  isStreakAtRisk,
  getStreakRiskLevel,
  shouldBreakStreak,
  getStreakStatus,
  hadActivityToday,
  shouldSendReminder,

  // Milestone functions
  getNextMilestone,
  getPreviousMilestone,
  getStreakProgress,
  getReachedMilestones,
  getMilestoneProgress,

  // Time functions
  getStreakResetTime,
  getHoursUntilReset,
  getMinutesUntilReset,
  formatTimeUntilReset,

  // Formatting functions
  formatStreakDuration,
  getStreakEmoji,
  formatStreak,
  getStreakColor,

  // Analysis functions
  analyzeStreak,
  calculateStreakStats,
  compareStreaks,

  // Calendar functions
  generateStreakCalendar,
  getContributionLevels,
};

export default streakUtils