'use client';

import { Suspense } from 'react';
import { useAnalyticsDashboard } from '@/hooks/useAnalyticsDashboard';
import { useUser } from '@/hooks/useUser';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

import {
  DashboardErrorBoundary,
  WelcomeBanner,
  OverviewStats,
  ContributionGraph,
  ActivityTrendChart,
  WeeklyProgressWidget,
  TodaysFocusWidget,
  UpcomingDeadlinesWidget,
  PlatformBreakdown,
  SkillsRadarWidget,
  GoalsSummary,
  AchievementsSummary,
  RecentActivityList,
  LeaderboardWidget,
  SyncStatusWidget,
  QuickActions,
  MotivationWidget,
  DifficultyDistribution,
} from '@/components/dashboard';
import { Skeleton } from '@/components/ui/skeleton';

// ---------------------------------------------------------------------------
// Stagger animation variants
// ---------------------------------------------------------------------------
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
} satisfies import('framer-motion').Variants;

// ---------------------------------------------------------------------------
// Loading skeleton (dark themed)
// ---------------------------------------------------------------------------
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in">
      <Skeleton className="h-32 w-full rounded-2xl bg-zinc-900/50 border border-white/5" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-32 rounded-xl bg-zinc-900/50 border border-white/5" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl bg-zinc-900/50 border border-white/5" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-96 rounded-xl bg-zinc-900/50 border border-white/5" />
        <Skeleton className="h-96 rounded-xl bg-zinc-900/50 border border-white/5" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard content
// ---------------------------------------------------------------------------
function DashboardContent() {
  const { user: authUser } = useUser();
  const { data, isLoading, error } = useAnalyticsDashboard();

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="p-8 text-center rounded-2xl bg-red-500/[0.06] border border-red-500/20"
      >
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <Zap className="w-6 h-6 text-red-500" />
        </div>
        <p className="font-bold text-white text-lg">Connection Lost</p>
        <p className="text-zinc-400 text-sm mt-2 max-w-md mx-auto">
          {error.message || 'Failed to load dashboard data. Check your connection and try again.'}
        </p>
        <button onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold uppercase tracking-widest transition-all">
          Retry Connection
        </button>
      </motion.div>
    );
  }

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  const user = data.user || authUser;
  const d = data;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

      {/* Welcome Section */}
      <motion.div variants={itemVariants}>
        <Suspense fallback={<Skeleton className="h-32 w-full rounded-2xl" />}>
          <WelcomeBanner userName={user?.name || 'Developer'} />
        </Suspense>
      </motion.div>

      {/* Overview Stats */}
      <motion.div variants={itemVariants}>
        <OverviewStats
          totalSolved={d.user?.totals?.problems ?? 0}
          streak={d.user?.streak?.current ?? 0}
          streakLongest={d.user?.streak?.longest ?? 0}
          monthlyGoalProgress={d.stats?.month?.problems ?? 0}
          totalPoints={d.user?.totals?.points ?? 0}
          totalSolvedTrend={0}
          pointsTrend={0}
        />
      </motion.div>

      {/* Contribution Graph - Full Width */}
      <motion.div variants={itemVariants}>
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <ContributionGraph />
        </Suspense>
      </motion.div>

      {/* Main Grid - 3 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={itemVariants} className="h-full">
            <ActivityTrendChart />
          </motion.div>

          {/* Two Column Sub-grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={itemVariants} className="h-full">
              <PlatformBreakdown />
            </motion.div>
            <motion.div variants={itemVariants} className="h-full">
              <DifficultyDistribution
                data={{
                  easy: (d.categories ?? []).find((c: any) => c.name === 'Easy')?.count ?? 0,
                  medium: (d.categories ?? []).find((c: any) => c.name === 'Medium')?.count ?? 0,
                  hard: (d.categories ?? []).find((c: any) => c.name === 'Hard')?.count ?? 0,
                }}
              />
            </motion.div>
          </div>

          <motion.div variants={itemVariants}>
            <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
              <WeeklyProgressWidget />
            </Suspense>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Suspense fallback={<Skeleton className="h-80 rounded-xl" />}>
              <SkillsRadarWidget />
            </Suspense>
          </motion.div>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          <motion.div variants={itemVariants}>
            <SyncStatusWidget />
          </motion.div>

          <motion.div variants={itemVariants}>
            <QuickActions />
          </motion.div>

          <motion.div variants={itemVariants}>
            <Suspense fallback={<Skeleton className="h-80 rounded-xl" />}>
              <TodaysFocusWidget />
            </Suspense>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Suspense fallback={<Skeleton className="h-80 rounded-xl" />}>
              <UpcomingDeadlinesWidget />
            </Suspense>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GoalsSummary
              goals={(d.goals ?? []).map((g: any) => ({
                id: g.id,
                title: g.title,
                current: g.progress,
                target: g.target,
                dueDate: g.deadline ? new Date(g.deadline).toLocaleDateString() : 'No deadline'
              }))}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
              <AchievementsSummary />
            </Suspense>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Suspense fallback={<Skeleton className="h-80 rounded-xl" />}>
              <LeaderboardWidget />
            </Suspense>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
              <MotivationWidget />
            </Suspense>
          </motion.div>
        </div>
      </div>

      {/* Recent Activity - Full Width */}
      <motion.div variants={itemVariants}>
        <RecentActivityList
          activities={(d.activity ?? [])
            .filter((entry: any) => (entry.problems || 0) > 0 || (entry.commits || 0) > 0)
            .map((entry: any) => ({
              id: entry.id,
              type: (entry.problems ?? 0) > 0 ? 'solve' as const : 'post' as const,
              title: (entry.problems ?? 0) > 0 ? `Solved ${entry.problems} Problems` : `Committed ${entry.commits} times`,
              description: entry.platform || 'General Activity',
              timestamp: new Date(entry.date),
              platform: entry.platform,
              points: entry.pointsEarned || 0
            }))}
        />
      </motion.div>

      {/* Footer spacing */}
      <div className="h-8" />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page export with error boundary
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white p-6 lg:p-8">
      <DashboardErrorBoundary>
        <DashboardContent />
      </DashboardErrorBoundary>
    </div>
  );
}