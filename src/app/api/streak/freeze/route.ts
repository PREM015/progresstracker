// ============================================================================
// FILE: app/api/streak/freeze/route.ts
// PURPOSE: Use streak freeze to protect streak
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. app/api/streak/route.ts - Main streak endpoint
// 2. app/api/user/streak/route.ts - User streak operations
// 3. services/streakService.ts - Streak service with freeze logic
// 4. services/streakHistoryService.ts - Streak history tracking
// 5. lib/streak-utils.ts - Streak utility functions
// 6. types/streak.ts - Streak type definitions
// 7. config/streak.ts - Streak configuration (max freezes, etc.)
// 8. prisma/schema.prisma - User model (streakFreezeCount, streakFreezeUsedAt)
// 9. app/api/notifications/route.ts - Notification pattern (for freeze alerts)
// -----------------------------------------------------------------------------

// METHODS TO IMPLEMENT:
// - POST: Use a streak freeze
// - GET: Get freeze status and availability

// POST REQUEST BODY:
// { reason?: string }

// IMPLEMENTATION NOTES:
// - Check if user has freezes available (based on subscription tier)
// - Check if freeze was already used today
// - Update streakFreezeUsedAt timestamp
// - Decrement available freezes
// - Create notification about freeze usage
// - Return updated streak info
