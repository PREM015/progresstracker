/**
 * Dashboard Components
 * 
 * A comprehensive collection of dashboard widgets and components
 * for the Progress Tracker application.
 * 
 * @module components/dashboard
 */

// ============================================================================
// CORE DASHBOARD COMPONENTS
// ============================================================================
export { DashboardOverview } from './DashboardOverview';
export { DashboardErrorBoundary } from './DashboardErrorBoundary';
export { WelcomeBanner } from './WelcomeBanner';

// ============================================================================
// STATISTICS & METRICS
// ============================================================================
export { StatsCards } from './StatsCards';
export type { StatsCardData } from './StatsCards';
export { OverviewStats } from './OverviewStats';
export { StreakDisplay } from './StreakDisplay';

// ============================================================================
// CHARTS & VISUALIZATIONS
// ============================================================================
export { ActivityChart } from './ActivityChart';
export { ActivityTrendChart } from './ActivityTrendChart';
export { ActivityHeatmap } from './ActivityHeatmap';
export { HeatmapCalendar } from './HeatmapCalendar';
export { DifficultyDistribution } from './DifficultyDistribution';
export { ContributionGraph } from './ContributionGraph';
export { SkillsRadarWidget } from './SkillsRadarWidget';

// ============================================================================
// ACTIVITY & TIMELINE
// ============================================================================
export { RecentActivity } from './RecentActivity';
export type { ActivityItem } from './RecentActivity';
export { RecentActivityList } from './RecentActivityList';

// ============================================================================
// PLATFORM COMPONENTS
// ============================================================================
export { PlatformSummary } from './PlatformSummary';
export { PlatformShowcase } from './PlatformShowcase';
export { PlatformBreakdown } from './PlatformBreakdown';
export { ConnectedPlatformsStats } from './ConnectedPlatformsStats';
export { SyncStatusWidget } from './SyncStatusWidget';

// ============================================================================
// GOALS & ACHIEVEMENTS
// ============================================================================
export { GoalsSummary } from './GoalsSummary';
export { AchievementsSummary } from './AchievementsSummary';
export { TodaysFocusWidget } from './TodaysFocusWidget';
export { UpcomingDeadlinesWidget } from './UpcomingDeadlinesWidget';

// ============================================================================
// PROGRESS TRACKING
// ============================================================================
export { WeeklyProgressWidget } from './WeeklyProgressWidget';

// ============================================================================
// SOCIAL & GAMIFICATION
// ============================================================================
export { LeaderboardWidget } from './LeaderboardWidget';

// ============================================================================
// ACTIONS & NAVIGATION
// ============================================================================
export { QuickActions } from './QuickActions';

// ============================================================================
// DASHBOARD PAGES & VIEWS
// ============================================================================
export { FavoritesPage } from './FavoritesPage';
export { SearchPage } from './SearchPage';
export { DailyStats } from './DailyStats';
export { ExportPage } from './ExportPage';
export * from './feedback';

// ============================================================================
// MOTIVATION & ENGAGEMENT
// ============================================================================
export { MotivationWidget } from './MotivationWidget';