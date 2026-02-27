'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Activity, GitCommit, Clock, Trophy } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

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
        mostActiveDay: 'N/A',
        topPlatform,
        weeklyGrowth: 0,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <GlassCard className="p-12 text-center flex flex-col items-center gap-4">
        <Activity className="w-12 h-12 text-zinc-200 dark:text-zinc-800" />
        <div>
          <h4 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tighter uppercase">No data points</h4>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-2">Start your journey to see progress</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="mt-4 h-10 px-6 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
        >
          Force Sync
        </button>
      </GlassCard>
    );
  }

  return (
    <div className={cn("space-y-8", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tighter">Performance Flow</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-1">Holistic Metrics</p>
        </div>
        <Tabs value={selectedRange} onValueChange={(v) => setSelectedRange(v as any)} className="w-auto">
          <TabsList className="bg-zinc-100 dark:bg-zinc-800/50 border-none h-11 p-1 rounded-xl">
            <TabsTrigger value="7d" className="text-[10px] font-black uppercase tracking-widest px-4 h-9 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-600 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white transition-all">7 Days</TabsTrigger>
            <TabsTrigger value="30d" className="text-[10px] font-black uppercase tracking-widest px-4 h-9 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-600 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white transition-all">30 Days</TabsTrigger>
            <TabsTrigger value="90d" className="text-[10px] font-black uppercase tracking-widest px-4 h-9 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-600 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white transition-all">3 Months</TabsTrigger>
            <TabsTrigger value="all" className="text-[10px] font-black uppercase tracking-widest px-4 h-9 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-600 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white transition-all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Solved" value={analytics.totalProblems.toLocaleString()} icon={Activity} color="emerald" />
        <StatCard label="Commits" value={analytics.totalCommits.toLocaleString()} icon={GitCommit} color="blue" />
        <StatCard label="Effort" value={`${Math.floor(analytics.totalTimeSpent / 60)}h`} icon={Clock} color="amber" />
        <StatCard label="Points" value={analytics.totalPoints.toLocaleString()} icon={Trophy} color="indigo" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DetailCard
          label="Daily Velocity"
          value={analytics.averagePerDay.toFixed(1)}
          subtitle="problems / session"
        />
        <DetailCard
          label="Dominant Platform"
          value={analytics.topPlatform}
          subtitle="by contribution frequency"
        />
        <DetailCard
          label="Growth Index"
          value={`${analytics.weeklyGrowth}%`}
          subtitle="period over period"
          trend={analytics.weeklyGrowth}
        />
      </div>
    </div>
  );
};

function StatCard({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: string }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-500 bg-emerald-500/10",
    blue: "text-blue-500 bg-blue-500/10",
    amber: "text-amber-500 bg-amber-500/10",
    indigo: "text-indigo-500 bg-indigo-500/10"
  };

  return (
    <GlassCard className="p-6 group hover:scale-[1.02] transition-all cursor-default">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2 rounded-lg transition-colors", colorMap[color] || "text-zinc-400 bg-zinc-400/10")}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="h-6 w-6 rounded-full bg-zinc-50 dark:bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight className="w-3 h-3 text-zinc-400" />
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{label}</p>
        <div className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tighter mt-1">{value}</div>
      </div>
    </GlassCard>
  );
}

function DetailCard({ label, value, subtitle, trend }: { label: string, value: string, subtitle: string, trend?: number }) {
  return (
    <GlassCard className="p-6 bg-zinc-100/30 dark:bg-white/[0.02]">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">{label}</p>
      <div className="flex items-center gap-4">
        <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{value}</span>
        {trend !== undefined && (
          <span className={cn(
            "flex items-center text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
            trend >= 0
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-red-500/10 text-red-500"
          )}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mt-2 uppercase tracking-wider">{subtitle}</p>
    </GlassCard>
  );
}

export default AnalyticsDashboard;
