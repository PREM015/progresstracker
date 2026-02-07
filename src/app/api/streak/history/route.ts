// ============================================================================
// FILE: app/api/streak/history/route.ts
// PURPOSE: Get user's streak history
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. app/api/streak/route.ts - Main streak endpoint
// 2. app/api/streak-history/route.ts - If exists, similar pattern
// 3. app/api/tracker/history/route.ts - History listing pattern
// 4. app/api/sync/history/route.ts - Similar history endpoint
// 5. app/api/leaderboard/history/route.ts - History with pagination
// 6. services/streakHistoryService.ts - Streak history service
// 7. services/streakService.ts - Streak service
// 8. types/streak.ts - Streak type definitions
// 9. prisma/schema.prisma - StreakHistory model
// 10. lib/apiHandler.ts - API handler with pagination
// -----------------------------------------------------------------------------

// METHODS TO IMPLEMENT:
// - GET: Get streak history with pagination

// QUERY PARAMS:
// - page: number
// - limit: number
// - sortBy: 'startDate' | 'length'
// - order: 'asc' | 'desc'

// IMPLEMENTATION NOTES:
// - Return all past streaks
// - Include current streak if active
// - Paginate results
// - Include stats (total streaks, average length, etc.)
