'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Activity, GitCommit, Clock, Trophy } from 'lucide-react';

interface Analytics {
  totalProblems: number;
  totalCommits: number;
  totalTimeSpent: number;
  totalPoints: number;
  averagePerDay: number;
  mostActiveDay: string;
  topPlatform: string;
  weeklyGrowth: number;
}

interface AnalyticsDashboardProps {
  userId: string;
  timeRange?: '7d' | '30d' | '90d' | 'all';
  className?: string;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface AnalyticsResponse {
  overview: {
    totalProblems: number;
    totalCommits: number;
    totalTimeSpent: number;
    totalPoints: number;
    avgProblemsPerDay: number;
  };
  platforms?: Array<{
    platformName: string;
    problems: number;
  }> | null;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  userId,
  timeRange = '30d',
  className = '',
}) => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState(timeRange);

  useEffect(() => {
    fetchAnalytics();
  }, [userId, selectedRange]);

  const rangeToDays = (range: '7d' | '30d' | '90d' | 'all') => {
    if (range === '7d') return 7;
    if (range === '90d') return 90;
    if (range === 'all') return 365;
    return 30;
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const days = rangeToDays(selectedRange);
      const res = await fetch(`/api/analytics?days=${days}&includePlatforms=true`);
      const json = (await res.json()) as ApiSuccess<AnalyticsResponse>;
      if (!res.ok || !json?.success) throw new Error('Failed to fetch analytics');

      const overview = json.data?.overview;
      const topPlatform = json.data?.platforms?.[0]?.platformName || 'None';

      const mapped: Analytics = {
        totalProblems: overview?.totalProblems || 0,
        totalCommits: overview?.totalCommits || 0,
        totalTimeSpent: overview?.totalTimeSpent || 0,
        totalPoints: overview?.totalPoints || 0,
        averagePerDay: overview?.avgProblemsPerDay || 0,
        mostActiveDay: 'N/A', // Endpoint doesn't provide this yet
        topPlatform,
        weeklyGrowth: 0, // Endpoint needs to provide comparison data for true growth
      };

      setAnalytics(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="h-10 w-64 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600 mb-3">{error || 'No analytics data available'}</p>
        <button
          onClick={fetchAnalytics}
          className="text-xs font-medium text-red-700 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Performance Overview</h2>
        <Tabs value={selectedRange} onValueChange={(v) => setSelectedRange(v as any)} className="w-auto">
          <TabsList className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 h-9 p-1">
            <TabsTrigger value="7d" className="text-xs px-3 h-7 data-[state=active]:bg-white data-[state=active]:shadow-sm">7 Days</TabsTrigger>
            <TabsTrigger value="30d" className="text-xs px-3 h-7 data-[state=active]:bg-white data-[state=active]:shadow-sm">30 Days</TabsTrigger>
            <TabsTrigger value="90d" className="text-xs px-3 h-7 data-[state=active]:bg-white data-[state=active]:shadow-sm">3 Months</TabsTrigger>
            <TabsTrigger value="all" className="text-xs px-3 h-7 data-[state=active]:bg-white data-[state=active]:shadow-sm">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Problems Solved" value={analytics.totalProblems.toLocaleString()} icon={Activity} />
        <StatCard label="Total Commits" value={analytics.totalCommits.toLocaleString()} icon={GitCommit} />
        <StatCard label="Time Spent" value={`${Math.floor(analytics.totalTimeSpent / 60)}h`} icon={Clock} />
        <StatCard label="Total Points" value={analytics.totalPoints.toLocaleString()} icon={Trophy} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DetailCard
          label="Daily Average"
          value={analytics.averagePerDay.toFixed(1)}
          subtitle="problems / day"
        />
        <DetailCard
          label="Top Platform"
          value={analytics.topPlatform}
          subtitle="by activity volume"
        />
        <DetailCard
          label="Growth Trend"
          value={`${analytics.weeklyGrowth}%`}
          subtitle="vs previous period"
          trend={analytics.weeklyGrowth}
        />
      </div>
    </div>
  );
};

function StatCard({ label, value, icon: Icon }: { label: string, value: string, icon: any }) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
          <Icon className="w-4 h-4 text-zinc-400 dark:text-zinc-600" />
        </div>
        <div className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function DetailCard({ label, value, subtitle, trend }: { label: string, value: string, subtitle: string, trend?: number }) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 shadow-none">
      <CardContent className="p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-500 mb-2">{label}</p>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</span>
          {trend !== undefined && (
            <span className={cn(
              "flex items-center text-xs font-medium px-2 py-0.5 rounded-full",
              trend >= 0
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
            )}>
              {trend >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export default AnalyticsDashboard;
