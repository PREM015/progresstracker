// ===== FILE: src/config/achievements.ts =====
// Achievement configuration - synced with Prisma Achievement model

import type { PlatformCategory } from '@prisma/client';

// =============================================================================
// TYPE DEFINITIONS (Aligned with Prisma)
// =============================================================================

export type AchievementCategory = 
  | 'problems'
  | 'streak'
  | 'goals'
  | 'platforms'
  | 'consistency'
  | 'milestone'
  | 'special';

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface AchievementRequirement {
  type: 'count' | 'streak' | 'goal' | 'platform' | 'special';
  metric: string;
  value: number;
  platform?: string;
}

export interface Achievement {
  id: string;
  slug: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  prismaCategory: PlatformCategory; // Maps to database
  rarity: AchievementRarity;
  tier: AchievementTier;
  points: number;
  xpReward: number;
  requirement: AchievementRequirement;
  requirementText?: string;
  thresholds?: Array<{ value: number; label: string }>;
  secret?: boolean;
  isHidden?: boolean;
  isActive?: boolean;
  badgeImage?: string;
  color?: string;
  sortOrder?: number;
}

export interface AchievementProgress {
  achievementId: string;
  progress: number;
  progressPercentage: number;
  currentThreshold: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
}

// =============================================================================
// RARITY CONFIGURATION
// =============================================================================

export const RARITY_CONFIG: Record<AchievementRarity, {
  label: string;
  color: string;
  backgroundColor: string;
  pointsMultiplier: number;
  unlockPercentage: string;
}> = {
  common: {
    label: 'Common',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    pointsMultiplier: 1,
    unlockPercentage: '> 50%',
  },
  uncommon: {
    label: 'Uncommon',
    color: '#10B981',
    backgroundColor: '#D1FAE5',
    pointsMultiplier: 1.5,
    unlockPercentage: '25-50%',
  },
  rare: {
    label: 'Rare',
    color: '#3B82F6',
    backgroundColor: '#DBEAFE',
    pointsMultiplier: 2,
    unlockPercentage: '10-25%',
  },
  epic: {
    label: 'Epic',
    color: '#8B5CF6',
    backgroundColor: '#EDE9FE',
    pointsMultiplier: 3,
    unlockPercentage: '5-10%',
  },
  legendary: {
    label: 'Legendary',
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
    pointsMultiplier: 5,
    unlockPercentage: '< 5%',
  },
};

// =============================================================================
// TIER CONFIGURATION
// =============================================================================

export const TIER_CONFIG: Record<AchievementTier, {
  label: string;
  color: string;
  icon: string;
  order: number;
}> = {
  bronze: {
    label: 'Bronze',
    color: '#CD7F32',
    icon: '🥉',
    order: 1,
  },
  silver: {
    label: 'Silver',
    color: '#C0C0C0',
    icon: '🥈',
    order: 2,
  },
  gold: {
    label: 'Gold',
    color: '#FFD700',
    icon: '🥇',
    order: 3,
  },
  platinum: {
    label: 'Platinum',
    color: '#E5E4E2',
    icon: '💎',
    order: 4,
  },
  diamond: {
    label: 'Diamond',
    color: '#B9F2FF',
    icon: '💠',
    order: 5,
  },
};

// =============================================================================
// CATEGORY CONFIGURATION
// =============================================================================

export const ACHIEVEMENT_CATEGORIES: Record<AchievementCategory, {
  label: string;
  description: string;
  icon: string;
  color: string;
  prismaCategory: PlatformCategory;
}> = {
  problems: {
    label: 'Problem Solving',
    description: 'Achievements for solving coding problems',
    icon: 'Code',
    color: '#6366F1',
    prismaCategory: 'DSA',
  },
  streak: {
    label: 'Streaks',
    description: 'Achievements for maintaining coding streaks',
    icon: 'Flame',
    color: '#EF4444',
    prismaCategory: 'OTHER',
  },
  goals: {
    label: 'Goals',
    description: 'Achievements for completing goals',
    icon: 'Target',
    color: '#10B981',
    prismaCategory: 'OTHER',
  },
  platforms: {
    label: 'Platforms',
    description: 'Achievements for connecting platforms',
    icon: 'Link',
    color: '#8B5CF6',
    prismaCategory: 'OTHER',
  },
  consistency: {
    label: 'Consistency',
    description: 'Achievements for consistent activity',
    icon: 'Calendar',
    color: '#F59E0B',
    prismaCategory: 'OTHER',
  },
  milestone: {
    label: 'Milestones',
    description: 'Achievements for reaching milestones',
    icon: 'Flag',
    color: '#EC4899',
    prismaCategory: 'OTHER',
  },
  special: {
    label: 'Special',
    description: 'Special and secret achievements',
    icon: 'Star',
    color: '#06B6D4',
    prismaCategory: 'OTHER',
  },
};

// =============================================================================
// ACHIEVEMENTS DATA
// =============================================================================

export const achievements: Achievement[] = [
  // ========================================
  // PROBLEMS ACHIEVEMENTS
  // ========================================
  {
    id: 'first-problem',
    slug: 'first-problem',
    name: 'First Steps',
    title: 'First Steps',
    description: 'Solve your first coding problem',
    icon: '🎯',
    category: 'problems',
    prismaCategory: 'DSA',
    rarity: 'common',
    tier: 'bronze',
    points: 10,
    xpReward: 50,
    requirement: { type: 'count', metric: 'problems_solved', value: 1 },
    requirementText: 'Solve 1 problem',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: '10-problems',
    slug: '10-problems',
    name: 'Getting Started',
    title: 'Getting Started',
    description: 'Solve 10 coding problems',
    icon: '📝',
    category: 'problems',
    prismaCategory: 'DSA',
    rarity: 'common',
    tier: 'bronze',
    points: 25,
    xpReward: 100,
    requirement: { type: 'count', metric: 'problems_solved', value: 10 },
    requirementText: 'Solve 10 problems',
    thresholds: [
      { value: 3, label: '30%' },
      { value: 5, label: '50%' },
      { value: 8, label: '80%' },
    ],
    sortOrder: 2,
    isActive: true,
  },
  {
    id: '50-problems',
    slug: '50-problems',
    name: 'Problem Solver',
    title: 'Problem Solver',
    description: 'Solve 50 coding problems',
    icon: '💡',
    category: 'problems',
    prismaCategory: 'DSA',
    rarity: 'uncommon',
    tier: 'silver',
    points: 50,
    xpReward: 250,
    requirement: { type: 'count', metric: 'problems_solved', value: 50 },
    requirementText: 'Solve 50 problems',
    thresholds: [
      { value: 15, label: '30%' },
      { value: 25, label: '50%' },
      { value: 40, label: '80%' },
    ],
    sortOrder: 3,
    isActive: true,
  },
  {
    id: '100-problems',
    slug: '100-problems',
    name: 'Century Club',
    title: 'Century Club',
    description: 'Solve 100 coding problems',
    icon: '💯',
    category: 'problems',
    prismaCategory: 'DSA',
    rarity: 'rare',
    tier: 'gold',
    points: 100,
    xpReward: 500,
    requirement: { type: 'count', metric: 'problems_solved', value: 100 },
    requirementText: 'Solve 100 problems',
    sortOrder: 4,
    isActive: true,
  },
  {
    id: '250-problems',
    slug: '250-problems',
    name: 'Dedicated Coder',
    title: 'Dedicated Coder',
    description: 'Solve 250 coding problems',
    icon: '🔥',
    category: 'problems',
    prismaCategory: 'DSA',
    rarity: 'rare',
    tier: 'gold',
    points: 150,
    xpReward: 750,
    requirement: { type: 'count', metric: 'problems_solved', value: 250 },
    requirementText: 'Solve 250 problems',
    sortOrder: 5,
    isActive: true,
  },
  {
    id: '500-problems',
    slug: '500-problems',
    name: 'Problem Master',
    title: 'Problem Master',
    description: 'Solve 500 coding problems',
    icon: '🏆',
    category: 'problems',
    prismaCategory: 'DSA',
    rarity: 'epic',
    tier: 'platinum',
    points: 250,
    xpReward: 1000,
    requirement: { type: 'count', metric: 'problems_solved', value: 500 },
    requirementText: 'Solve 500 problems',
    sortOrder: 6,
    isActive: true,
  },
  {
    id: '1000-problems',
    slug: '1000-problems',
    name: 'Algorithm Legend',
    title: 'Algorithm Legend',
    description: 'Solve 1000 coding problems',
    icon: '👑',
    category: 'problems',
    prismaCategory: 'DSA',
    rarity: 'legendary',
    tier: 'diamond',
    points: 500,
    xpReward: 2500,
    requirement: { type: 'count', metric: 'problems_solved', value: 1000 },
    requirementText: 'Solve 1000 problems',
    sortOrder: 7,
    isActive: true,
  },

  // ========================================
  // STREAK ACHIEVEMENTS
  // ========================================
  {
    id: '3-day-streak',
    slug: '3-day-streak',
    name: 'Getting Consistent',
    title: 'Getting Consistent',
    description: 'Maintain a 3 day coding streak',
    icon: '🔥',
    category: 'streak',
    prismaCategory: 'OTHER',
    rarity: 'common',
    tier: 'bronze',
    points: 15,
    xpReward: 75,
    requirement: { type: 'streak', metric: 'current_streak', value: 3 },
    requirementText: 'Maintain a 3 day streak',
    sortOrder: 10,
    isActive: true,
  },
  {
    id: '7-day-streak',
    slug: '7-day-streak',
    name: 'Week Warrior',
    title: 'Week Warrior',
    description: 'Maintain a 7 day coding streak',
    icon: '📅',
    category: 'streak',
    prismaCategory: 'OTHER',
    rarity: 'uncommon',
    tier: 'silver',
    points: 50,
    xpReward: 200,
    requirement: { type: 'streak', metric: 'current_streak', value: 7 },
    requirementText: 'Maintain a 7 day streak',
    sortOrder: 11,
    isActive: true,
  },
  {
    id: '14-day-streak',
    slug: '14-day-streak',
    name: 'Two Week Champion',
    title: 'Two Week Champion',
    description: 'Maintain a 14 day coding streak',
    icon: '⚡',
    category: 'streak',
    prismaCategory: 'OTHER',
    rarity: 'rare',
    tier: 'gold',
    points: 100,
    xpReward: 400,
    requirement: { type: 'streak', metric: 'current_streak', value: 14 },
    requirementText: 'Maintain a 14 day streak',
    sortOrder: 12,
    isActive: true,
  },
  {
    id: '30-day-streak',
    slug: '30-day-streak',
    name: 'Monthly Master',
    title: 'Monthly Master',
    description: 'Maintain a 30 day coding streak',
    icon: '🌟',
    category: 'streak',
    prismaCategory: 'OTHER',
    rarity: 'epic',
    tier: 'platinum',
    points: 200,
    xpReward: 1000,
    requirement: { type: 'streak', metric: 'current_streak', value: 30 },
    requirementText: 'Maintain a 30 day streak',
    sortOrder: 13,
    isActive: true,
  },
  {
    id: '60-day-streak',
    slug: '60-day-streak',
    name: 'Unstoppable',
    title: 'Unstoppable',
    description: 'Maintain a 60 day coding streak',
    icon: '💪',
    category: 'streak',
    prismaCategory: 'OTHER',
    rarity: 'epic',
    tier: 'platinum',
    points: 300,
    xpReward: 1500,
    requirement: { type: 'streak', metric: 'current_streak', value: 60 },
    requirementText: 'Maintain a 60 day streak',
    sortOrder: 14,
    isActive: true,
  },
  {
    id: '100-day-streak',
    slug: '100-day-streak',
    name: 'Century Streak',
    title: 'Century Streak',
    description: 'Maintain a 100 day coding streak',
    icon: '🎖️',
    category: 'streak',
    prismaCategory: 'OTHER',
    rarity: 'legendary',
    tier: 'diamond',
    points: 500,
    xpReward: 2500,
    requirement: { type: 'streak', metric: 'current_streak', value: 100 },
    requirementText: 'Maintain a 100 day streak',
    sortOrder: 15,
    isActive: true,
  },
  {
    id: '365-day-streak',
    slug: '365-day-streak',
    name: 'Year of Code',
    title: 'Year of Code',
    description: 'Maintain a 365 day coding streak',
    icon: '🏅',
    category: 'streak',
    prismaCategory: 'OTHER',
    rarity: 'legendary',
    tier: 'diamond',
    points: 1000,
    xpReward: 5000,
    requirement: { type: 'streak', metric: 'current_streak', value: 365 },
    requirementText: 'Maintain a 365 day streak',
    sortOrder: 16,
    isActive: true,
  },

  // ========================================
  // GOAL ACHIEVEMENTS
  // ========================================
  {
    id: 'first-goal',
    slug: 'first-goal',
    name: 'Goal Setter',
    title: 'Goal Setter',
    description: 'Complete your first goal',
    icon: '🎯',
    category: 'goals',
    prismaCategory: 'OTHER',
    rarity: 'common',
    tier: 'bronze',
    points: 20,
    xpReward: 100,
    requirement: { type: 'goal', metric: 'goals_completed', value: 1 },
    requirementText: 'Complete 1 goal',
    sortOrder: 20,
    isActive: true,
  },
  {
    id: '5-goals',
    slug: '5-goals',
    name: 'Goal Achiever',
    title: 'Goal Achiever',
    description: 'Complete 5 goals',
    icon: '✅',
    category: 'goals',
    prismaCategory: 'OTHER',
    rarity: 'uncommon',
    tier: 'silver',
    points: 75,
    xpReward: 300,
    requirement: { type: 'goal', metric: 'goals_completed', value: 5 },
    requirementText: 'Complete 5 goals',
    sortOrder: 21,
    isActive: true,
  },
  {
    id: '10-goals',
    slug: '10-goals',
    name: 'Goal Crusher',
    title: 'Goal Crusher',
    description: 'Complete 10 goals',
    icon: '🚀',
    category: 'goals',
    prismaCategory: 'OTHER',
    rarity: 'rare',
    tier: 'gold',
    points: 150,
    xpReward: 600,
    requirement: { type: 'goal', metric: 'goals_completed', value: 10 },
    requirementText: 'Complete 10 goals',
    sortOrder: 22,
    isActive: true,
  },
  {
    id: '25-goals',
    slug: '25-goals',
    name: 'Goal Master',
    title: 'Goal Master',
    description: 'Complete 25 goals',
    icon: '🏆',
    category: 'goals',
    prismaCategory: 'OTHER',
    rarity: 'epic',
    tier: 'platinum',
    points: 300,
    xpReward: 1200,
    requirement: { type: 'goal', metric: 'goals_completed', value: 25 },
    requirementText: 'Complete 25 goals',
    sortOrder: 23,
    isActive: true,
  },
  {
    id: '50-goals',
    slug: '50-goals',
    name: 'Goal Legend',
    title: 'Goal Legend',
    description: 'Complete 50 goals',
    icon: '👑',
    category: 'goals',
    prismaCategory: 'OTHER',
    rarity: 'legendary',
    tier: 'diamond',
    points: 500,
    xpReward: 2500,
    requirement: { type: 'goal', metric: 'goals_completed', value: 50 },
    requirementText: 'Complete 50 goals',
    sortOrder: 24,
    isActive: true,
  },

  // ========================================
  // PLATFORM ACHIEVEMENTS
  // ========================================
  {
    id: 'first-platform',
    slug: 'first-platform',
    name: 'Platform Pioneer',
    title: 'Platform Pioneer',
    description: 'Connect your first platform',
    icon: '🔗',
    category: 'platforms',
    prismaCategory: 'OTHER',
    rarity: 'common',
    tier: 'bronze',
    points: 15,
    xpReward: 75,
    requirement: { type: 'platform', metric: 'platforms_connected', value: 1 },
    requirementText: 'Connect 1 platform',
    sortOrder: 30,
    isActive: true,
  },
  {
    id: '3-platforms',
    slug: '3-platforms',
    name: 'Multi-Platform',
    title: 'Multi-Platform',
    description: 'Connect 3 platforms',
    icon: '🌐',
    category: 'platforms',
    prismaCategory: 'OTHER',
    rarity: 'uncommon',
    tier: 'silver',
    points: 50,
    xpReward: 200,
    requirement: { type: 'platform', metric: 'platforms_connected', value: 3 },
    requirementText: 'Connect 3 platforms',
    sortOrder: 31,
    isActive: true,
  },
  {
    id: '5-platforms',
    slug: '5-platforms',
    name: 'Platform Master',
    title: 'Platform Master',
    description: 'Connect 5 platforms',
    icon: '🔌',
    category: 'platforms',
    prismaCategory: 'OTHER',
    rarity: 'rare',
    tier: 'gold',
    points: 100,
    xpReward: 400,
    requirement: { type: 'platform', metric: 'platforms_connected', value: 5 },
    requirementText: 'Connect 5 platforms',
    sortOrder: 32,
    isActive: true,
  },
  {
    id: '10-platforms',
    slug: '10-platforms',
    name: 'Platform Legend',
    title: 'Platform Legend',
    description: 'Connect 10 platforms',
    icon: '⚡',
    category: 'platforms',
    prismaCategory: 'OTHER',
    rarity: 'epic',
    tier: 'platinum',
    points: 200,
    xpReward: 800,
    requirement: { type: 'platform', metric: 'platforms_connected', value: 10 },
    requirementText: 'Connect 10 platforms',
    sortOrder: 33,
    isActive: true,
  },

  // ========================================
  // CONSISTENCY ACHIEVEMENTS
  // ========================================
  {
    id: 'early-bird',
    slug: 'early-bird',
    name: 'Early Bird',
    title: 'Early Bird',
    description: 'Log activity before 8 AM',
    icon: '🌅',
    category: 'consistency',
    prismaCategory: 'OTHER',
    rarity: 'uncommon',
    tier: 'silver',
    points: 30,
    xpReward: 150,
    requirement: { type: 'special', metric: 'early_activity', value: 1 },
    requirementText: 'Log activity before 8 AM',
    sortOrder: 40,
    isActive: true,
  },
  {
    id: 'night-owl',
    slug: 'night-owl',
    name: 'Night Owl',
    title: 'Night Owl',
    description: 'Log activity after 11 PM',
    icon: '🦉',
    category: 'consistency',
    prismaCategory: 'OTHER',
    rarity: 'uncommon',
    tier: 'silver',
    points: 30,
    xpReward: 150,
    requirement: { type: 'special', metric: 'late_activity', value: 1 },
    requirementText: 'Log activity after 11 PM',
    sortOrder: 41,
    isActive: true,
  },
  {
    id: 'weekend-warrior',
    slug: 'weekend-warrior',
    name: 'Weekend Warrior',
    title: 'Weekend Warrior',
    description: 'Code on 4 consecutive weekends',
    icon: '🏋️',
    category: 'consistency',
    prismaCategory: 'OTHER',
    rarity: 'rare',
    tier: 'gold',
    points: 100,
    xpReward: 400,
    requirement: { type: 'special', metric: 'weekend_streak', value: 4 },
    requirementText: 'Code on 4 consecutive weekends',
    sortOrder: 42,
    isActive: true,
  },

  // ========================================
  // MILESTONE ACHIEVEMENTS
  // ========================================
  {
    id: 'first-month',
    slug: 'first-month',
    name: 'One Month In',
    title: 'One Month In',
    description: 'Use CodeSync Pro for 30 days',
    icon: '📆',
    category: 'milestone',
    prismaCategory: 'OTHER',
    rarity: 'uncommon',
    tier: 'silver',
    points: 50,
    xpReward: 250,
    requirement: { type: 'count', metric: 'days_active', value: 30 },
    requirementText: 'Be active for 30 days',
    sortOrder: 50,
    isActive: true,
  },
  {
    id: 'three-months',
    slug: 'three-months',
    name: 'Quarterly Champion',
    title: 'Quarterly Champion',
    description: 'Use CodeSync Pro for 90 days',
    icon: '🗓️',
    category: 'milestone',
    prismaCategory: 'OTHER',
    rarity: 'rare',
    tier: 'gold',
    points: 100,
    xpReward: 500,
    requirement: { type: 'count', metric: 'days_active', value: 90 },
    requirementText: 'Be active for 90 days',
    sortOrder: 51,
    isActive: true,
  },
  {
    id: 'six-months',
    slug: 'six-months',
    name: 'Half Year Hero',
    title: 'Half Year Hero',
    description: 'Use CodeSync Pro for 180 days',
    icon: '🎊',
    category: 'milestone',
    prismaCategory: 'OTHER',
    rarity: 'epic',
    tier: 'platinum',
    points: 200,
    xpReward: 1000,
    requirement: { type: 'count', metric: 'days_active', value: 180 },
    requirementText: 'Be active for 180 days',
    sortOrder: 52,
    isActive: true,
  },
  {
    id: 'one-year',
    slug: 'one-year',
    name: 'Anniversary',
    title: 'Anniversary',
    description: 'Use CodeSync Pro for 365 days',
    icon: '🎂',
    category: 'milestone',
    prismaCategory: 'OTHER',
    rarity: 'legendary',
    tier: 'diamond',
    points: 500,
    xpReward: 2500,
    requirement: { type: 'count', metric: 'days_active', value: 365 },
    requirementText: 'Be active for 365 days',
    sortOrder: 53,
    isActive: true,
  },

  // ========================================
  // SPECIAL ACHIEVEMENTS
  // ========================================
  {
    id: 'perfect-week',
    slug: 'perfect-week',
    name: 'Perfect Week',
    title: 'Perfect Week',
    description: 'Complete all daily goals for 7 days',
    icon: '💎',
    category: 'special',
    prismaCategory: 'OTHER',
    rarity: 'epic',
    tier: 'platinum',
    points: 200,
    xpReward: 1000,
    requirement: { type: 'special', metric: 'perfect_week', value: 1 },
    requirementText: 'Complete all goals for 7 consecutive days',
    sortOrder: 60,
    isActive: true,
  },
  {
    id: 'perfect-month',
    slug: 'perfect-month',
    name: 'Perfect Month',
    title: 'Perfect Month',
    description: 'Complete all daily goals for 30 days',
    icon: '👑',
    category: 'special',
    prismaCategory: 'OTHER',
    rarity: 'legendary',
    tier: 'diamond',
    points: 500,
    xpReward: 3000,
    requirement: { type: 'special', metric: 'perfect_month', value: 1 },
    requirementText: 'Complete all goals for 30 consecutive days',
    sortOrder: 61,
    isActive: true,
  },
  {
    id: 'comeback-kid',
    slug: 'comeback-kid',
    name: 'Comeback Kid',
    title: 'Comeback Kid',
    description: 'Return after 7+ days of inactivity',
    icon: '🔄',
    category: 'special',
    prismaCategory: 'OTHER',
    rarity: 'uncommon',
    tier: 'silver',
    points: 30,
    xpReward: 150,
    requirement: { type: 'special', metric: 'comeback', value: 1 },
    requirementText: 'Return after 7+ days of inactivity',
    secret: true,
    isHidden: true,
    sortOrder: 62,
    isActive: true,
  },
  {
    id: 'overachiever',
    slug: 'overachiever',
    name: 'Overachiever',
    title: 'Overachiever',
    description: 'Complete a goal at 150% or more',
    icon: '📈',
    category: 'special',
    prismaCategory: 'OTHER',
    rarity: 'rare',
    tier: 'gold',
    points: 100,
    xpReward: 500,
    requirement: { type: 'special', metric: 'overachieve', value: 150 },
    requirementText: 'Complete a goal at 150%+ progress',
    sortOrder: 63,
    isActive: true,
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get achievement by ID
 */
export function getAchievementById(id: string): Achievement | undefined {
  return achievements.find((a) => a.id === id);
}

/**
 * Get achievement by slug
 */
export function getAchievementBySlug(slug: string): Achievement | undefined {
  return achievements.find((a) => a.slug === slug);
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
  return achievements.filter((a) => a.category === category);
}

/**
 * Get achievements by rarity
 */
export function getAchievementsByRarity(rarity: AchievementRarity): Achievement[] {
  return achievements.filter((a) => a.rarity === rarity);
}

/**
 * Get achievements by tier
 */
export function getAchievementsByTier(tier: AchievementTier): Achievement[] {
  return achievements.filter((a) => a.tier === tier);
}

/**
 * Get visible achievements (not hidden/secret)
 */
export function getVisibleAchievements(): Achievement[] {
  return achievements.filter((a) => !a.secret && !a.isHidden);
}

/**
 * Get active achievements
 */
export function getActiveAchievements(): Achievement[] {
  return achievements.filter((a) => a.isActive !== false);
}

/**
 * Get total possible points
 */
export function getTotalPoints(): number {
  return achievements.reduce((sum, a) => sum + a.points, 0);
}

/**
 * Get total possible XP
 */
export function getTotalXP(): number {
  return achievements.reduce((sum, a) => sum + a.xpReward, 0);
}

/**
 * Get rarity config
 */
export function getRarityConfig(rarity: AchievementRarity): typeof RARITY_CONFIG[AchievementRarity] {
  return RARITY_CONFIG[rarity];
}

/**
 * Get tier config
 */
export function getTierConfig(tier: AchievementTier): typeof TIER_CONFIG[AchievementTier] {
  return TIER_CONFIG[tier];
}

/**
 * Get category config
 */
export function getCategoryConfig(category: AchievementCategory): typeof ACHIEVEMENT_CATEGORIES[AchievementCategory] {
  return ACHIEVEMENT_CATEGORIES[category];
}

/**
 * Calculate achievement progress
 */
export function calculateProgress(
  achievement: Achievement,
  currentValue: number
): AchievementProgress {
  const targetValue = achievement.requirement.value;
  const progress = Math.min(currentValue, targetValue);
  const progressPercentage = Math.min((currentValue / targetValue) * 100, 100);
  const isUnlocked = currentValue >= targetValue;

  // Calculate current threshold
  let currentThreshold = 0;
  if (achievement.thresholds) {
    for (const threshold of achievement.thresholds) {
      if (currentValue >= threshold.value) {
        currentThreshold = threshold.value;
      }
    }
  }

  return {
    achievementId: achievement.id,
    progress,
    progressPercentage,
    currentThreshold,
    isUnlocked,
  };
}

/**
 * Get next achievement in category
 */
export function getNextAchievement(
  category: AchievementCategory,
  currentValue: number
): Achievement | undefined {
  const categoryAchievements = getAchievementsByCategory(category)
    .filter((a) => a.isActive !== false)
    .sort((a, b) => a.requirement.value - b.requirement.value);

  return categoryAchievements.find((a) => a.requirement.value > currentValue);
}

/**
 * Get achievement statistics
 */
export function getAchievementStats(): {
  total: number;
  byCategory: Record<AchievementCategory, number>;
  byRarity: Record<AchievementRarity, number>;
  byTier: Record<AchievementTier, number>;
  totalPoints: number;
  totalXP: number;
} {
  const byCategory = {} as Record<AchievementCategory, number>;
  const byRarity = {} as Record<AchievementRarity, number>;
  const byTier = {} as Record<AchievementTier, number>;

  Object.keys(ACHIEVEMENT_CATEGORIES).forEach((cat) => {
    byCategory[cat as AchievementCategory] = 0;
  });
  Object.keys(RARITY_CONFIG).forEach((rar) => {
    byRarity[rar as AchievementRarity] = 0;
  });
  Object.keys(TIER_CONFIG).forEach((tier) => {
    byTier[tier as AchievementTier] = 0;
  });

  achievements.forEach((a) => {
    byCategory[a.category]++;
    byRarity[a.rarity]++;
    byTier[a.tier]++;
  });

  return {
    total: achievements.length,
    byCategory,
    byRarity,
    byTier,
    totalPoints: getTotalPoints(),
    totalXP: getTotalXP(),
  };
}

/**
 * Convert achievement to Prisma format for database insertion
 */
export function toPrismaAchievement(achievement: Achievement): {
  slug: string;
  title: string;
  description: string;
  category: PlatformCategory;
  tier: string;
  icon: string;
  points: number;
  xpReward: number;
  rarity: string;
  requirement: object;
  requirementText: string | null;
  thresholds: object | null;
  isHidden: boolean;
  isSecret: boolean;
  isActive: boolean;
  sortOrder: number;
} {
  return {
    slug: achievement.slug,
    title: achievement.title,
    description: achievement.description,
    category: achievement.prismaCategory,
    tier: achievement.tier,
    icon: achievement.icon,
    points: achievement.points,
    xpReward: achievement.xpReward,
    rarity: achievement.rarity,
    requirement: achievement.requirement,
    requirementText: achievement.requirementText || null,
    thresholds: achievement.thresholds || null,
    isHidden: achievement.isHidden || false,
    isSecret: achievement.secret || false,
    isActive: achievement.isActive !== false,
    sortOrder: achievement.sortOrder || 0,
  };
}

export default achievements;