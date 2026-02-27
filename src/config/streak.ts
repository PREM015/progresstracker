// ============================================================================
// FILE: config/streak.ts
// PURPOSE: Streak rules and configuration
// ============================================================================

import type { SubscriptionTier } from '@prisma/client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface StreakMilestoneConfig {
  days: number;
  label: string;
  emoji: string;
  color: string;
  points: number;
  xpReward: number;
  message: string;
  achievementId?: string;
  notificationEnabled: boolean;
}

export interface StreakFreezeConfig {
  tier: SubscriptionTier;
  monthly: number;
  cooldownDays: number;
  maxAccumulated: number;
  canPurchase: boolean;
  purchasePrice?: number;
}

export interface ActivityRequirement {
  type: 'problems' | 'commits' | 'time' | 'any';
  minCount?: number;
  minTime?: number; // in minutes
  platforms?: string[];
  description: string;
}

export interface StreakRiskConfig {
  level: 'low' | 'medium' | 'high' | 'critical';
  hoursBeforeMidnight: number;
  color: string;
  bgColor: string;
  icon: string;
  message: string;
  notificationEnabled: boolean;
  emailEnabled: boolean;
}

export interface StreakRewardTier {
  minDays: number;
  maxDays: number;
  dailyPoints: number;
  dailyXP: number;
  multiplier: number;
}

// ============================================================================
// CORE CONFIGURATION
// ============================================================================

/**
 * Core streak settings
 */
export const STREAK_CONFIG = {
  // Time settings (all in UTC unless user timezone is set)
  RESET_HOUR: 0, // Midnight UTC (can be overridden by user timezone)
  GRACE_PERIOD_HOURS: 4, // Grace period after midnight before streak breaks
  
  // Activity window
  ACTIVITY_WINDOW_HOURS: 24, // Hours within which activity counts
  MIN_ACTIVITY_GAP_HOURS: 4, // Minimum hours between activities to count separately
  
  // Notification timings (hours before midnight)
  AT_RISK_THRESHOLD_HOURS: 6, // When to send "at risk" notification
  FINAL_WARNING_HOURS: 2, // Final warning notification
  
  // Calculation settings
  INCLUDE_WEEKENDS: true, // Whether weekends count for streaks
  ALLOW_BACKFILL: false, // Whether past dates can be filled
  MAX_BACKFILL_DAYS: 1, // Maximum days that can be backfilled
  
  // Display settings
  SHOW_FUTURE_MILESTONES: 3, // Number of upcoming milestones to show
  LEADERBOARD_SIZE: 100, // Default leaderboard size
  
  // Cache settings
  CACHE_TTL_SECONDS: 300, // 5 minutes cache for streak data
} as const;

// ============================================================================
// STREAK MILESTONES
// ============================================================================

/**
 * Streak milestone definitions with rewards
 */
export const STREAK_MILESTONES: Record<number, StreakMilestoneConfig> = {
  3: {
    days: 3,
    label: 'Starter',
    emoji: '✨',
    color: '#10B981',
    points: 25,
    xpReward: 100,
    message: 'Great start! Keep the momentum going!',
    achievementId: '3-day-streak',
    notificationEnabled: true,
  },
  7: {
    days: 7,
    label: 'Week Warrior',
    emoji: '🔥',
    color: '#F59E0B',
    points: 50,
    xpReward: 200,
    message: 'One week streak! You\'re building a habit!',
    achievementId: '7-day-streak',
    notificationEnabled: true,
  },
  14: {
    days: 14,
    label: 'Fortnight Fighter',
    emoji: '⚡',
    color: '#8B5CF6',
    points: 100,
    xpReward: 400,
    message: 'Two weeks strong! Consistency is key!',
    achievementId: '14-day-streak',
    notificationEnabled: true,
  },
  21: {
    days: 21,
    label: 'Habit Former',
    emoji: '💪',
    color: '#EC4899',
    points: 150,
    xpReward: 600,
    message: '21 days - You\'ve formed a habit!',
    notificationEnabled: true,
  },
  30: {
    days: 30,
    label: 'Monthly Master',
    emoji: '🏆',
    color: '#10B981',
    points: 250,
    xpReward: 1000,
    message: 'One month streak! You\'re unstoppable!',
    achievementId: '30-day-streak',
    notificationEnabled: true,
  },
  50: {
    days: 50,
    label: 'Streak Specialist',
    emoji: '💎',
    color: '#3B82F6',
    points: 500,
    xpReward: 2000,
    message: '50 days! You\'re in the elite club!',
    notificationEnabled: true,
  },
  60: {
    days: 60,
    label: 'Dedication Master',
    emoji: '🌟',
    color: '#6366F1',
    points: 600,
    xpReward: 2500,
    message: '60 days of pure dedication!',
    achievementId: '60-day-streak',
    notificationEnabled: true,
  },
  75: {
    days: 75,
    label: 'Persistence Pro',
    emoji: '🚀',
    color: '#A855F7',
    points: 750,
    xpReward: 3000,
    message: '75 days! Your persistence is inspiring!',
    notificationEnabled: true,
  },
  90: {
    days: 90,
    label: 'Quarter Champion',
    emoji: '🎯',
    color: '#F97316',
    points: 900,
    xpReward: 3500,
    message: '90 days! A full quarter of consistency!',
    notificationEnabled: true,
  },
  100: {
    days: 100,
    label: 'Century Champion',
    emoji: '💯',
    color: '#EF4444',
    points: 1000,
    xpReward: 5000,
    message: '100 days! Welcome to the Century Club!',
    achievementId: '100-day-streak',
    notificationEnabled: true,
  },
  150: {
    days: 150,
    label: 'Streak Superhero',
    emoji: '🦸',
    color: '#DC2626',
    points: 1500,
    xpReward: 7500,
    message: '150 days! You\'re a coding superhero!',
    notificationEnabled: true,
  },
  200: {
    days: 200,
    label: 'Bicentennial Boss',
    emoji: '👑',
    color: '#7C2D12',
    points: 2000,
    xpReward: 10000,
    message: '200 days! Bow to the streak royalty!',
    notificationEnabled: true,
  },
  250: {
    days: 250,
    label: 'Elite Achiever',
    emoji: '🏅',
    color: '#0891B2',
    points: 2500,
    xpReward: 12500,
    message: '250 days! You\'re among the elite!',
    notificationEnabled: true,
  },
  300: {
    days: 300,
    label: 'Legendary',
    emoji: '🌈',
    color: '#9333EA',
    points: 3000,
    xpReward: 15000,
    message: '300 days! Simply legendary!',
    notificationEnabled: true,
  },
  365: {
    days: 365,
    label: 'Year-long Yoda',
    emoji: '🎊',
    color: '#059669',
    points: 5000,
    xpReward: 25000,
    message: 'One full year! You\'ve mastered consistency!',
    achievementId: '365-day-streak',
    notificationEnabled: true,
  },
  400: {
    days: 400,
    label: 'Unstoppable Force',
    emoji: '☄️',
    color: '#1E40AF',
    points: 4000,
    xpReward: 20000,
    message: '400 days! Nothing can stop you!',
    notificationEnabled: true,
  },
  500: {
    days: 500,
    label: 'Streak Sage',
    emoji: '🧙',
    color: '#7C3AED',
    points: 7500,
    xpReward: 30000,
    message: '500 days! You\'re a coding sage!',
    notificationEnabled: true,
  },
  730: {
    days: 730,
    label: 'Two Year Titan',
    emoji: '⭐',
    color: '#DB2777',
    points: 10000,
    xpReward: 40000,
    message: 'Two years! You\'re a titan of consistency!',
    notificationEnabled: true,
  },
  1000: {
    days: 1000,
    label: 'Millennium Master',
    emoji: '🌌',
    color: '#581C87',
    points: 15000,
    xpReward: 50000,
    message: '1000 days! You\'ve achieved the impossible!',
    notificationEnabled: true,
  },
};

/**
 * Get sorted milestone array
 */
export const STREAK_MILESTONE_DAYS = Object.keys(STREAK_MILESTONES)
  .map(Number)
  .sort((a, b) => a - b);

// ============================================================================
// FREEZE LIMITS BY TIER
// ============================================================================

/**
 * Streak freeze configuration by subscription tier
 */
export const FREEZE_LIMITS: Record<SubscriptionTier, StreakFreezeConfig> = {
  FREE: {
    tier: 'FREE',
    monthly: 0,
    cooldownDays: 0,
    maxAccumulated: 0,
    canPurchase: false,
  },
  STARTER: {
    tier: 'STARTER',
    monthly: 1,
    cooldownDays: 7,
    maxAccumulated: 2,
    canPurchase: true,
    purchasePrice: 2.99,
  },
  PRO: {
    tier: 'PRO',
    monthly: 3,
    cooldownDays: 3,
    maxAccumulated: 6,
    canPurchase: true,
    purchasePrice: 1.99,
  },
  TEAM: {
    tier: 'TEAM',
    monthly: 5,
    cooldownDays: 1,
    maxAccumulated: 10,
    canPurchase: true,
    purchasePrice: 0.99,
  },
  ENTERPRISE: {
    tier: 'ENTERPRISE',
    monthly: -1, // Unlimited
    cooldownDays: 0,
    maxAccumulated: -1, // Unlimited
    canPurchase: false,
  },
};

// ============================================================================
// ACTIVITY REQUIREMENTS
// ============================================================================

/**
 * What counts as valid activity for maintaining a streak
 */
export const ACTIVITY_REQUIREMENTS: ActivityRequirement[] = [
  {
    type: 'problems',
    minCount: 1,
    description: 'Solve at least 1 coding problem',
  },
  {
    type: 'commits',
    minCount: 1,
    description: 'Make at least 1 commit',
  },
  {
    type: 'time',
    minTime: 30,
    description: 'Log at least 30 minutes of coding',
  },
  {
    type: 'any',
    description: 'Any tracked activity on any platform',
  },
];

/**
 * Default activity requirement
 */
export const DEFAULT_ACTIVITY_REQUIREMENT = ACTIVITY_REQUIREMENTS[3]; // Any activity

/**
 * Platform-specific activity weights
 */
export const PLATFORM_ACTIVITY_WEIGHTS: Record<string, number> = {
  leetcode: 1.5,      // Problem solving weighted higher
  codeforces: 1.5,
  codechef: 1.5,
  hackerrank: 1.3,
  github: 1.0,        // Standard weight for commits
  gitlab: 1.0,
  bitbucket: 1.0,
  coursera: 0.8,      // Learning platforms slightly lower
  udemy: 0.8,
  freecodecamp: 1.0,
  linkedin: 0.5,      // Job applications lowest weight
  indeed: 0.5,
};

// ============================================================================
// STREAK RISK LEVELS
// ============================================================================

/**
 * Risk level configuration for streak warnings
 */
export const STREAK_RISK_LEVELS: StreakRiskConfig[] = [
  {
    level: 'low',
    hoursBeforeMidnight: 12,
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: 'Info',
    message: 'Plenty of time left to maintain your streak',
    notificationEnabled: false,
    emailEnabled: false,
  },
  {
    level: 'medium',
    hoursBeforeMidnight: 6,
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'AlertCircle',
    message: 'Don\'t forget to log your activity today',
    notificationEnabled: true,
    emailEnabled: false,
  },
  {
    level: 'high',
    hoursBeforeMidnight: 3,
    color: '#F97316',
    bgColor: '#FED7AA',
    icon: 'AlertTriangle',
    message: 'Your streak is at risk! Log activity soon',
    notificationEnabled: true,
    emailEnabled: true,
  },
  {
    level: 'critical',
    hoursBeforeMidnight: 1,
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: 'AlertOctagon',
    message: 'URGENT: Less than 1 hour to save your streak!',
    notificationEnabled: true,
    emailEnabled: true,
  },
];

// ============================================================================
// ACHIEVEMENT MAPPINGS
// ============================================================================

/**
 * Streak-related achievement IDs
 */
export const STREAK_ACHIEVEMENTS = {
  FIRST_ACTIVITY: 'first-activity',
  THREE_DAY: '3-day-streak',
  WEEK: '7-day-streak',
  TWO_WEEKS: '14-day-streak',
  MONTH: '30-day-streak',
  TWO_MONTHS: '60-day-streak',
  HUNDRED_DAYS: '100-day-streak',
  YEAR: '365-day-streak',
  COMEBACK: 'comeback-kid',
  PERFECT_WEEK: 'perfect-week',
  PERFECT_MONTH: 'perfect-month',
  WEEKEND_WARRIOR: 'weekend-warrior',
  EARLY_BIRD: 'early-bird',
  NIGHT_OWL: 'night-owl',
} as const;

// ============================================================================
// REWARD TIERS
// ============================================================================

/**
 * Points and XP rewards based on streak length
 */
export const STREAK_REWARD_TIERS: StreakRewardTier[] = [
  {
    minDays: 0,
    maxDays: 6,
    dailyPoints: 10,
    dailyXP: 25,
    multiplier: 1.0,
  },
  {
    minDays: 7,
    maxDays: 13,
    dailyPoints: 15,
    dailyXP: 35,
    multiplier: 1.2,
  },
  {
    minDays: 14,
    maxDays: 29,
    dailyPoints: 20,
    dailyXP: 50,
    multiplier: 1.5,
  },
  {
    minDays: 30,
    maxDays: 59,
    dailyPoints: 30,
    dailyXP: 75,
    multiplier: 2.0,
  },
  {
    minDays: 60,
    maxDays: 99,
    dailyPoints: 40,
    dailyXP: 100,
    multiplier: 2.5,
  },
  {
    minDays: 100,
    maxDays: 364,
    dailyPoints: 50,
    dailyXP: 150,
    multiplier: 3.0,
  },
  {
    minDays: 365,
    maxDays: 999,
    dailyPoints: 75,
    dailyXP: 200,
    multiplier: 4.0,
  },
  {
    minDays: 1000,
    maxDays: Infinity,
    dailyPoints: 100,
    dailyXP: 300,
    multiplier: 5.0,
  },
];

// ============================================================================
// SPECIAL DATES
// ============================================================================

/**
 * Special dates that affect streaks
 */
export const SPECIAL_DATES = {
  // Global holidays where streaks are auto-protected
  PROTECTED_HOLIDAYS: [
    '01-01', // New Year's Day
    '12-25', // Christmas
    '12-31', // New Year's Eve
  ],
  
  // Double point days
  DOUBLE_POINT_DAYS: [
    '01-01', // New Year's Day
    '02-14', // Valentine's Day
    '03-14', // Pi Day
    '04-01', // April Fools
    '05-04', // Star Wars Day
    '10-31', // Halloween
    '11-11', // Singles Day
    '12-25', // Christmas
  ],
  
  // Community celebration days
  CELEBRATION_DAYS: [
    '01-01', // New Year
    '03-08', // International Women's Day
    '05-01', // International Workers' Day
    '09-05', // Teacher's Day
    '10-01', // International Coffee Day
    '10-10', // World Mental Health Day
    '11-17', // International Students' Day
  ],
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get freeze limit for tier
 */
export function getFreezeLimit(tier: SubscriptionTier): StreakFreezeConfig {
  return FREEZE_LIMITS[tier];
}

/**
 * Get milestone config
 */
export function getMilestoneConfig(days: number): StreakMilestoneConfig | undefined {
  return STREAK_MILESTONES[days];
}

/**
 * Get next milestone
 */
export function getNextMilestone(currentStreak: number): number | null {
  for (const days of STREAK_MILESTONE_DAYS) {
    if (days > currentStreak) {
      return days;
    }
  }
  return null;
}

/**
 * Get previous milestone
 */
export function getPreviousMilestone(currentStreak: number): number {
  let previous = 0;
  for (const days of STREAK_MILESTONE_DAYS) {
    if (days > currentStreak) break;
    previous = days;
  }
  return previous;
}

/**
 * Get all reached milestones
 */
export function getReachedMilestones(currentStreak: number): number[] {
  return STREAK_MILESTONE_DAYS.filter(days => days <= currentStreak);
}

/**
 * Calculate milestone progress
 */
export function calculateMilestoneProgress(currentStreak: number): {
  current: number;
  next: number | null;
  previous: number;
  progress: number;
  daysRemaining: number;
} {
  const next = getNextMilestone(currentStreak);
  const previous = getPreviousMilestone(currentStreak);
  
  if (!next) {
    return {
      current: currentStreak,
      next: null,
      previous,
      progress: 100,
      daysRemaining: 0,
    };
  }
  
  const range = next - previous;
  const progress = currentStreak - previous;
  const percentage = Math.round((progress / range) * 100);
  
  return {
    current: currentStreak,
    next,
    previous,
    progress: percentage,
    daysRemaining: next - currentStreak,
  };
}

/**
 * Get risk level based on hours remaining
 */
export function getStreakRiskLevel(hoursRemaining: number): StreakRiskConfig | null {
  // Sort by hours in descending order
  const sorted = [...STREAK_RISK_LEVELS].sort((a, b) => 
    b.hoursBeforeMidnight - a.hoursBeforeMidnight
  );
  
  for (const level of sorted) {
    if (hoursRemaining <= level.hoursBeforeMidnight) {
      return level;
    }
  }
  
  return null;
}

/**
 * Calculate daily rewards
 */
export function calculateDailyRewards(streakDays: number): {
  points: number;
  xp: number;
  multiplier: number;
  tier: StreakRewardTier;
} {
  const tier = STREAK_REWARD_TIERS.find(
    t => streakDays >= t.minDays && streakDays <= t.maxDays
  ) || STREAK_REWARD_TIERS[0];
  
  return {
    points: tier.dailyPoints,
    xp: tier.dailyXP,
    multiplier: tier.multiplier,
    tier,
  };
}

type ProtectedHoliday = typeof SPECIAL_DATES.PROTECTED_HOLIDAYS[number];
type DoublePointDay = typeof SPECIAL_DATES.DOUBLE_POINT_DAYS[number];
/**
 * Check if date is protected holiday
 */
export function isProtectedHoliday(date: Date): boolean {
  const monthDay = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}` as ProtectedHoliday;

  return SPECIAL_DATES.PROTECTED_HOLIDAYS.includes(monthDay);
}

/**
 * Check if date is double points day
 */
export function isDoublePointsDay(date: Date): boolean {
  const monthDay = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}` as DoublePointDay;

  return SPECIAL_DATES.DOUBLE_POINT_DAYS.includes(monthDay);
}
/**
 * Check if activity meets requirements
 */
export function meetsActivityRequirement(
  activity: {
    problemsSolved?: number;
    commits?: number;
    timeSpent?: number;
    platform?: string;
  },
  requirement: ActivityRequirement = DEFAULT_ACTIVITY_REQUIREMENT
): boolean {
  switch (requirement.type) {
    case 'problems':
      return (activity.problemsSolved || 0) >= (requirement.minCount || 1);
    case 'commits':
      return (activity.commits || 0) >= (requirement.minCount || 1);
    case 'time':
      return (activity.timeSpent || 0) >= (requirement.minTime || 30);
    case 'any':
      return (
        (activity.problemsSolved || 0) > 0 ||
        (activity.commits || 0) > 0 ||
        (activity.timeSpent || 0) > 0
      );
    default:
      return false;
  }
}

/**
 * Calculate weighted activity score
 */
export function calculateActivityScore(
  activities: Array<{
    platform: string;
    problemsSolved?: number;
    commits?: number;
    timeSpent?: number;
  }>
): number {
  return activities.reduce((total, activity) => {
    const weight = PLATFORM_ACTIVITY_WEIGHTS[activity.platform] || 1.0;
    const baseScore = 
      (activity.problemsSolved || 0) * 10 +
      (activity.commits || 0) * 5 +
      (activity.timeSpent || 0) * 0.5;
    return total + (baseScore * weight);
  }, 0);
}

/**
 * Format freeze cooldown message
 */
export function formatFreezeCooldown(
  lastUsedAt: Date | null,
  cooldownDays: number
): { canUse: boolean; message: string; nextAvailable?: Date } {
  if (!lastUsedAt || cooldownDays === 0) {
    return { canUse: true, message: 'Freeze available' };
  }
  
  const nextAvailable = new Date(lastUsedAt);
  nextAvailable.setDate(nextAvailable.getDate() + cooldownDays);
  
  const now = new Date();
  const canUse = now >= nextAvailable;
  
  if (canUse) {
    return { canUse: true, message: 'Freeze available' };
  }
  
  const daysRemaining = Math.ceil((nextAvailable.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    canUse: false,
    message: `Freeze available in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`,
    nextAvailable,
  };
}

/**
 * Get streak emoji based on length
 */
export function getStreakEmoji(days: number): string {
  if (days === 0) return '❄️';
  if (days < 3) return '✨';
  if (days < 7) return '🔥';
  if (days < 14) return '⚡';
  if (days < 30) return '🚀';
  if (days < 50) return '💎';
  if (days < 100) return '🏆';
  if (days < 200) return '👑';
  if (days < 365) return '🌟';
  if (days < 500) return '🧙';
  if (days < 1000) return '🎊';
  return '🌌';
}

// ============================================================================
// EXPORTS
// ============================================================================

 const streakconfig= {
  STREAK_CONFIG,
  STREAK_MILESTONES,
  STREAK_MILESTONE_DAYS,
  FREEZE_LIMITS,
  ACTIVITY_REQUIREMENTS,
  DEFAULT_ACTIVITY_REQUIREMENT,
  PLATFORM_ACTIVITY_WEIGHTS,
  STREAK_RISK_LEVELS,
  STREAK_ACHIEVEMENTS,
  STREAK_REWARD_TIERS,
  SPECIAL_DATES,
  // Helper functions
  getFreezeLimit,
  getMilestoneConfig,
  getNextMilestone,
  getPreviousMilestone,
  getReachedMilestones,
  calculateMilestoneProgress,
  getStreakRiskLevel,
  calculateDailyRewards,
  isProtectedHoliday,
  isDoublePointsDay,
  meetsActivityRequirement,
  calculateActivityScore,
  formatFreezeCooldown,
  getStreakEmoji,
};

export default streakconfig;
 