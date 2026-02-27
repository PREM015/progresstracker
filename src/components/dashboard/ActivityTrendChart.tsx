/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUser } from '@/hooks/useUser';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface TrendDataPoint {
  date: string;
  problems: number;
  commits: number;
  timeSpent: number;
  points: number;
}

interface ActivityTrendChartProps {
  className?: string;
  timeRange?: '7d' | '30d' | '90d' | '1y';
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface TrendsResponse {
  data: TrendDataPoint[];
  summary: {
    totalProblems: number;
    totalCommits: number;
    totalTime: number;
    averageDaily: number;
    trend: number;
  };
}

type MetricType = 'problems' | 'commits' | 'timeSpent' | 'points';

const timeRangeConfig = {
  '7d': { label: '7 Days', days: 7 },
  '30d': { label: '30 Days', days: 30 },
  '90d': { label: '90 Days', days: 90 },
  '1y': { label: '1 Year', days: 365 },
};

export function ActivityTrendChart({
  className,
  timeRange = '30d'
}: ActivityTrendChartProps) {
  const { user } = useUser();
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userName = user?.name ? user.name.toUpperCase() : 'DEVELOPER';

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchTrends = async () => {
      try {
        const days = timeRangeConfig[timeRange].days;
        const res = await fetch(`/api/analytics/trends?days=${days}&metric=all&groupBy=day`);

        if (!res.ok) throw new Error('Failed to fetch trend data');

        const json = (await res.json()) as ApiSuccess<TrendsResponse>;

        if (!json?.success) throw new Error('Invalid response format');

        if (isMounted) {
          setData(json.data?.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch trend data:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load data');
          setData([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTrends();
    return () => { isMounted = false; };
  }, [timeRange]);

  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      contributions: (d.problems || 0) + (d.commits || 0)
    }));
  }, [data]);

  if (loading) {
    return (
      <div className={cn("glass-card p-8 animate-pulse", className)}>
        <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-6" />
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800/50 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("glass-card p-8", className)}>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Activity className="w-12 h-12 text-red-500/50 mb-4" />
          <p className="text-red-400 font-bold">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm font-bold hover:bg-red-500/20 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn("h-[400px] w-full", className)}
    >
      <div className="flex flex-col h-full glass-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
            <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">Activity Trend</h2>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{userName}&apos;s contributions</p>
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 p-4 sm:p-6 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <defs>
                <linearGradient id="gradient-contrib" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
              <XAxis
                dataKey="date"
                stroke="currentColor"
                strokeOpacity={0.15}
                tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 600, opacity: 0.5 }}
                tickFormatter={(val) => new Date(val).getDate().toString()}
                tickLine={false}
                axisLine={false}
                dy={10}
                minTickGap={15}
              />
              <YAxis
                stroke="currentColor"
                strokeOpacity={0.15}
                tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 600, opacity: 0.5 }}
                tickLine={false}
                axisLine={false}
                dx={-5}
                width={35}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-card, #fff)',
                  border: '1px solid var(--color-border, #e4e4e7)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  color: 'var(--color-foreground, #18181b)',
                  fontWeight: 'bold',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'var(--color-muted-foreground, #71717a)', marginBottom: '4px', fontWeight: 600 }}
                cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.3 }}
              />
              <Area
                type="monotone"
                dataKey="contributions"
                stroke="#6366f1"
                strokeWidth={2.5}
                fill="url(#gradient-contrib)"
                activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-card, #fff)', fill: '#6366f1' }}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

export default ActivityTrendChart;