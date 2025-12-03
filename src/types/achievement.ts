// src/types/achievement.ts

export type AchievementCategory = 
  | 'problems'
  | 'streak'
  | 'consistency'
  | 'goals'
  | 'platforms'
  | 'special'
  | 'milestone';

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  points: number;
  requirement: AchievementRequirement;
  secret?: boolean;
}

export interface AchievementRequirement {
  type: 'count' | 'streak' | 'goal' | 'platform' | 'special';
  metric: string;
  value: number;
  comparison?: 'gte' | 'lte' | 'eq';
}

export interface UserAchievement {
  id: string;
  oduserId: string;
  achievementId: string;
  achievement: Achievement;
  unlockedAt: Date | string;
  progress?: number;
}

export interface AchievementProgress {
  achievementId: string;
  achievement: Achievement;
  current: number;
  target: number;
  percentage: number;
  isUnlocked: boolean;
  unlockedAt?: Date | string;
}

export interface AchievementStats {
  total: number;
  unlocked: number;
  points: number;
  byCategory: Record<AchievementCategory, { total: number; unlocked: number }>;
  byRarity: Record<AchievementRarity, { total: number; unlocked: number }>;
  recentUnlocks: UserAchievement[];
}

export interface AchievementNotification {
  achievement: Achievement;
  unlockedAt: Date;
  isNew: boolean;
}

// Rarity colors for UI
export const rarityColors: Record<AchievementRarity, { bg: string; text: string; border: string }> = {
  common: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  uncommon: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  rare: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  epic: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  legendary: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
};

// Rarity points multiplier
export const rarityPoints: Record<AchievementRarity, number> = {
  common: 10,
  uncommon: 25,
  rare: 50,
  epic: 100,
  legendary: 250,
};