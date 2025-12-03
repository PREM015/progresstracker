// src/config/achievements.ts

import { Achievement, AchievementCategory, AchievementRarity } from '@/types/achievement';

export const achievements: Achievement[] = [
  // ========================================
  // PROBLEMS ACHIEVEMENTS
  // ========================================
  {
    id: 'first-problem',
    name: 'First Steps',
    description: 'Solve your first coding problem',
    icon: '🎯',
    category: 'problems',
    rarity: 'common',
    points: 10,
    requirement: { type: 'count', metric: 'problems_solved', value: 1 },
  },
  {
    id: '10-problems',
    name: 'Getting Started',
    description: 'Solve 10 coding problems',
    icon: '📝',
    category: 'problems',
    rarity: 'common',
    points: 10,
    requirement: { type: 'count', metric: 'problems_solved', value: 10 },
  },
  {
    id: '50-problems',
    name: 'Problem Solver',
    description: 'Solve 50 coding problems',
    icon: '💡',
    category: 'problems',
    rarity: 'uncommon',
    points: 25,
    requirement: { type: 'count', metric: 'problems_solved', value: 50 },
  },
  {
    id: '100-problems',
    name: 'Century Club',
    description: 'Solve 100 coding problems',
    icon: '💯',
    category: 'problems',
    rarity: 'rare',
    points: 50,
    requirement: { type: 'count', metric: 'problems_solved', value: 100 },
  },
  {
    id: '250-problems',
    name: 'Dedicated Coder',
    description: 'Solve 250 coding problems',
    icon: '🔥',
    category: 'problems',
    rarity: 'rare',
    points: 50,
    requirement: { type: 'count', metric: 'problems_solved', value: 250 },
  },
  {
    id: '500-problems',
    name: 'Problem Master',
    description: 'Solve 500 coding problems',
    icon: '🏆',
    category: 'problems',
    rarity: 'epic',
    points: 100,
    requirement: { type: 'count', metric: 'problems_solved', value: 500 },
  },
  {
    id: '1000-problems',
    name: 'Algorithm Legend',
    description: 'Solve 1000 coding problems',
    icon: '👑',
    category: 'problems',
    rarity: 'legendary',
    points: 250,
    requirement: { type: 'count', metric: 'problems_solved', value: 1000 },
  },

  // ========================================
  // STREAK ACHIEVEMENTS
  // ========================================
  {
    id: '3-day-streak',
    name: 'Getting Consistent',
    description: 'Maintain a 3 day coding streak',
    icon: '🔥',
    category: 'streak',
    rarity: 'common',
    points: 10,
    requirement: { type: 'streak', metric: 'current_streak', value: 3 },
  },
  {
    id: '7-day-streak',
    name: 'Week Warrior',
    description: 'Maintain a 7 day coding streak',
    icon: '📅',
    category: 'streak',
    rarity: 'uncommon',
    points: 25,
    requirement: { type: 'streak', metric: 'current_streak', value: 7 },
  },
  {
    id: '14-day-streak',
    name: 'Two Week Champion',
    description: 'Maintain a 14 day coding streak',
    icon: '⚡',
    category: 'streak',
    rarity: 'rare',
    points: 50,
    requirement: { type: 'streak', metric: 'current_streak', value: 14 },
  },
  {
    id: '30-day-streak',
    name: 'Monthly Master',
    description: 'Maintain a 30 day coding streak',
    icon: '🌟',
    category: 'streak',
    rarity: 'epic',
    points: 100,
    requirement: { type: 'streak', metric: 'current_streak', value: 30 },
  },
  {
    id: '60-day-streak',
    name: 'Unstoppable',
    description: 'Maintain a 60 day coding streak',
    icon: '💪',
    category: 'streak',
    rarity: 'epic',
    points: 100,
    requirement: { type: 'streak', metric: 'current_streak', value: 60 },
  },
  {
    id: '100-day-streak',
    name: 'Century Streak',
    description: 'Maintain a 100 day coding streak',
    icon: '🎖️',
    category: 'streak',
    rarity: 'legendary',
    points: 250,
    requirement: { type: 'streak', metric: 'current_streak', value: 100 },
  },
  {
    id: '365-day-streak',
    name: 'Year of Code',
    description: 'Maintain a 365 day coding streak',
    icon: '🏅',
    category: 'streak',
    rarity: 'legendary',
    points: 500,
    requirement: { type: 'streak', metric: 'current_streak', value: 365 },
  },

  // ========================================
  // GOAL ACHIEVEMENTS
  // ========================================
  {
    id: 'first-goal',
    name: 'Goal Setter',
    description: 'Complete your first goal',
    icon: '🎯',
    category: 'goals',
    rarity: 'common',
    points: 10,
    requirement: { type: 'goal', metric: 'goals_completed', value: 1 },
  },
  {
    id: '5-goals',
    name: 'Goal Achiever',
    description: 'Complete 5 goals',
    icon: '✅',
    category: 'goals',
    rarity: 'uncommon',
    points: 25,
    requirement: { type: 'goal', metric: 'goals_completed', value: 5 },
  },
  {
    id: '10-goals',
    name: 'Goal Crusher',
    description: 'Complete 10 goals',
    icon: '🚀',
    category: 'goals',
    rarity: 'rare',
    points: 50,
    requirement: { type: 'goal', metric: 'goals_completed', value: 10 },
  },
  {
    id: '25-goals',
    name: 'Goal Master',
    description: 'Complete 25 goals',
    icon: '🏆',
    category: 'goals',
    rarity: 'epic',
    points: 100,
    requirement: { type: 'goal', metric: 'goals_completed', value: 25 },
  },
  {
    id: '50-goals',
    name: 'Goal Legend',
    description: 'Complete 50 goals',
    icon: '👑',
    category: 'goals',
    rarity: 'legendary',
    points: 250,
    requirement: { type: 'goal', metric: 'goals_completed', value: 50 },
  },

  // ========================================
  // PLATFORM ACHIEVEMENTS
  // ========================================
  {
    id: 'first-platform',
    name: 'Platform Pioneer',
    description: 'Connect your first platform',
    icon: '🔗',
    category: 'platforms',
    rarity: 'common',
    points: 10,
    requirement: { type: 'platform', metric: 'platforms_connected', value: 1 },
  },
  {
    id: '3-platforms',
    name: 'Multi-Platform',
    description: 'Connect 3 platforms',
    icon: '🌐',
    category: 'platforms',
    rarity: 'uncommon',
    points: 25,
    requirement: { type: 'platform', metric: 'platforms_connected', value: 3 },
  },
  {
    id: '5-platforms',
    name: 'Platform Master',
    description: 'Connect 5 platforms',
    icon: '🔌',
    category: 'platforms',
    rarity: 'rare',
    points: 50,
    requirement: { type: 'platform', metric: 'platforms_connected', value: 5 },
  },
  {
    id: '10-platforms',
    name: 'Platform Legend',
    description: 'Connect 10 platforms',
    icon: '⚡',
    category: 'platforms',
    rarity: 'epic',
    points: 100,
    requirement: { type: 'platform', metric: 'platforms_connected', value: 10 },
  },

  // ========================================
  // CONSISTENCY ACHIEVEMENTS
  // ========================================
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Log activity before 8 AM',
    icon: '🌅',
    category: 'consistency',
    rarity: 'uncommon',
    points: 25,
    requirement: { type: 'special', metric: 'early_activity', value: 1 },
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Log activity after 11 PM',
    icon: '🦉',
    category: 'consistency',
    rarity: 'uncommon',
    points: 25,
    requirement: { type: 'special', metric: 'late_activity', value: 1 },
  },
  {
    id: 'weekend-warrior',
    name: 'Weekend Warrior',
    description: 'Code on 4 consecutive weekends',
    icon: '🏋️',
    category: 'consistency',
    rarity: 'rare',
    points: 50,
    requirement: { type: 'special', metric: 'weekend_streak', value: 4 },
  },

  // ========================================
  // MILESTONE ACHIEVEMENTS
  // ========================================
  {
    id: 'first-month',
    name: 'One Month In',
    description: 'Use CodeSync Pro for 30 days',
    icon: '📆',
    category: 'milestone',
    rarity: 'uncommon',
    points: 25,
    requirement: { type: 'count', metric: 'days_active', value: 30 },
  },
  {
    id: 'three-months',
    name: 'Quarterly Champion',
    description: 'Use CodeSync Pro for 90 days',
    icon: '🗓️',
    category: 'milestone',
    rarity: 'rare',
    points: 50,
    requirement: { type: 'count', metric: 'days_active', value: 90 },
  },
  {
    id: 'six-months',
    name: 'Half Year Hero',
    description: 'Use CodeSync Pro for 180 days',
    icon: '🎊',
    category: 'milestone',
    rarity: 'epic',
    points: 100,
    requirement: { type: 'count', metric: 'days_active', value: 180 },
  },
  {
    id: 'one-year',
    name: 'Anniversary',
    description: 'Use CodeSync Pro for 365 days',
    icon: '🎂',
    category: 'milestone',
    rarity: 'legendary',
    points: 250,
    requirement: { type: 'count', metric: 'days_active', value: 365 },
  },

  // ========================================
  // SPECIAL ACHIEVEMENTS
  // ========================================
  {
    id: 'perfect-week',
    name: 'Perfect Week',
    description: 'Complete all daily goals for 7 days',
    icon: '💎',
    category: 'special',
    rarity: 'epic',
    points: 100,
    requirement: { type: 'special', metric: 'perfect_week', value: 1 },
  },
  {
    id: 'perfect-month',
    name: 'Perfect Month',
    description: 'Complete all daily goals for 30 days',
    icon: '👑',
    category: 'special',
    rarity: 'legendary',
    points: 250,
    requirement: { type: 'special', metric: 'perfect_month', value: 1 },
  },
  {
    id: 'comeback-kid',
    name: 'Comeback Kid',
    description: 'Return after 7+ days of inactivity',
    icon: '🔄',
    category: 'special',
    rarity: 'uncommon',
    points: 25,
    requirement: { type: 'special', metric: 'comeback', value: 1 },
    secret: true,
  },
  {
    id: 'overachiever',
    name: 'Overachiever',
    description: 'Complete a goal at 150% or more',
    icon: '📈',
    category: 'special',
    rarity: 'rare',
    points: 50,
    requirement: { type: 'special', metric: 'overachieve', value: 150 },
  },
];

// Helper functions
export function getAchievementById(id: string): Achievement | undefined {
  return achievements.find(a => a.id === id);
}

export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
  return achievements.filter(a => a.category === category);
}

export function getAchievementsByRarity(rarity: AchievementRarity): Achievement[] {
  return achievements.filter(a => a.rarity === rarity);
}

export function getVisibleAchievements(): Achievement[] {
  return achievements.filter(a => !a.secret);
}

export function getTotalPoints(): number {
  return achievements.reduce((sum, a) => sum + a.points, 0);
}

export default achievements;