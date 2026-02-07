// ===== FILE: src/types/achievement.ts =====
// Complete achievement types matching Prisma schema

import type { PlatformCategory as PrismaPlatformCategory } from '@prisma/client';
import { ReactNode } from "react";

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Achievement categories */
export type AchievementCategory =
  | 'problems'
  | 'streak'
  | 'consistency'
  | 'goals'
  | 'platforms'
  | 'learning'
  | 'opensource'
  | 'social'
  | 'special'
  | 'milestone'
  | 'hidden';

/** Achievement rarity tiers */
export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** Achievement tier (matches Prisma) */
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

/** Requirement comparison operators */
export type ComparisonOperator = 'gte' | 'lte' | 'eq' | 'gt' | 'lt' | 'between';

/** Requirement types */
export type RequirementType = 'count' | 'streak' | 'goal' | 'platform' | 'time' | 'special' | 'compound';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Achievement requirement definition */
export interface AchievementRequirement {
  type: RequirementType;
  metric: string;
  value: number;
  secondaryValue?: number; // For 'between' comparisons
  comparison: ComparisonOperator;
  platform?: string;
  category?: PrismaPlatformCategory;
  timeframe?: 'day' | 'week' | 'month' | 'year' | 'all';
}

/** Achievement definition (config/static) */
export interface Achievement {
  id: string;
  slug: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  badgeImage?: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  tier: AchievementTier;
  points: number;
  xpReward: number;
  requirement: AchievementRequirement;
  thresholds?: AchievementThreshold[];
  isHidden: boolean;
  isSecret: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Achievement threshold for progressive achievements */
export interface AchievementThreshold {
  value: number;
  label: string;
  tier: AchievementTier;
  pointsBonus?: number;
}

/** User's unlocked achievement (from database) */
export interface UserAchievement {
  id: string;
  oduserId: string;
 
  userId: string;
  achievementId: string;
  achievement: Achievement;
  progress: number;
  progressPercentage: number;
  currentThreshold: number;
  unlockedAt: Date;
  notified: boolean;
  notifiedAt?: Date;
  isPinned: boolean;
  isHidden: boolean;
  createdAt: Date;
}

/** Achievement progress tracking */
export interface AchievementProgress {
  achievementId: string;
  achievement: Achievement;
  current: number;
  target: number;
  percentage: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
  currentThreshold?: AchievementThreshold;
  nextThreshold?: AchievementThreshold;
  remainingToNext?: number;
}

/** Achievement statistics */
export interface AchievementStats {
  total: number;
  unlocked: number;
  locked: number;
  points: number;
  totalPoints: number;
  xpEarned: number;
  completionPercentage: number;
  byCategory: Record<AchievementCategory, { total: number; unlocked: number; points: number }>;
  byRarity: Record<AchievementRarity, { total: number; unlocked: number }>;
  byTier: Record<AchievementTier, { total: number; unlocked: number }>;
  recentUnlocks: UserAchievement[];
  nextToUnlock: AchievementProgress[];
  pinnedAchievements: UserAchievement[];
}

/** Achievement unlock notification */
export interface AchievementNotification {
  id: string
  achievement: Achievement;
  unlockedAt: Date;
  isNew: boolean;
  pointsEarned: number;
  xpEarned: number;
}

/** Achievement check result */
export interface AchievementCheckResult {
  shouldUnlock: boolean;
  achievement: Achievement;
  progress: number;
  target: number;
  percentage: number;
}

// =============================================================================
// INPUT/REQUEST TYPES
// =============================================================================

/** Create achievement input */
export interface CreateAchievementInput {
  slug: string;
  title: string;
  description: string;
  icon?: string;
  category: AchievementCategory;
  rarity?: AchievementRarity;
  tier?: AchievementTier;
  points?: number;
  xpReward?: number;
  requirement: AchievementRequirement;
  isHidden?: boolean;
  isSecret?: boolean;
}

/** Update achievement input */
export interface UpdateAchievementInput {
  title?: string;
  description?: string;
  icon?: string;
  points?: number;
  xpReward?: number;
  isActive?: boolean;
  sortOrder?: number;
}

/** Achievement filter options */
export interface AchievementFilter {
  category?: AchievementCategory;
  rarity?: AchievementRarity;
  tier?: AchievementTier;
  isUnlocked?: boolean;
  isHidden?: boolean;
  search?: string;
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

/** Rarity display configuration */
export const RARITY_CONFIG: Record<AchievementRarity, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  points: number;
  emoji: string;
}> = {
  common: {
    label: 'Common',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    borderColor: '#D1D5DB',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-700',
    borderClass: 'border-gray-300',
    points: 10,
    emoji: '⚪',
  },
  uncommon: {
    label: 'Uncommon',
    color: '#10B981',
    bgColor: '#D1FAE5',
    borderColor: '#6EE7B7',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
    borderClass: 'border-green-300',
    points: 25,
    emoji: '🟢',
  },
  rare: {
    label: 'Rare',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    borderColor: '#93C5FD',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-300',
    points: 50,
    emoji: '🔵',
  },
  epic: {
    label: 'Epic',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    borderColor: '#C4B5FD',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-300',
    points: 100,
    emoji: '🟣',
  },
  legendary: {
    label: 'Legendary',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    borderColor: '#FCD34D',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-700',
    borderClass: 'border-yellow-300',
    points: 250,
    emoji: '🟡',
  },
};

/** Tier display configuration */
export const TIER_CONFIG: Record<AchievementTier, {
  icon?: ReactNode;
  label: string;
  color: string;
  emoji: string;
  multiplier: number;
}> = {
  bronze: { label: 'Bronze', color: '#CD7F32', emoji: '🥉', multiplier: 1 },
  silver: { label: 'Silver', color: '#C0C0C0', emoji: '🥈', multiplier: 1.5 },
  gold: { label: 'Gold', color: '#FFD700', emoji: '🥇', multiplier: 2 },
  platinum: { label: 'Platinum', color: '#E5E4E2', emoji: '💎', multiplier: 3 },
  diamond: { label: 'Diamond', color: '#B9F2FF', emoji: '💠', multiplier: 5 },
};

/** Category display configuration */
export const CATEGORY_CONFIG: Record<AchievementCategory, {
  label: string;
  icon: string;
  emoji: string;
  color: string;
}> = {
  problems: { label: 'Problem Solving', icon: 'Code', emoji: '💻', color: '#6366F1' },
  streak: { label: 'Streaks', icon: 'Flame', emoji: '🔥', color: '#EF4444' },
  consistency: { label: 'Consistency', icon: 'Calendar', emoji: '📅', color: '#10B981' },
  goals: { label: 'Goals', icon: 'Target', emoji: '🎯', color: '#F59E0B' },
  platforms: { label: 'Platforms', icon: 'Layers', emoji: '🔗', color: '#8B5CF6' },
  learning: { label: 'Learning', icon: 'BookOpen', emoji: '📚', color: '#EC4899' },
  opensource: { label: 'Open Source', icon: 'Heart', emoji: '❤️', color: '#EF4444' },
  social: { label: 'Social', icon: 'Users', emoji: '👥', color: '#06B6D4' },
  special: { label: 'Special', icon: 'Star', emoji: '⭐', color: '#F59E0B' },
  milestone: { label: 'Milestones', icon: 'Flag', emoji: '🏁', color: '#10B981' },
  hidden: { label: 'Hidden', icon: 'Eye', emoji: '👁️', color: '#6B7280' },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get rarity config */
export function getRarityConfig(rarity: AchievementRarity) {
  return RARITY_CONFIG[rarity];
}

/** Get tier config */
export function getTierConfig(tier: AchievementTier) {
  return TIER_CONFIG[tier];
}

/** Get category config */
export function getAchievementCategoryConfig(category: AchievementCategory) {
  return CATEGORY_CONFIG[category];
}

/** Calculate points for achievement */
export function calculateAchievementPoints(rarity: AchievementRarity, tier: AchievementTier): number {
  return Math.round(RARITY_CONFIG[rarity].points * TIER_CONFIG[tier].multiplier);
}

/** Format achievement for display */
export function formatAchievement(achievement: Achievement): string {
  const emoji = RARITY_CONFIG[achievement.rarity].emoji;
  return `${emoji} ${achievement.title}`;
}

/** Check if achievement is unlockable */
export function isAchievementUnlockable(progress: AchievementProgress): boolean {
  return !progress.isUnlocked && progress.percentage >= 100;
}

/** Get next achievements to unlock */
export function getNextAchievements(
  progresses: AchievementProgress[],
  limit: number = 5
): AchievementProgress[] {
  return progresses
    .filter((p) => !p.isUnlocked && p.percentage < 100)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, limit);
}

/** Sort achievements by rarity */
export function sortByRarity(achievements: Achievement[]): Achievement[] {
  const rarityOrder: AchievementRarity[] = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
  return [...achievements].sort(
    (a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity)
  );
}

export default Achievement;