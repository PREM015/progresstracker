// ============================================================================
// FILE: src/constants/achievements.ts
// PURPOSE: Achievement-related constants
// ============================================================================

import type { AchievementCategory, AchievementRarity, AchievementTier } from '@/types/achievement';

// =============================================================================
// ACHIEVEMENT CATEGORIES
// =============================================================================

export const ACHIEVEMENT_CATEGORIES = {
  PROBLEMS: 'problems',
  STREAK: 'streak',
  CONSISTENCY: 'consistency',
  GOALS: 'goals',
  PLATFORMS: 'platforms',
  LEARNING: 'learning',
  OPENSOURCE: 'opensource',
  SOCIAL: 'social',
  SPECIAL: 'special',
  MILESTONE: 'milestone',
  HIDDEN: 'hidden',
} as const;

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  problems: 'Problem Solving',
  streak: 'Streaks',
  consistency: 'Consistency',
  goals: 'Goals',
  platforms: 'Platforms',
  learning: 'Learning',
  opensource: 'Open Source',
  social: 'Social',
  special: 'Special',
  milestone: 'Milestones',
  hidden: 'Hidden',
};

export const ACHIEVEMENT_CATEGORY_ICONS: Record<AchievementCategory, string> = {
  problems: 'Code',
  streak: 'Flame',
  consistency: 'Calendar',
  goals: 'Target',
  platforms: 'Layers',
  learning: 'BookOpen',
  opensource: 'Heart',
  social: 'Users',
  special: 'Star',
  milestone: 'Flag',
  hidden: 'Eye',
};

export const ACHIEVEMENT_CATEGORY_COLORS: Record<AchievementCategory, string> = {
  problems: '#6366F1',
  streak: '#EF4444',
  consistency: '#10B981',
  goals: '#F59E0B',
  platforms: '#8B5CF6',
  learning: '#EC4899',
  opensource: '#EF4444',
  social: '#06B6D4',
  special: '#F59E0B',
  milestone: '#10B981',
  hidden: '#6B7280',
};

// =============================================================================
// ACHIEVEMENT RARITIES
// =============================================================================

export const ACHIEVEMENT_RARITIES = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
} as const;

export const ACHIEVEMENT_RARITY_LABELS: Record<AchievementRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export const ACHIEVEMENT_RARITY_COLORS: Record<AchievementRarity, string> = {
  common: '#6B7280',
  uncommon: '#10B981',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
};

export const ACHIEVEMENT_RARITY_BG_COLORS: Record<AchievementRarity, string> = {
  common: '#F3F4F6',
  uncommon: '#D1FAE5',
  rare: '#DBEAFE',
  epic: '#EDE9FE',
  legendary: '#FEF3C7',
};

export const ACHIEVEMENT_RARITY_BORDER_COLORS: Record<AchievementRarity, string> = {
  common: '#D1D5DB',
  uncommon: '#6EE7B7',
  rare: '#93C5FD',
  epic: '#C4B5FD',
  legendary: '#FCD34D',
};

export const ACHIEVEMENT_RARITY_POINTS: Record<AchievementRarity, number> = {
  common: 10,
  uncommon: 25,
  rare: 50,
  epic: 100,
  legendary: 250,
};

export const ACHIEVEMENT_RARITY_EMOJIS: Record<AchievementRarity, string> = {
  common: '⚪',
  uncommon: '🟢',
  rare: '🔵',
  epic: '🟣',
  legendary: '🟡',
};

// =============================================================================
// ACHIEVEMENT TIERS
// =============================================================================

export const ACHIEVEMENT_TIERS = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
  DIAMOND: 'diamond',
} as const;

export const ACHIEVEMENT_TIER_LABELS: Record<AchievementTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
};

export const ACHIEVEMENT_TIER_COLORS: Record<AchievementTier, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
};

export const ACHIEVEMENT_TIER_EMOJIS: Record<AchievementTier, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '💎',
  diamond: '💠',
};

export const ACHIEVEMENT_TIER_MULTIPLIERS: Record<AchievementTier, number> = {
  bronze: 1,
  silver: 1.5,
  gold: 2,
  platinum: 3,
  diamond: 5,
};

export const ACHIEVEMENT_TIER_ORDER: Record<AchievementTier, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
  diamond: 5,
};

// =============================================================================
// ACHIEVEMENT DEFAULTS
// =============================================================================

export const DEFAULT_ACHIEVEMENT_ICON = '🏆';
export const DEFAULT_ACHIEVEMENT_COLOR = '#6366F1';
export const DEFAULT_ACHIEVEMENT_POINTS = 10;
export const DEFAULT_ACHIEVEMENT_XP = 50;

// =============================================================================
// ACHIEVEMENT LIMITS
// =============================================================================

export const MAX_ACHIEVEMENTS_PER_USER = 1000;
export const MAX_PINNED_ACHIEVEMENTS = 3;
export const MAX_ACHIEVEMENT_TITLE_LENGTH = 100;
export const MAX_ACHIEVEMENT_DESCRIPTION_LENGTH = 500;

// =============================================================================
// ACHIEVEMENT PROGRESS
// =============================================================================

export const ACHIEVEMENT_PROGRESS_THRESHOLDS = {
  STARTED: 1,
  QUARTER: 25,
  HALF: 50,
  THREE_QUARTERS: 75,
  ALMOST_COMPLETE: 90,
  COMPLETE: 100,
} as const;

export const ACHIEVEMENT_PROGRESS_LABELS = {
  0: 'Not Started',
  1: 'Just Started',
  25: '25% Complete',
  50: 'Halfway There',
  75: '75% Complete',
  90: 'Almost Done',
  100: 'Completed',
} as const;

// =============================================================================
// ACHIEVEMENT NOTIFICATION MESSAGES
// =============================================================================

export const ACHIEVEMENT_UNLOCK_MESSAGES = [
  '🎉 Achievement Unlocked!',
  '🏆 You did it!',
  '⭐ Congratulations!',
  '🎊 Amazing work!',
  '🌟 Well done!',
  '✨ Fantastic!',
  '🔥 You\'re on fire!',
  '💪 Keep it up!',
  '🚀 Great job!',
  '👏 Impressive!',
];

// =============================================================================
// ACHIEVEMENT SORTING
// =============================================================================

export const ACHIEVEMENT_SORT_OPTIONS = {
  NEWEST: 'newest',
  OLDEST: 'oldest',
  POINTS_HIGH: 'points_high',
  POINTS_LOW: 'points_low',
  RARITY: 'rarity',
  PROGRESS: 'progress',
  ALPHABETICAL: 'alphabetical',
} as const;

export const ACHIEVEMENT_SORT_LABELS = {
  newest: 'Newest First',
  oldest: 'Oldest First',
  points_high: 'Highest Points',
  points_low: 'Lowest Points',
  rarity: 'Rarity',
  progress: 'Progress',
  alphabetical: 'A-Z',
} as const;

// =============================================================================
// ACHIEVEMENT FILTERS
// =============================================================================

export const ACHIEVEMENT_FILTER_OPTIONS = {
  ALL: 'all',
  UNLOCKED: 'unlocked',
  LOCKED: 'locked',
  IN_PROGRESS: 'in_progress',
  PINNED: 'pinned',
} as const;

export const ACHIEVEMENT_FILTER_LABELS = {
  all: 'All Achievements',
  unlocked: 'Unlocked',
  locked: 'Locked',
  in_progress: 'In Progress',
  pinned: 'Pinned',
} as const;

// =============================================================================
// EXPORTS
// =============================================================================

const ACHIEVEMENTS_EXPORT = {
  CATEGORIES: ACHIEVEMENT_CATEGORIES,
  CATEGORY_LABELS: ACHIEVEMENT_CATEGORY_LABELS,
  CATEGORY_ICONS: ACHIEVEMENT_CATEGORY_ICONS,
  CATEGORY_COLORS: ACHIEVEMENT_CATEGORY_COLORS,
  RARITIES: ACHIEVEMENT_RARITIES,
  RARITY_LABELS: ACHIEVEMENT_RARITY_LABELS,
  RARITY_COLORS: ACHIEVEMENT_RARITY_COLORS,
  RARITY_POINTS: ACHIEVEMENT_RARITY_POINTS,
  RARITY_EMOJIS: ACHIEVEMENT_RARITY_EMOJIS,
  TIERS: ACHIEVEMENT_TIERS,
  TIER_LABELS: ACHIEVEMENT_TIER_LABELS,
  TIER_COLORS: ACHIEVEMENT_TIER_COLORS,
  TIER_EMOJIS: ACHIEVEMENT_TIER_EMOJIS,
  TIER_MULTIPLIERS: ACHIEVEMENT_TIER_MULTIPLIERS,
  PROGRESS_THRESHOLDS: ACHIEVEMENT_PROGRESS_THRESHOLDS,
  UNLOCK_MESSAGES: ACHIEVEMENT_UNLOCK_MESSAGES,
  SORT_OPTIONS: ACHIEVEMENT_SORT_OPTIONS,
  FILTER_OPTIONS: ACHIEVEMENT_FILTER_OPTIONS,
};

export default ACHIEVEMENTS_EXPORT;