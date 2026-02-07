// ============================================================================
// FILE: components/streak/StreakCalendar.tsx
// PURPOSE: Calendar view showing streak activity
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. components/dashboard/HeatmapCalendar.tsx - Heatmap calendar component
// 2. components/tracker/TrackerCalendar.tsx - Tracker calendar view
// 3. components/charts/HeatmapChart.tsx - Heatmap chart component
// 4. app/(dashboard)/tracker/calendar/page.tsx - Calendar page
// 5. app/(dashboard)/analytics/heatmap/page.tsx - Heatmap page
// 6. services/streakHistoryService.ts - Streak history data
// 7. services/trackerService.ts - Activity data for calendar
// 8. types/streak.ts - Streak type definitions
// 9. types/tracker.ts - Tracker entry types
// 10. lib/date.ts - Date utilities
// -----------------------------------------------------------------------------

// PROPS TO IMPLEMENT:
// - streakData: StreakCalendarData[]
// - year?: number
// - onDateClick?: (date: Date) => void
// - showTooltips?: boolean
// - colorScheme?: 'green' | 'blue' | 'fire'

// FEATURES:
// - GitHub-style contribution calendar
// - Highlight streak days
// - Show freeze days differently
// - Tooltip with day details
// - Navigate between years
