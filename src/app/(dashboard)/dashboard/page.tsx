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
  StreakDisplay,
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
  ConnectedPlatformsStats,
} from '@/components/dashboard';
import { Skeleton } from '@/components/ui/skeleton';

// ---------------------------------------------------------------------------
// Stagger animation variants
// ---------------------------------------------------------------------------
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
} satisfies import('framer-motion').Variants;

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in">
      <Skeleton className="h-28 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-32 rounded-xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-52 rounded-xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5" />
        ))}
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
        className="p-8 text-center rounded-2xl bg-red-50 dark:bg-red-500/[0.06] border border-red-200 dark:border-red-500/20"
      >
        <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <Zap className="w-6 h-6 text-red-500" />
        </div>
        <p className="font-bold text-zinc-900 dark:text-white text-lg">Connection Lost</p>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-2 max-w-md mx-auto">
          {error.message || 'Failed to load dashboard data.'}
        </p>
        <button onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2.5 bg-red-100 hover:bg-red-200 dark:bg-red-500/10 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-widest transition-all">
          Retry Connection
        </button>
      </motion.div>
    );
  }

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  const d = data;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

      {/* Welcome Banner */}
      <motion.div variants={itemVariants}>
        <WelcomeBanner userName={d.user?.name || authUser?.name || 'Developer'} />
      </motion.div>

      {/* Overview Stats - 4 cards grid */}
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

      {/* ★ Connected Platforms — Real synced data per platform */}
      <motion.div variants={itemVariants}>
        <ConnectedPlatformsStats />
      </motion.div>

      {/* Streak + Quick Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <StreakDisplay
            currentStreak={d.user?.streak?.current ?? 0}
            longestStreak={d.user?.streak?.longest ?? 0}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <QuickActions />
        </motion.div>
      </div>

      {/* Contribution Graph - Full Width */}
      <motion.div variants={itemVariants}>
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl bg-zinc-100 dark:bg-zinc-900/50" />}>
          <ContributionGraph />
        </Suspense>
      </motion.div>

      {/* Main Grid - 3 Column Layout on desktop, 1 col on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={itemVariants}>
            <ActivityTrendChart />
          </motion.div>

          {/* Two Column Sub-grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <motion.div variants={itemVariants}>
              <PlatformBreakdown />
            </motion.div>
            <motion.div variants={itemVariants}>
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
            <Suspense fallback={<Skeleton className="h-64 rounded-xl bg-zinc-100 dark:bg-zinc-900/50" />}>
              <WeeklyProgressWidget />
            </Suspense>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Suspense fallback={<Skeleton className="h-80 rounded-xl bg-zinc-100 dark:bg-zinc-900/50" />}>
              <SkillsRadarWidget />
            </Suspense>
          </motion.div>

          {/* Moved from right column to balance height */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <motion.div variants={itemVariants}>
              <Suspense fallback={<Skeleton className="h-80 rounded-xl bg-zinc-100 dark:bg-zinc-900/50" />}>
                <LeaderboardWidget />
              </Suspense>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Suspense fallback={<Skeleton className="h-48 rounded-xl bg-zinc-100 dark:bg-zinc-900/50" />}>
                <MotivationWidget />
              </Suspense>
            </motion.div>
          </div>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          <motion.div variants={itemVariants}>
            <SyncStatusWidget />
          </motion.div>

          <motion.div variants={itemVariants}>
            <Suspense fallback={<Skeleton className="h-80 rounded-xl bg-zinc-100 dark:bg-zinc-900/50" />}>
              <TodaysFocusWidget />
            </Suspense>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Suspense fallback={<Skeleton className="h-80 rounded-xl bg-zinc-100 dark:bg-zinc-900/50" />}>
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
            <Suspense fallback={<Skeleton className="h-64 rounded-xl bg-zinc-100 dark:bg-zinc-900/50" />}>
              <AchievementsSummary />
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
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white p-3 sm:p-4 md:p-6 lg:p-8">
      <DashboardErrorBoundary>
        <DashboardContent />
      </DashboardErrorBoundary>
    </div>
  );
}