// ============================================================================
// FILE: app/(dashboard)/streak/page.tsx
// PURPOSE: Dedicated streak page showing all streak information
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. app/(dashboard)/dashboard/page.tsx - Dashboard page pattern
// 2. app/(dashboard)/analytics/page.tsx - Analytics page layout
// 3. app/(dashboard)/achievements/page.tsx - Achievements page layout
// 4. app/(dashboard)/goals/page.tsx - Goals page layout
// 5. components/streak/StreakCard.tsx - Streak card component
// 6. components/streak/StreakCalendar.tsx - Streak calendar
// 7. components/streak/StreakStats.tsx - Streak statistics
// 8. components/streak/StreakMilestone.tsx - Milestones display
// 9. components/streak/StreakHistory.tsx - Streak history
// 10. components/dashboard/StreakDisplay.tsx - Existing streak display
// 11. app/api/streak/route.ts - Streak API
// 12. services/streakService.ts - Streak service
// 13. types/streak.ts - Streak types
// -----------------------------------------------------------------------------

// PAGE STRUCTURE:
// - Header with current streak prominently displayed
// - Streak calendar (GitHub-style contribution graph)
// - Milestones section
// - Quick stats cards
// - Streak freeze management
// - Link to history page

// FEATURES:
// - Server component with initial data fetch
// - Client components for interactive elements
// - Metadata for SEO
