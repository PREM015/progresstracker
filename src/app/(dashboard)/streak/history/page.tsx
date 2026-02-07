// ============================================================================
// FILE: app/(dashboard)/streak/history/page.tsx
// PURPOSE: Streak history page showing past streaks
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. app/(dashboard)/streak/page.tsx - Parent streak page
// 2. app/(dashboard)/tracker/history/page.tsx - History page pattern
// 3. app/(dashboard)/sync/history/page.tsx - Sync history page
// 4. app/(dashboard)/activity-log/page.tsx - Activity log page
// 5. components/streak/StreakHistory.tsx - Streak history component
// 6. components/common/Pagination.tsx - Pagination
// 7. components/common/DataTable.tsx - Table display
// 8. app/api/streak/history/route.ts - History API
// 9. services/streakHistoryService.ts - Streak history service
// 10. types/streak.ts - Streak history types
// 11. prisma/schema.prisma - StreakHistory model
// -----------------------------------------------------------------------------

// PAGE STRUCTURE:
// - Header with page title and stats summary
// - Filters (date range, sort order)
// - History list/table
// - Pagination
// - Export option

// FEATURES:
// - Server component for initial data
// - Filtering and sorting
// - Stats comparison across streaks
