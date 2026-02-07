// ============================================================================
// FILE: app/api/streak/route.ts
// PURPOSE: Main streak endpoint - get current streak info
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. app/api/user/streak/route.ts - User streak endpoint (if exists)
// 2. app/api/stats/streak/route.ts - Streak stats endpoint
// 3. app/api/tracker/streak/route.ts - Tracker streak data
// 4. app/api/analytics/streaks/route.ts - Streak analytics
// 5. services/streakService.ts - Streak calculation service
// 6. services/streakHistoryService.ts - Streak history service
// 7. lib/streak-utils.ts - Streak utility functions
// 8. types/streak.ts - Streak type definitions
// 9. config/streak.ts - Streak configuration (freeze limits, etc.)
// 10. prisma/schema.prisma - User (streak fields), StreakHistory model
// -----------------------------------------------------------------------------

// METHODS TO IMPLEMENT:
// - GET: Get current user's streak information

// RESPONSE STRUCTURE:
// {
//   currentStreak: number,
//   longestStreak: number,
//   streakStartDate: string,
//   lastActivityDate: string,
//   freezesAvailable: number,
//   freezesUsed: number,
//   isAtRisk: boolean,
//   nextMilestone: number
// }

// IMPLEMENTATION NOTES:
// - Requires authentication
// - Calculate if streak is at risk (no activity today)
// - Include freeze information
// - Calculate next milestone (7, 30, 100, 365 days)
