// ============================================================================
// FILE: components/streak/StreakMilestone.tsx
// PURPOSE: Display streak milestone achievements
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. components/achievements/AchievementBadge.tsx - Badge display pattern
// 2. components/achievements/AchievementUnlock.tsx - Unlock animation
// 3. components/achievements/AchievementProgress.tsx - Progress display
// 4. components/goals/GoalMilestones.tsx - Milestone display
// 5. components/goals/GoalProgress.tsx - Progress component
// 6. components/common/Badge.tsx - Badge component
// 7. types/streak.ts - Streak milestone types
// 8. config/streak.ts - Milestone definitions (7, 30, 100, 365 days)
// 9. services/achievementService.ts - Achievement unlocking
// -----------------------------------------------------------------------------

// PROPS TO IMPLEMENT:
// - currentStreak: number
// - milestones: Milestone[]
// - nextMilestone: Milestone
// - showAll?: boolean
// - onMilestoneClick?: (milestone: Milestone) => void

// FEATURES:
// - Show achieved milestones with badges
// - Progress bar to next milestone
// - Celebration animation on achievement
// - Milestone badges (7 days, 30 days, 100 days, 365 days)
