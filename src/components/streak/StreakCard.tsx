// ============================================================================
// FILE: components/streak/StreakCard.tsx
// PURPOSE: Display current streak information in a card format
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. components/dashboard/StreakDisplay.tsx - Existing streak display component
// 2. components/dashboard/StatsCards.tsx - Card layout pattern
// 3. components/achievements/AchievementCard.tsx - Similar card component
// 4. components/goals/GoalCard.tsx - Similar card component
// 5. components/tracker/TrackerEntryCard.tsx - Card component pattern
// 6. components/common/Badge.tsx - Badge component for streak number
// 7. app/(dashboard)/dashboard/page.tsx - Dashboard using streak display
// 8. services/streakService.ts - Streak data service
// 9. types/streak.ts - Streak type definitions
// 10. lib/streak-utils.ts - Streak utilities
// -----------------------------------------------------------------------------

// PROPS TO IMPLEMENT:
// - currentStreak: number
// - longestStreak: number
// - isAtRisk?: boolean
// - lastActivityDate?: Date
// - nextMilestone?: number
// - showActions?: boolean
// - size?: 'sm' | 'md' | 'lg'

// FEATURES:
// - Fire/flame animation for active streaks
// - Warning indicator for at-risk streaks
// - Progress to next milestone
// - Quick freeze button
