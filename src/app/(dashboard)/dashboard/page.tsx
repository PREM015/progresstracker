'use client';

import { OverviewStats } from '@/components/dashboard/OverviewStats';
import { ConnectedPlatformsStats } from '@/components/dashboard/ConnectedPlatformsStats';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BentoGrid } from '@/components/ui/BentoGrid';
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap';
import { RecentActivityList } from '@/components/dashboard/RecentActivityList';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { GoalsSummary } from '@/components/dashboard/GoalsSummary';
import { DifficultyDistribution } from '@/components/dashboard/DifficultyDistribution';
import { PlatformBreakdown } from '@/components/dashboard/PlatformBreakdown';
import { MetaTags } from '@/components/seo/MetaTags';
import { ActivityTrendChart } from '@/components/dashboard/ActivityTrendChart';
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
    overview,
    trends,
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
  // Use overview.platforms for detailed activity breakdown, fallback to empty
  const platformData = overview?.platforms?.length
    ? overview.platforms.map((p, i) => ({
      name: p.name,
      value: p.problems + p.commits, // Combine metrics for general activity
      color: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][i % 5]
    }))
    : [];

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
          totalSolved={dashboard?.lifetime?.problems || 0}
          streak={streak.current}
          streakLongest={streak.longest}
          monthlyGoalProgress={monthStats?.change || 0}
          totalPoints={dashboard?.lifetime?.points || 0}
          totalSolvedTrend={monthStats?.change}
          pointsTrend={dashboard?.thisMonth?.change}
        />

        {/* Dense Bento Grid Layout */}
        <BentoGrid className="max-w-full auto-rows-[minmax(12rem,auto)]">
          {/* Heatmap: Prominent, spans 2 cols */}
          <ActivityHeatmap
            activityData={heatmap.reduce((acc, curr) => ({ ...acc, [curr.date]: curr.count }), {})}
            className="md:col-span-2 min-h-[14rem]"
          />



          {/* Difficulty Breakdown: 1 col */}
          <DifficultyDistribution
            data={dashboard?.lifetime?.difficulty}
            className="md:col-span-1 min-h-[14rem]"
          />

          {/* Activity Trend Chart: Spans 2 cols */}
          <ActivityTrendChart
            data={trends?.trend || []}
            className="md:col-span-2 min-h-[14rem]"
            loading={isLoadingStats}
          />

          {/* Connected Platforms Detail: Full width or large span */}
          <div className="md:col-span-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">My Platforms</h3>
              <Link href="/platforms" className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">Manage Connections &rarr;</Link>
            </div>
            <ConnectedPlatformsStats
              platforms={dashboard?.platforms?.connectedPlatforms?.map(p => ({
                ...p,
                lastSyncedAt: p.lastSyncedAt ? p.lastSyncedAt.toString() : null
              }))}
            />
          </div>

          {/* Recent Activity: Tall list, spans 2 cols */}
          <RecentActivityList
            activities={recentEntries.map(entry => ({
              id: entry.id,
              type: entry.problemsSolved > 0 ? 'solve' : entry.commits > 0 ? 'post' : 'achievement',
              title: entry.problemsSolved > 0 ? `Solved ${entry.problemsSolved} Problems` : 'Activity',
              description: entry.platform?.name || 'General Activity',
              timestamp: new Date(entry.date),
              platform: entry.platform?.name,
              points: entry.points
            }))}
            className="md:col-span-2 min-h-[24rem]"
          />

          {/* Right Column Stack */}
          <div className="md:col-span-1 space-y-4">
            {/* Quick Actions */}
            <QuickActions />

            {/* Goals */}
            <GoalsSummary
              goals={activeGoals.map((g: any) => ({
                id: g.id,
                title: g.title,
                current: g.progress,
                target: g.target,
                dueDate: g.deadline ? new Date(g.deadline).toLocaleDateString() : 'No deadline'
              }))}
            />

            {/* Platform Activity Breakdown */}
            <PlatformBreakdown
              data={platformData.map(p => ({
                platform: p.name,
                count: p.value,
                color: p.color
              }))}
            />
          </div>
        </BentoGrid>
      </div>
    </>
  );
}
