
import { OverviewStats } from '@/components/dashboard/OverviewStats';
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap';
import { RecentActivityList } from '@/components/dashboard/RecentActivityList';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { GoalsSummary } from '@/components/dashboard/GoalsSummary';
import { PlatformBreakdown } from '@/components/dashboard/PlatformBreakdown';
import { MetaTags } from '@/components/seo/MetaTags';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';

export default function DashboardPage() {
  // Real usage: Fetch data here via Server Components or Client Hooks
  // For now, we pass undefined/empty to show the "No Data" states as requested.
  // In Phase 4+, we will wire this up to the DB.

  return (
    <DashboardLayout>
      <MetaTags title="Dashboard" description="Your progress overview" />

      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your progress.
          </p>
        </div>

        {/* Top Stats Row */}
        <OverviewStats
          totalSolved={0}
          streak={0}
          monthlyGoalProgress={0}
          totalPoints={0}
        />

        {/* Main Content Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Left Column (Heatmap & Activity) - Takes 4/7 width on large screens */}
          <div className="col-span-4 lg:col-span-4 space-y-4">
            <ActivityHeatmap activityData={{}} />
            <RecentActivityList activities={[]} />
          </div>

          {/* Right Column (Goals, Breakdown, Actions) - Takes 3/7 width on large screens */}
          <div className="col-span-4 lg:col-span-3 space-y-4">
            <QuickActions />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
              <GoalsSummary goals={[]} />
              <PlatformBreakdown data={[]} />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
