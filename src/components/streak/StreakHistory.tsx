// ============================================================================
// FILE: components/streak/StreakHistory.tsx
// PURPOSE: Display streak history list
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. components/tracker/TrackerEntryList.tsx - List component pattern
// 2. components/sync/SyncHistory.tsx - History list pattern
// 3. components/activity/Timeline.tsx - Timeline display
// 4. components/activity/ActivityFeed.tsx - Feed pattern
// 5. components/common/Pagination.tsx - Pagination component
// 6. components/common/DataTable.tsx - Table display
// 7. app/(dashboard)/streak/history/page.tsx - History page
// 8. app/api/streak/history/route.ts - History API
// 9. services/streakHistoryService.ts - Streak history service
// 10. types/streak.ts - Streak history types
// 11. prisma/schema.prisma - StreakHistory model
// -----------------------------------------------------------------------------

// PROPS TO IMPLEMENT:
// - history: StreakHistoryEntry[]
// - isLoading?: boolean
// - onLoadMore?: () => void
// - hasMore?: boolean
// - showStats?: boolean

// FEATURES:
// - List of past streaks with dates and length
// - Show how streak ended (broken, natural end)
// - Statistics summary
// - Pagination/infinite scroll
// - Empty state
