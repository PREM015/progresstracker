'use client';

import { OverviewStats } from '@/components/dashboard/OverviewStats';
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap';
import { RecentActivityList } from '@/components/dashboard/RecentActivityList';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { GoalsSummary } from '@/components/dashboard/GoalsSummary';
import { PlatformBreakdown } from '@/components/dashboard/PlatformBreakdown';
import { MetaTags } from '@/components/seo/MetaTags';
import { useStats } from '@/hooks/useStats';
import { useGoals } from '@/hooks/useGoals';
import { useTracker } from '@/hooks/useTracker';
import { useUser } from '@/hooks/useUser';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user } = useUser();
  const {
    streak,
    todayStats,
    weekStats,
    monthStats,
    dashboard,
    heatmap,
    isLoading: isLoadingStats
  } = useStats();

  const { activeGoals, isLoadingActive: isLoadingGoals } = useGoals();
  const { recentEntries, isLoadingRecent: isLoadingActivity } = useTracker();

  // Helper for loading state skeleton
  if (isLoadingStats || isLoadingGoals || isLoadingActivity) {
    return (
      <div className="space-y-6">
        <div className="h-20 w-1/3 bg-gray-100 rounded animate-pulse" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 w-full">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 rounded animate-pulse" />)}
        </div>
      </div>
    );
  }

  // Transform data for PlatformBreakdown
  // Assuming dashboard.platforms exists from hook
  const platformData = dashboard?.platforms
    ? [
      { name: 'Connected', value: dashboard.platforms.connected, color: '#4F46E5' },
      { name: 'Total', value: dashboard.platforms.total, color: '#E5E7EB' }
    ]
    : [];

  // Or if PlatformBreakdown expects a list of platforms and their problem counts,
  // we might need `overview` from useStats or map dashboard data differently.
  // For now, let's stick to simple connected vs total or similar if available, 
  // or pass empty if we don't have detailed breakdown in `dashboard` object.
  // Actually `dashboard.platforms` has `connected` and `total`. 
  // Let's create a visual breakdown if the component supports it.

  const formattedGoals = activeGoals.map(g => ({
    id: g.id,
    title: g.title,
    progress: g.progressInfo?.percentage || 0,
    daysLeft: g.deadline ? Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : undefined,
    target: g.targetValue,
    current: g.currentValue // assuming these exist on Goal
  }));

  const heatmapData = heatmap.reduce((acc, curr) => {
    acc[curr.date] = curr.level;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <MetaTags title="Dashboard" description="Your progress overview" />

      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {user?.name || 'Developer'}! Here's an overview of your progress.
          </p>
        </div>

        {/* Top Stats Row */}
        <OverviewStats
          totalSolved={dashboard?.achievements?.total || 0} // Using achievements total as proxy or 0 if not available
          streak={streak.current}
          monthlyGoalProgress={monthStats?.change || 0} // Using change as proxy or 0
          totalPoints={dashboard?.today?.points || 0}   // This might need total points from user profile actually
        />

        {/* Main Content Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Left Column (Heatmap & Activity) - Takes 4/7 width on large screens */}
          <div className="col-span-4 lg:col-span-4 space-y-4">
            <ActivityHeatmap activityData={heatmapData} />
            <RecentActivityList activities={recentEntries} />
          </div>

          {/* Right Column (Goals, Breakdown, Actions) - Takes 3/7 width on large screens */}
          <div className="col-span-4 lg:col-span-3 space-y-4">
            <QuickActions />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
              <GoalsSummary goals={formattedGoals} />
              <PlatformBreakdown data={platformData} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
