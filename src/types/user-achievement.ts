// src/types/user-achievement.ts
// User achievement unlock types

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** User achievement record (matches Prisma UserAchievement model) */
export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  progress: number;
  progressPercentage: number;
  currentThreshold: number;
  unlockedAt: Date;
  notified: boolean;
  notifiedAt?: Date | null;
  isPinned: boolean;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** User achievement with full achievement data */
export interface UserAchievementWithDetails extends UserAchievement {
  achievement: {
    id: string;
    slug: string;
    title: string;
    description: string;
    icon: string;
    category: string;
    rarity: string;
    tier: string;
    points: number;
    xpReward: number;
  };
}

/** Achievement unlock notification */
export interface AchievementUnlockEvent {
  userId: string;
  achievementId: string;
  achievementTitle: string;
  achievementIcon: string;
  pointsEarned: number;
  xpEarned: number;
  unlockedAt: Date;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface PinAchievementInput {
  achievementId: string;
  isPinned: boolean;
}

export interface HideAchievementInput {
  achievementId: string;
  isHidden: boolean;
}

export interface MarkAchievementNotifiedInput {
  achievementIds: string[];
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface UserAchievementsResponse {
  achievements: UserAchievementWithDetails[];
  total: number;
  unlockedCount: number;
  totalPoints: number;
  totalXp: number;
  recentUnlocks: UserAchievementWithDetails[];
}

export interface AchievementProgressUpdate {
  achievementId: string;
  oldProgress: number;
  newProgress: number;
  wasUnlocked: boolean;
  unlockedAt?: Date;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function isAchievementUnlocked(ua: Pick<UserAchievement, 'progressPercentage'>): boolean {
  return ua.progressPercentage >= 100;
}

export function calculateProgressPercentage(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export default UserAchievement;
