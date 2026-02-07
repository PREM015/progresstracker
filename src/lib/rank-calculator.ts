/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: lib/rank-calculator.ts
// PURPOSE: Rank calculation logic
// ============================================================================

import { prisma } from '@/lib/prisma';
import { calculateTotalPoints } from './points-calculator';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type RankTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'grandmaster';

export interface RankTierConfig {
  tier: RankTier;
  name: string;
  minPoints: number;
  maxPoints: number;
  color: string;
  bgColor: string;
  icon: string;
  emoji: string;
  description: string;
}

export interface RankedUser {
  userId: string;
  username: string | null;
  name: string | null;
  image: string | null;
  totalPoints: number;
  rank: number;
  tier: RankTier;
  isCurrentUser?: boolean;
}

export interface RankInfo {
  rank: number;
  totalUsers: number;
  percentile: number;
  tier: RankTier;
  tierInfo: RankTierConfig;
  title: string;
  nextTier: RankTierConfig | null;
  pointsToNextTier: number;
  progressToNextTier: number;
}

export interface RankChange {
  oldRank: number;
  newRank: number;
  change: number;
  direction: 'up' | 'down' | 'same';
  positions: number;
}

export interface LeaderboardFilters {
  limit?: number;
  offset?: number;
  tier?: RankTier;
  timeRange?: 'all' | 'month' | 'week';
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Rank tier configuration
 */
export const RANK_TIERS: Record<RankTier, RankTierConfig> = {
  bronze: {
    tier: 'bronze',
    name: 'Bronze',
    minPoints: 0,
    maxPoints: 1000,
    color: '#CD7F32',
    bgColor: '#FDF4E7',
    icon: 'Medal',
    emoji: '🥉',
    description: 'Just getting started on your coding journey',
  },
  silver: {
    tier: 'silver',
    name: 'Silver',
    minPoints: 1001,
    maxPoints: 5000,
    color: '#C0C0C0',
    bgColor: '#F5F5F5',
    icon: 'Medal',
    emoji: '🥈',
    description: 'Building momentum with consistent practice',
  },
  gold: {
    tier: 'gold',
    name: 'Gold',
    minPoints: 5001,
    maxPoints: 15000,
    color: '#FFD700',
    bgColor: '#FFFBEB',
    icon: 'Medal',
    emoji: '🥇',
    description: 'A dedicated coder with solid skills',
  },
  platinum: {
    tier: 'platinum',
    name: 'Platinum',
    minPoints: 15001,
    maxPoints: 50000,
    color: '#E5E4E2',
    bgColor: '#F8F9FA',
    icon: 'Award',
    emoji: '💎',
    description: 'An advanced developer with impressive achievements',
  },
  diamond: {
    tier: 'diamond',
    name: 'Diamond',
    minPoints: 50001,
    maxPoints: 150000,
    color: '#B9F2FF',
    bgColor: '#F0FEFF',
    icon: 'Gem',
    emoji: '💠',
    description: 'Elite coder with exceptional dedication',
  },
  master: {
    tier: 'master',
    name: 'Master',
    minPoints: 150001,
    maxPoints: 500000,
    color: '#9333EA',
    bgColor: '#FAF5FF',
    icon: 'Crown',
    emoji: '👑',
    description: 'Master of the craft, inspiring others',
  },
  grandmaster: {
    tier: 'grandmaster',
    name: 'Grandmaster',
    minPoints: 500001,
    maxPoints: Infinity,
    color: '#DC2626',
    bgColor: '#FEF2F2',
    icon: 'Trophy',
    emoji: '🏆',
    description: 'Legendary status achieved, a coding legend',
  },
};

/**
 * Rank tier order for comparisons
 */
export const TIER_ORDER: RankTier[] = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'master',
  'grandmaster',
];

/**
 * Rank titles based on position
 */
export const RANK_TITLES: Record<number, string> = {
  1: 'Champion',
  2: 'Runner-up',
  3: 'Third Place',
  10: 'Top 10',
  50: 'Top 50',
  100: 'Top 100',
  500: 'Top 500',
  1000: 'Top 1K',
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Calculate global rank for a user
 * 
 * @param userId - User ID
 * @returns Global rank (1-based)
 */
export async function calculateGlobalRank(userId: string): Promise<number> {
  try {
    // Get user's total points
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalPoints: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Count users with more points
    const usersAhead = await prisma.user.count({
      where: {
        isActive: true,
        totalPoints: { gt: user.totalPoints },
      },
    });

    // Rank is position (1-based)
    return usersAhead + 1;
  } catch (error) {
    console.error('Error calculating global rank:', error);
    return 0;
  }
}

/**
 * Update ranks for all users
 * Should be run periodically (e.g., daily via cron)
 */
export async function updateAllRanks(): Promise<{
  updated: number;
  errors: number;
}> {
  let updated = 0;
  let errors = 0;

  try {
    // Get all active users ordered by points
    const users = await prisma.user.findMany({
      where: { isActive: true },
      orderBy: { totalPoints: 'desc' },
      select: { id: true, totalPoints: true, rank: true },
    });

    // Update ranks in batches
    const batchSize = 100;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (user, index) => {
          const newRank = i + index + 1;
          
          if (user.rank !== newRank) {
            try {
              await prisma.user.update({
                where: { id: user.id },
                data: { rank: newRank },
              });
              updated++;
            } catch (e) {
              console.error(`Error updating rank for user ${user.id}:`, e);
              errors++;
            }
          }
        })
      );
    }

    console.log(`Rank update complete: ${updated} updated, ${errors} errors`);
    return { updated, errors };
  } catch (error) {
    console.error('Error updating all ranks:', error);
    return { updated, errors: errors + 1 };
  }
}

/**
 * Get rank percentile
 * 
 * @param rank - User's rank
 * @param totalUsers - Total number of ranked users
 * @returns Percentile (0-100, where 100 is top)
 */
export function getRankPercentile(rank: number, totalUsers: number): number {
  if (totalUsers <= 0 || rank <= 0) return 0;
  if (rank > totalUsers) return 0;

  const percentile = ((totalUsers - rank + 1) / totalUsers) * 100;
  return Math.round(percentile * 10) / 10; // Round to 1 decimal
}

/**
 * Get rank title based on position
 * 
 * @param rank - User's rank
 * @returns Title string
 */
export function getRankTitle(rank: number): string {
  if (rank <= 0) return 'Unranked';
  
  // Check exact matches first
  if (RANK_TITLES[rank]) {
    return RANK_TITLES[rank];
  }

  // Check thresholds
  if (rank <= 10) return 'Top 10';
  if (rank <= 50) return 'Top 50';
  if (rank <= 100) return 'Top 100';
  if (rank <= 500) return 'Top 500';
  if (rank <= 1000) return 'Top 1K';
  if (rank <= 5000) return 'Top 5K';
  if (rank <= 10000) return 'Top 10K';
  
  return `Rank #${rank.toLocaleString()}`;
}

/**
 * Get rank tier based on points
 * 
 * @param points - Total points
 * @returns Rank tier
 */
export function getRankTier(points: number): RankTier {
  for (const tier of TIER_ORDER.slice().reverse()) {
    const config = RANK_TIERS[tier];
    if (points >= config.minPoints) {
      return tier;
    }
  }
  return 'bronze';
}

/**
 * Get tier configuration for points
 * 
 * @param points - Total points
 * @returns Tier configuration
 */
export function getTierConfig(points: number): RankTierConfig {
  const tier = getRankTier(points);
  return RANK_TIERS[tier];
}

/**
 * Get next tier configuration
 * 
 * @param currentTier - Current tier
 * @returns Next tier config or null if at max
 */
export function getNextTier(currentTier: RankTier): RankTierConfig | null {
  const currentIndex = TIER_ORDER.indexOf(currentTier);
  if (currentIndex < 0 || currentIndex >= TIER_ORDER.length - 1) {
    return null;
  }
  return RANK_TIERS[TIER_ORDER[currentIndex + 1]];
}

/**
 * Calculate rank change between old and new rank
 * 
 * @param oldRank - Previous rank
 * @param newRank - New rank
 * @returns Rank change info
 */
export function calculateRankChange(oldRank: number, newRank: number): RankChange {
  const change = oldRank - newRank;
  const positions = Math.abs(change);
  
  let direction: 'up' | 'down' | 'same';
  if (change > 0) {
    direction = 'up'; // Lower rank number = better
  } else if (change < 0) {
    direction = 'down';
  } else {
    direction = 'same';
  }

  return {
    oldRank,
    newRank,
    change,
    direction,
    positions,
  };
}

/**
 * Get nearby ranks around a user
 * 
 * @param userId - User ID
 * @param range - Number of users above/below to include
 * @returns Array of ranked users
 */
export async function getNearbyRanks(
  userId: string,
  range: number = 5
): Promise<RankedUser[]> {
  try {
    // Get user's current rank and points
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        totalPoints: true,
        rank: true,
      },
    });

    if (!user) {
      return [];
    }

    const userRank = user.rank || await calculateGlobalRank(userId);

    // Get users above (lower rank number = better)
    const usersAbove = await prisma.user.findMany({
      where: {
        isActive: true,
        isPublic: true,
        rank: {
          lt: userRank,
          gte: Math.max(1, userRank - range),
        },
      },
      orderBy: { rank: 'asc' },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        totalPoints: true,
        rank: true,
      },
    });

    // Get users below
    const usersBelow = await prisma.user.findMany({
      where: {
        isActive: true,
        isPublic: true,
        rank: {
          gt: userRank,
          lte: userRank + range,
        },
      },
      orderBy: { rank: 'asc' },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        totalPoints: true,
        rank: true,
      },
    });

    // Combine and format
    const allUsers = [...usersAbove, user, ...usersBelow];
    
    return allUsers.map(u => ({
      userId: u.id,
      username: u.username,
      name: u.name,
      image: u.image,
      totalPoints: u.totalPoints,
      rank: u.rank || 0,
      tier: getRankTier(u.totalPoints),
      isCurrentUser: u.id === userId,
    }));
  } catch (error) {
    console.error('Error getting nearby ranks:', error);
    return [];
  }
}

// ============================================================================
// DETAILED RANK INFO
// ============================================================================

/**
 * Get complete rank information for a user
 * 
 * @param userId - User ID
 * @returns Complete rank info
 */
export async function getRankInfo(userId: string): Promise<RankInfo | null> {
  try {
    const [user, totalUsers] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          totalPoints: true,
          rank: true,
        },
      }),
      prisma.user.count({
        where: { isActive: true },
      }),
    ]);

    if (!user) {
      return null;
    }

    const rank = user.rank || await calculateGlobalRank(userId);
    const tier = getRankTier(user.totalPoints);
    const tierInfo = RANK_TIERS[tier];
    const nextTier = getNextTier(tier);
    const percentile = getRankPercentile(rank, totalUsers);
    const title = getRankTitle(rank);

    // Calculate progress to next tier
    let pointsToNextTier = 0;
    let progressToNextTier = 100;

    if (nextTier) {
      pointsToNextTier = nextTier.minPoints - user.totalPoints;
      const tierRange = nextTier.minPoints - tierInfo.minPoints;
      const currentProgress = user.totalPoints - tierInfo.minPoints;
      progressToNextTier = Math.min(
        Math.round((currentProgress / tierRange) * 100),
        100
      );
    }

    return {
      rank,
      totalUsers,
      percentile,
      tier,
      tierInfo,
      title,
      nextTier,
      pointsToNextTier: Math.max(0, pointsToNextTier),
      progressToNextTier,
    };
  } catch (error) {
    console.error('Error getting rank info:', error);
    return null;
  }
}

/**
 * Get leaderboard with filters
 * 
 * @param filters - Leaderboard filters
 * @returns Leaderboard data
 */
export async function getLeaderboard(
  filters: LeaderboardFilters = {}
): Promise<{
  users: RankedUser[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const { limit = 50, offset = 0, tier } = filters;

  try {
    // Build where clause
    const where: any = {
      isActive: true,
      isPublic: true,
      showInLeaderboard: true,
    };

    // Filter by tier if specified
    if (tier) {
      const tierConfig = RANK_TIERS[tier];
      where.totalPoints = {
        gte: tierConfig.minPoints,
        lte: tierConfig.maxPoints === Infinity ? undefined : tierConfig.maxPoints,
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { totalPoints: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          totalPoints: true,
          rank: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    const rankedUsers: RankedUser[] = users.map((user, index) => ({
      userId: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      totalPoints: user.totalPoints,
      rank: user.rank || offset + index + 1,
      tier: getRankTier(user.totalPoints),
    }));

    return {
      users: rankedUsers,
      total,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return {
      users: [],
      total: 0,
      page: 1,
      totalPages: 0,
    };
  }
}

/**
 * Update single user's rank based on points
 * 
 * @param userId - User ID
 * @returns New rank
 */
export async function updateUserRank(userId: string): Promise<number> {
  // First, recalculate points
  const points = await calculateTotalPoints(userId);
  
  // Update points
  await prisma.user.update({
    where: { id: userId },
    data: { totalPoints: points },
  });

  // Calculate new rank
  const newRank = await calculateGlobalRank(userId);

  // Update rank
  await prisma.user.update({
    where: { id: userId },
    data: { rank: newRank },
  });

  return newRank;
}

/**
 * Get tier distribution statistics
 */
export async function getTierDistribution(): Promise<
  Array<{
    tier: RankTier;
    count: number;
    percentage: number;
  }>
> {
  const totalUsers = await prisma.user.count({
    where: { isActive: true },
  });

  const distribution: Array<{ tier: RankTier; count: number; percentage: number }> = [];

  for (const tier of TIER_ORDER) {
    const config = RANK_TIERS[tier];
    const count = await prisma.user.count({
      where: {
        isActive: true,
        totalPoints: {
          gte: config.minPoints,
          ...(config.maxPoints !== Infinity && { lte: config.maxPoints }),
        },
      },
    });

    distribution.push({
      tier,
      count,
      percentage: totalUsers > 0 ? Math.round((count / totalUsers) * 1000) / 10 : 0,
    });
  }

  return distribution;
}

// ============================================================================
// FORMATTING FUNCTIONS
// ============================================================================

/**
 * Format rank for display
 * 
 * @param rank - Rank number
 * @returns Formatted rank string
 */
export function formatRank(rank: number): string {
  if (rank <= 0) return 'Unranked';
  if (rank <= 3) {
    const medals = ['🥇', '🥈', '🥉'];
    return `${medals[rank - 1]} #${rank}`;
  }
  return `#${rank.toLocaleString()}`;
}

/**
 * Format points for display
 * 
 * @param points - Points number
 * @returns Formatted points string
 */
export function formatPoints(points: number): string {
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1)}M`;
  }
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}K`;
  }
  return points.toLocaleString();
}

/**
 * Get ordinal suffix for rank
 * 
 * @param rank - Rank number
 * @returns Ordinal string (1st, 2nd, 3rd, etc.)
 */
export function getOrdinal(rank: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = rank % 100;
  return rank + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ============================================================================
// EXPORTS
// ============================================================================

const rankCalculator ={
  // Core functions
  calculateGlobalRank,
  updateAllRanks,
  getRankPercentile,
  getRankTitle,
  getRankTier,
  calculateRankChange,
  getNearbyRanks,
  
  // Detailed info
  getRankInfo,
  getLeaderboard,
  updateUserRank,
  getTierDistribution,
  
  // Utility functions
  getTierConfig,
  getNextTier,
  formatRank,
  formatPoints,
  getOrdinal,
  
  // Constants
  RANK_TIERS,
  TIER_ORDER,
  RANK_TITLES,
};

export default rankCalculator;