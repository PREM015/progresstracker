'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Target, TrendingUp, CalendarCheck, Award } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useStats, useMonthlyStats } from '@/hooks/useStats';
import { useUser } from '@/hooks/useUser';
import { useGoals } from '@/hooks/useGoals';
import Spinner from '@/components/ui/Spinner';
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { ProgressOverview } from '@/components/dashboard/ProgressOverview';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { GoalWidget } from '@/components/dashboard/GoalWidget';
import { PlatformBreakdown } from '@/components/dashboard/PlatformBreakdown';
import { TrendChart } from '@/components/dashboard/TrendChart';
import axios from 'axios';

export default function DashboardPage() {
  const { user } = useUser();
  const { stats, isLoading: statsLoading, refresh } = useStats(30);
  const { monthlyStats, isLoading: monthlyLoading } = useMonthlyStats(6);
  const { goals, isLoading: goalsLoading } = useGoals();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await axios.post('/api/sync');
      await refresh();
      toast({
        title: 'Sync completed',
        description: 'All platforms synced successfully',
        variant: 'success',
      });
    } catch (error) {
      toast({
      
        title: 'Sync failed',
        description: 'Failed to sync platforms. Please try again.',
        variant: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (statsLoading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  // Today's problems count
  const todayProblems = stats.recentActivity
    .filter((a) => new Date(a.date).toDateString() === new Date().toDateString())
    .reduce((sum, a) => sum + (a.problems || 0), 0);

  // Calculate weekly hours (placeholder - you can implement this in statsService)
  const weeklyHours = Math.round(stats.totalTime / 60 / 4); // Approximation

  return (
    <div className="space-y-10">
      {/* Welcome Banner */}
      <WelcomeBanner
        userName={user?.name?.split(' ')[0]}
        streak={stats.currentStreak}
        todayProblems={todayProblems}
      />

      {/* Quick Actions */}
      <QuickActions onSync={handleSync} isSyncing={isSyncing} />

      {/* Custom Metric Cards (Your Original Design) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={<Activity className="h-7 w-7 text-blue-600" />}
          title="Daily Activity"
          value={`${todayProblems} problems`}
          trend="+12%"
        />
        <MetricCard
          icon={<Target className="h-7 w-7 text-green-600" />}
          title="Goal Progress"
          value={`${goals && goals.length > 0 ? Math.round((goals[0].progress / goals[0].target) * 100) : 0}% done`}
          trend="+4%"
        />
        <MetricCard
          icon={<TrendingUp className="h-7 w-7 text-purple-600" />}
          title="Weekly Growth"
          value={`${weeklyHours} hrs`}
          trend="+9%"
        />
        <MetricCard
          icon={<CalendarCheck className="h-7 w-7 text-yellow-600" />}
          title="Current Streak"
          value={`${stats.currentStreak} days 🔥`}
          trend="+2 days"
        />
      </section>

      {/* Stats Cards (Phase 6 Component) */}
      <StatsCards
        stats={{
          totalProblems: stats.totalProblems,
          totalApplications: 0,
          totalCommits: 0,
          currentStreak: stats.currentStreak,
          problemsChange: 12,
          applicationsChange: 8,
          commitsChange: 15,
          streakChange: 2,
        }}
      />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Overview */}
          {!monthlyLoading && monthlyStats.length > 0 && <ProgressOverview data={monthlyStats} />}

          {/* Activity Heatmap */}
          {stats && (
            <ActivityHeatmap
              data={Array.from({ length: 365 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (364 - i));
                return { date: date.toISOString().split('T')[0], count: Math.floor(Math.random() * 10) };
              })}
            />
          )}

          {/* Recent Activity */}
          <RecentActivity activities={stats.recentActivity} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Goal Widget */}
          {!goalsLoading && <GoalWidget goals={goals || []} />}

          {/* Platform Breakdown */}
          {stats.platformStats.length > 0 && <PlatformBreakdown data={stats.platformStats} />}

          {/* Trend Chart */}
          <TrendChart
            data={monthlyStats.map((item) => ({
              date: new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
              problems: item.problems,
            }))}
            title="Monthly Trend"
          />
        </div>
      </div>

      {/* Achievements (Your Original Section) */}
      <section className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Award className="h-5 w-5 text-orange-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Achievements</h2>
        </div>

        <div className="flex flex-wrap gap-4">
          {['First Streak 🔥', 'Problem Solver 💡', 'Consistency King 👑'].map((title, idx) => (
            <AchievementBadge key={idx} title={title} />
          ))}
        </div>
      </section>
    </div>
  );
}

/* ---------------------- INTERNAL COMPONENTS ---------------------- */

function MetricCard({ icon, title, value, trend }: any) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 180 }}
      className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6 shadow-sm"
    >
      <div className="flex items-center gap-3">
        {icon}
        <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-3">{value}</p>
      <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">{trend}</p>
    </motion.div>
  );
}

function AchievementBadge({ title }: any) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-sm text-sm font-semibold"
    >
      {title}
    </motion.div>
  );
}