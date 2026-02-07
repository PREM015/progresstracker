/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: lib/points-calculator.ts
// PURPOSE: Points calculation logic
// ============================================================================

import { prisma } from '@/lib/prisma';
import { 
  STREAK_REWARD_TIERS, 
  STREAK_MILESTONES,
  isDoublePointsDay 
} from '@/config/streak';

import type { SubscriptionTier, PlatformCategory } from '@prisma/client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TrackerEntryForPoints {
  problemsSolved: number;
  easyProblems: number;
  mediumProblems: number;
  hardProblems: number;
  commits: number;
  pullRequests: number;
  pullRequestsMerged: number;
  issuesOpened: number;
  issuesClosed: number;
  codeReviews: number;
  linesOfCode: number;
  projectsStarted: number;
  projectsCompleted: number;
  coursesCompleted: number;
  certificationsEarned: number;
  applicationsSubmitted: number;
  contestsParticipated: number;
  hackathonsCompleted: number;
  timeSpent: number;
  category?: PlatformCategory | null;
  platform?: string;
  date?: Date;
}

export interface DailyStatsForPoints {
  totalProblems: number;
  totalCommits: number;
  totalPullRequests: number;
  totalTimeSpent: number;
  hadActivity: boolean;
  streakDay?: number;
}

export interface AchievementForPoints {
  id: string;
  points: number;
  xpReward: number;
  rarity: string;
  tier: string;
}

export interface PointsBreakdown {
  total: number;
  activity: {
    problems: number;
    commits: number;
    pullRequests: number;
    projects: number;
    courses: number;
    certifications: number;
    applications: number;
    contests: number;
    hackathons: number;
    timeBonus: number;
    total: number;
  };
  streak: {
    dailyBonus: number;
    milestoneBonus: number;
    total: number;
  };
  achievements: {
    count: number;
    points: number;
    xp: number;
    total: number;
  };
  multipliers: {
    subscription: number;
    doubleDay: number;
    effective: number;
  };
  history: {
    thisWeek: number;
    thisMonth: number;
    allTime: number;
  };
}

export interface PointsConfig {
  // Problem solving
  PROBLEM_SOLVED: number;
  EASY_PROBLEM: number;
  MEDIUM_PROBLEM: number;
  HARD_PROBLEM: number;
  
  // Development
  COMMIT: number;
  PULL_REQUEST: number;
  PR_MERGED: number;
  ISSUE_OPENED: number;
  ISSUE_CLOSED: number;
  CODE_REVIEW: number;
  LINES_OF_CODE: number;
  
  // Projects
  PROJECT_STARTED: number;
  PROJECT_COMPLETED: number;
  
  // Learning
  COURSE_COMPLETED: number;
  CERTIFICATION_EARNED: number;
  LESSON_COMPLETED: number;
  
  // Career
  APPLICATION_SUBMITTED: number;
  INTERVIEW_COMPLETED: number;
  
  // Competitions
  CONTEST_PARTICIPATED: number;
  HACKATHON_PARTICIPATED: number;
  HACKATHON_COMPLETED: number;
  HACKATHON_WON: number;
  
  // Time bonus
  TIME_BONUS_PER_HOUR: number;
  TIME_BONUS_MAX: number;
  
  // Streak
  STREAK_BASE: number;
  STREAK_MULTIPLIER: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Point values for different activities
 */
export const POINT_VALUES: PointsConfig = {
  // Problem solving
  PROBLEM_SOLVED: 10,
  EASY_PROBLEM: 5,
  MEDIUM_PROBLEM: 10,
  HARD_PROBLEM: 20,
  
  // Development
  COMMIT: 5,
  PULL_REQUEST: 15,
  PR_MERGED: 25,
  ISSUE_OPENED: 5,
  ISSUE_CLOSED: 10,
  CODE_REVIEW: 10,
  LINES_OF_CODE: 0.01, // Per line
  
  // Projects
  PROJECT_STARTED: 10,
  PROJECT_COMPLETED: 50,
  
  // Learning
  COURSE_COMPLETED: 100,
  CERTIFICATION_EARNED: 200,
  LESSON_COMPLETED: 5,
  
  // Career
  APPLICATION_SUBMITTED: 5,
  INTERVIEW_COMPLETED: 20,
  
  // Competitions
  CONTEST_PARTICIPATED: 25,
  HACKATHON_PARTICIPATED: 50,
  HACKATHON_COMPLETED: 100,
  HACKATHON_WON: 500,
  
  // Time bonus (per hour of focused coding)
  TIME_BONUS_PER_HOUR: 5,
  TIME_BONUS_MAX: 50, // Max per day
  
  // Streak
  STREAK_BASE: 5,
  STREAK_MULTIPLIER: 0.5, // Increases with streak length
};

/**
 * Achievement rarity point multipliers
 */
export const RARITY_MULTIPLIERS: Record<string, number> = {
  common: 1.0,
  uncommon: 1.5,
  rare: 2.0,
  epic: 3.0,
  legendary: 5.0,
};

/**
 * Category point bonuses
 */
export const CATEGORY_BONUSES: Record<PlatformCategory, number> = {
  DSA: 1.2,           // DSA valued higher
  JOB: 1.0,
  GIT: 1.1,
  LEARNING: 1.0,
  HACKATHON: 1.3,     // Hackathons valued higher
  OPENSOURCE: 1.2,    // Open source valued higher
  COMPANY: 1.0,
  DESIGN: 1.0,
  DATA_SCIENCE: 1.1,
  OTHER: 1.0,
};

/**
 * Subscription tier multipliers
 */
export const TIER_MULTIPLIERS: Record<SubscriptionTier, number> = {
  FREE: 1.0,
  STARTER: 1.1,
  PRO: 1.25,
  TEAM: 1.5,
  ENTERPRISE: 2.0,
};

// ============================================================================
// CORE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate total points for a user
 * 
 * @param userId - User ID
 * @returns Total points
 */
export async function calculateTotalPoints(userId: string): Promise<number> {
  try {
    const breakdown = await getPointsBreakdown(userId);
    return breakdown.total;
  } catch (error) {
    console.error('Error calculating total points:', error);
    return 0;
  }
}

/**
 * Calculate points for a single activity entry
 * 
 * @param entry - Tracker entry data
 * @returns Points earned
 */
export function calculateActivityPoints(entry: TrackerEntryForPoints): number {
  let points = 0;

  // Problem solving points
  if (entry.easyProblems > 0 || entry.mediumProblems > 0 || entry.hardProblems > 0) {
    points += entry.easyProblems * POINT_VALUES.EASY_PROBLEM;
    points += entry.mediumProblems * POINT_VALUES.MEDIUM_PROBLEM;
    points += entry.hardProblems * POINT_VALUES.HARD_PROBLEM;
  } else if (entry.problemsSolved > 0) {
    // Fallback if difficulty not specified
    points += entry.problemsSolved * POINT_VALUES.PROBLEM_SOLVED;
  }

  // Development points
  points += entry.commits * POINT_VALUES.COMMIT;
  points += entry.pullRequests * POINT_VALUES.PULL_REQUEST;
  points += entry.pullRequestsMerged * POINT_VALUES.PR_MERGED;
  points += entry.issuesOpened * POINT_VALUES.ISSUE_OPENED;
  points += entry.issuesClosed * POINT_VALUES.ISSUE_CLOSED;
  points += entry.codeReviews * POINT_VALUES.CODE_REVIEW;
  
  // Lines of code bonus (capped)
  const locBonus = Math.min(entry.linesOfCode * POINT_VALUES.LINES_OF_CODE, 50);
  points += Math.floor(locBonus);

  // Project points
  points += entry.projectsStarted * POINT_VALUES.PROJECT_STARTED;
  points += entry.projectsCompleted * POINT_VALUES.PROJECT_COMPLETED;

  // Learning points
  points += entry.coursesCompleted * POINT_VALUES.COURSE_COMPLETED;
  points += entry.certificationsEarned * POINT_VALUES.CERTIFICATION_EARNED;

  // Career points
  points += entry.applicationsSubmitted * POINT_VALUES.APPLICATION_SUBMITTED;

  // Competition points
  points += entry.contestsParticipated * POINT_VALUES.CONTEST_PARTICIPATED;
  points += entry.hackathonsCompleted * POINT_VALUES.HACKATHON_COMPLETED;

  // Time bonus (capped at TIME_BONUS_MAX per entry)
  const timeBonus = Math.min(
    Math.floor(entry.timeSpent / 60) * POINT_VALUES.TIME_BONUS_PER_HOUR,
    POINT_VALUES.TIME_BONUS_MAX
  );
  points += timeBonus;

  // Apply category bonus
  if (entry.category) {
    const categoryMultiplier = CATEGORY_BONUSES[entry.category] || 1.0;
    points = Math.floor(points * categoryMultiplier);
  }

  // Apply double points day bonus
  if (entry.date && isDoublePointsDay(entry.date)) {
    points *= 2;
  }

  return Math.floor(points);
}

/**
 * Calculate streak bonus points
 * 
 * @param streakDays - Current streak length in days
 * @returns Streak bonus points
 */
export function calculateStreakBonus(streakDays: number): number {
  if (streakDays <= 0) return 0;

  // Find the reward tier for current streak
  const tier = STREAK_REWARD_TIERS.find(
    t => streakDays >= t.minDays && streakDays <= t.maxDays
  ) || STREAK_REWARD_TIERS[0];

  // Base daily points with multiplier
  const dailyPoints = tier.dailyPoints * tier.multiplier;

  // Milestone bonus
  let milestoneBonus = 0;
  const milestone = STREAK_MILESTONES[streakDays];
  if (milestone) {
    milestoneBonus = milestone.points;
  }

  // Progressive streak bonus
  const progressiveBonus = Math.floor(
    POINT_VALUES.STREAK_BASE + 
    (streakDays * POINT_VALUES.STREAK_MULTIPLIER)
  );

  return Math.floor(dailyPoints + milestoneBonus + progressiveBonus);
}

/**
 * Calculate points from achievements
 * 
 * @param achievements - Array of user achievements
 * @returns Total achievement points
 */
export function calculateAchievementPoints(achievements: AchievementForPoints[]): number {
  if (!achievements || achievements.length === 0) return 0;

  return achievements.reduce((total, achievement) => {
    const rarityMultiplier = RARITY_MULTIPLIERS[achievement.rarity] || 1.0;
    const points = achievement.points * rarityMultiplier;
    return total + Math.floor(points);
  }, 0);
}

/**
 * Calculate daily points from daily stats
 * 
 * @param dailyStats - Daily statistics
 * @returns Daily points total
 */
export function calculateDailyPoints(dailyStats: DailyStatsForPoints): number {
  if (!dailyStats.hadActivity) return 0;

  let points = 0;

  // Activity points
  points += dailyStats.totalProblems * POINT_VALUES.PROBLEM_SOLVED;
  points += dailyStats.totalCommits * POINT_VALUES.COMMIT;
  points += dailyStats.totalPullRequests * POINT_VALUES.PULL_REQUEST;

  // Time bonus
  const timeBonus = Math.min(
    Math.floor(dailyStats.totalTimeSpent / 60) * POINT_VALUES.TIME_BONUS_PER_HOUR,
    POINT_VALUES.TIME_BONUS_MAX
  );
  points += timeBonus;

  // Streak bonus for the day
  if (dailyStats.streakDay && dailyStats.streakDay > 0) {
    points += calculateStreakBonus(dailyStats.streakDay);
  }

  return Math.floor(points);
}

/**
 * Get subscription tier multiplier
 * 
 * @param tier - Subscription tier
 * @returns Multiplier value
 */
export function getPointsMultiplier(tier: SubscriptionTier): number {
  return TIER_MULTIPLIERS[tier] || 1.0;
}

// ============================================================================
// DETAILED BREAKDOWN FUNCTIONS
// ============================================================================

/**
 * Get complete points breakdown for a user
 * 
 * @param userId - User ID
 * @returns Detailed points breakdown
 */
export async function getPointsBreakdown(userId: string): Promise<PointsBreakdown> {
  try {
    // Fetch all required data in parallel
    const [
      user,
      subscription,
      achievements,
      allTimeEntries,
      thisMonthEntries,
      thisWeekEntries,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          currentStreak: true,
          longestStreak: true,
          totalPoints: true,
        },
      }),
      prisma.subscription.findUnique({
        where: { userId },
        select: { tier: true },
      }),
      prisma.userAchievement.findMany({
        where: { userId },
        include: {
          achievement: {
            select: {
              id: true,
              points: true,
              xpReward: true,
              rarity: true,
              tier: true,
            },
          },
        },
      }),
      prisma.trackerEntry.findMany({
        where: { userId },
      }),
      prisma.trackerEntry.findMany({
        where: {
          userId,
          date: { gte: getStartOfMonth() },
        },
      }),
      prisma.trackerEntry.findMany({
        where: {
          userId,
          date: { gte: getStartOfWeek() },
        },
      }),
    ]);

    // Calculate activity points
    const activityBreakdown = calculateActivityBreakdown(allTimeEntries);

    // Calculate streak points
    const streakBreakdown = calculateStreakBreakdown(user?.currentStreak || 0);

    // Calculate achievement points
    const achievementList = achievements.map(a => ({
      id: a.achievement.id,
      points: a.achievement.points,
      xpReward: a.achievement.xpReward,
      rarity: a.achievement.rarity,
      tier: a.achievement.tier,
    }));
    const achievementBreakdown = calculateAchievementsBreakdown(achievementList);

    // Calculate multipliers
    const tier = subscription?.tier || 'FREE';
    const subscriptionMultiplier = getPointsMultiplier(tier);
    const isDoubleDay = isDoublePointsDay(new Date());
    const doubleDayMultiplier = isDoubleDay ? 2.0 : 1.0;
    const effectiveMultiplier = subscriptionMultiplier * doubleDayMultiplier;

    // Calculate period totals
    const thisWeekPoints = calculateEntriesPoints(thisWeekEntries);
    const thisMonthPoints = calculateEntriesPoints(thisMonthEntries);

    // Calculate total
    const baseTotal = 
      activityBreakdown.total + 
      streakBreakdown.total + 
      achievementBreakdown.total;
    
    const total = Math.floor(baseTotal * effectiveMultiplier);

    return {
      total,
      activity: activityBreakdown,
      streak: streakBreakdown,
      achievements: achievementBreakdown,
      multipliers: {
        subscription: subscriptionMultiplier,
        doubleDay: doubleDayMultiplier,
        effective: effectiveMultiplier,
      },
      history: {
        thisWeek: Math.floor(thisWeekPoints * effectiveMultiplier),
        thisMonth: Math.floor(thisMonthPoints * effectiveMultiplier),
        allTime: total,
      },
    };
  } catch (error) {
    console.error('Error getting points breakdown:', error);
    return getEmptyBreakdown();
  }
}

/**
 * Calculate activity points breakdown
 */
function calculateActivityBreakdown(entries: any[]): PointsBreakdown['activity'] {
  let problems = 0;
  let commits = 0;
  let pullRequests = 0;
  let projects = 0;
  let courses = 0;
  let certifications = 0;
  let applications = 0;
  let contests = 0;
  let hackathons = 0;
  let timeBonus = 0;

  for (const entry of entries) {
    // Problems
    if (entry.easyProblems || entry.mediumProblems || entry.hardProblems) {
      problems += entry.easyProblems * POINT_VALUES.EASY_PROBLEM;
      problems += entry.mediumProblems * POINT_VALUES.MEDIUM_PROBLEM;
      problems += entry.hardProblems * POINT_VALUES.HARD_PROBLEM;
    } else {
      problems += entry.problemsSolved * POINT_VALUES.PROBLEM_SOLVED;
    }

    // Development
    commits += entry.commits * POINT_VALUES.COMMIT;
    pullRequests += entry.pullRequests * POINT_VALUES.PULL_REQUEST;
    pullRequests += entry.pullRequestsMerged * POINT_VALUES.PR_MERGED;

    // Projects
    projects += entry.projectsStarted * POINT_VALUES.PROJECT_STARTED;
    projects += entry.projectsCompleted * POINT_VALUES.PROJECT_COMPLETED;

    // Learning
    courses += entry.coursesCompleted * POINT_VALUES.COURSE_COMPLETED;
    certifications += entry.certificationsEarned * POINT_VALUES.CERTIFICATION_EARNED;

    // Career
    applications += entry.applicationsSubmitted * POINT_VALUES.APPLICATION_SUBMITTED;

    // Competitions
    contests += entry.contestsParticipated * POINT_VALUES.CONTEST_PARTICIPATED;
    hackathons += entry.hackathonsCompleted * POINT_VALUES.HACKATHON_COMPLETED;

    // Time
    const entryTimeBonus = Math.min(
      Math.floor(entry.timeSpent / 60) * POINT_VALUES.TIME_BONUS_PER_HOUR,
      POINT_VALUES.TIME_BONUS_MAX
    );
    timeBonus += entryTimeBonus;
  }

  const total = problems + commits + pullRequests + projects + 
                courses + certifications + applications + 
                contests + hackathons + timeBonus;

  return {
    problems: Math.floor(problems),
    commits: Math.floor(commits),
    pullRequests: Math.floor(pullRequests),
    projects: Math.floor(projects),
    courses: Math.floor(courses),
    certifications: Math.floor(certifications),
    applications: Math.floor(applications),
    contests: Math.floor(contests),
    hackathons: Math.floor(hackathons),
    timeBonus: Math.floor(timeBonus),
    total: Math.floor(total),
  };
}

/**
 * Calculate streak points breakdown
 */
function calculateStreakBreakdown(currentStreak: number): PointsBreakdown['streak'] {
  const tier = STREAK_REWARD_TIERS.find(
    t => currentStreak >= t.minDays && currentStreak <= t.maxDays
  ) || STREAK_REWARD_TIERS[0];

  // Calculate cumulative daily bonus
  let dailyBonus = 0;
  for (let day = 1; day <= currentStreak; day++) {
    const dayTier = STREAK_REWARD_TIERS.find(
      t => day >= t.minDays && day <= t.maxDays
    ) || STREAK_REWARD_TIERS[0];
    dailyBonus += dayTier.dailyPoints;
  }

  // Calculate milestone bonuses
  let milestoneBonus = 0;
  for (const [days, config] of Object.entries(STREAK_MILESTONES)) {
    if (parseInt(days) <= currentStreak) {
      milestoneBonus += config.points;
    }
  }

  return {
    dailyBonus: Math.floor(dailyBonus),
    milestoneBonus: Math.floor(milestoneBonus),
    total: Math.floor(dailyBonus + milestoneBonus),
  };
}

/**
 * Calculate achievements points breakdown
 */
function calculateAchievementsBreakdown(
  achievements: AchievementForPoints[]
): PointsBreakdown['achievements'] {
  let points = 0;
  let xp = 0;

  for (const achievement of achievements) {
    const multiplier = RARITY_MULTIPLIERS[achievement.rarity] || 1.0;
    points += achievement.points * multiplier;
    xp += achievement.xpReward;
  }

  return {
    count: achievements.length,
    points: Math.floor(points),
    xp: Math.floor(xp),
    total: Math.floor(points),
  };
}

/**
 * Calculate total points from entries
 */
function calculateEntriesPoints(entries: any[]): number {
  return entries.reduce((total, entry) => {
    return total + calculateActivityPoints(entry as TrackerEntryForPoints);
  }, 0);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get empty breakdown structure
 */
function getEmptyBreakdown(): PointsBreakdown {
  return {
    total: 0,
    activity: {
      problems: 0,
      commits: 0,
      pullRequests: 0,
      projects: 0,
      courses: 0,
      certifications: 0,
      applications: 0,
      contests: 0,
      hackathons: 0,
      timeBonus: 0,
      total: 0,
    },
    streak: {
      dailyBonus: 0,
      milestoneBonus: 0,
      total: 0,
    },
    achievements: {
      count: 0,
      points: 0,
      xp: 0,
      total: 0,
    },
    multipliers: {
      subscription: 1.0,
      doubleDay: 1.0,
      effective: 1.0,
    },
    history: {
      thisWeek: 0,
      thisMonth: 0,
      allTime: 0,
    },
  };
}

/**
 * Get start of current week
 */
function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  return new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
}

/**
 * Get start of current month
 */
function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Update user's total points in database
 * 
 * @param userId - User ID
 * @returns Updated total points
 */
export async function updateUserPoints(userId: string): Promise<number> {
  const total = await calculateTotalPoints(userId);
  
  await prisma.user.update({
    where: { id: userId },
    data: { totalPoints: total },
  });

  return total;
}

/**
 * Award bonus points to user
 * 
 * @param userId - User ID
 * @param points - Points to add
 * @param reason - Reason for bonus
 * @returns New total points
 */
export async function awardBonusPoints(
  userId: string,
  points: number,
  reason?: string
): Promise<number> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      totalPoints: { increment: points },
    },
    select: { totalPoints: true },
  });

  console.log(`Awarded ${points} bonus points to user ${userId}. Reason: ${reason || 'N/A'}`);

  return user.totalPoints;
}

/**
 * Get points leaderboard data
 * 
 * @param limit - Number of users to return
 * @returns Top users by points
 */
export async function getPointsLeaderboard(limit: number = 100): Promise<Array<{
  userId: string;
  username: string | null;
  name: string | null;
  totalPoints: number;
  rank: number;
}>> {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      isPublic: true,
      showInLeaderboard: true,
    },
    orderBy: { totalPoints: 'desc' },
    take: limit,
    select: {
      id: true,
      username: true,
      name: true,
      totalPoints: true,
    },
  });

  return users.map((user, index) => ({
    userId: user.id,
    username: user.username,
    name: user.name,
    totalPoints: user.totalPoints,
    rank: index + 1,
  }));
}

// ============================================================================
// EXPORTS
// ============================================================================

const pointsCalculator = {
 // Core functions
  calculateTotalPoints,
  calculateActivityPoints,
  calculateStreakBonus,
  calculateAchievementPoints,
  calculateDailyPoints,
  getPointsBreakdown,
  getPointsMultiplier,
  
  // Utility functions
  updateUserPoints,
  awardBonusPoints,
  getPointsLeaderboard,
  
  // Constants
  POINT_VALUES,
  RARITY_MULTIPLIERS,
  CATEGORY_BONUSES,
  TIER_MULTIPLIERS,
};

export default pointsCalculator;