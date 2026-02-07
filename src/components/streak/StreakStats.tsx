// ============================================================================
// FILE: components/streak/StreakStats.tsx
// PURPOSE: Display detailed streak statistics
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. components/dashboard/StatsCards.tsx - Stats display pattern
// 2. components/analytics/OverviewStats.tsx - Overview stats component
// 3. components/tracker/TrackerStats.tsx - Tracker statistics
// 4. components/goals/GoalStats.tsx - Goal statistics
// 5. components/profile/ProfileStats.tsx - Profile stats display
// 6. app/(dashboard)/analytics/page.tsx - Analytics page layout
// 7. app/api/streak/route.ts - Streak stats API
// 8. services/streakService.ts - Streak statistics
// 9. services/statsService.ts - Stats service
// 10. types/streak.ts - Streak stats types
// -----------------------------------------------------------------------------

// PROPS TO IMPLEMENT:
// - stats: StreakStatsData
// - showChart?: boolean
// - period?: 'all' | 'year' | 'month'
// - isLoading?: boolean

// FEATURES:
// - Current streak, longest streak, total streaks
// - Average streak length
// - Total days active
// - Streak chart over time
// - Comparison with previous periods
