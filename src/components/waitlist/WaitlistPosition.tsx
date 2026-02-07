// ============================================================================
// FILE: components/waitlist/WaitlistPosition.tsx
// PURPOSE: Display user's position in waitlist
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. components/leaderboard/UserRankBadge.tsx - Rank/position display
// 2. components/leaderboard/LeaderboardCard.tsx - Position display
// 3. components/dashboard/StatsCards.tsx - Number display pattern
// 4. components/common/Badge.tsx - Badge component
// 5. app/(public)/waitlist/page.tsx - Waitlist page
// 6. app/api/waitlist/position/route.ts - Position API
// 7. services/waitlistService.ts - Waitlist service
// 8. types/waitlist.ts - Waitlist types
// -----------------------------------------------------------------------------

// PROPS TO IMPLEMENT:
// - position: number
// - totalWaiting: number
// - estimatedDate?: Date
// - showShareOption?: boolean
// - onShare?: () => void

// FEATURES:
// - Current position number
// - Total people in waitlist
// - Estimated invite date
// - Progress indicator
// - Share referral to move up
