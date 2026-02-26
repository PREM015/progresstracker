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
      <div className="flex flex-col h-full rounded-2xl bg-[#13161f] border border-[#2a2f42] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-[#1a1f2e]">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-black text-white tracking-wide">Contribution Activity</h2>
        </div>

        {/* Chart Area */}
        <div className="flex-1 p-6 relative flex flex-col pt-8">
          <h3 className="text-center text-[#ff7b00] font-bold mb-6 tracking-wide text-lg">
            {userName}'S Contribution Graph
          </h3>
          <div className="flex-1 w-full min-h-0 pl-4 pb-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="gradient-contrib" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff7b00" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ff7b00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="rgba(255,123,0,0.15)" />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,123,0,0.5)"
                  tick={{ fill: 'rgba(255,123,0,0.8)', fontSize: 10, fontWeight: 700 }}
                  tickFormatter={(val) => new Date(val).getDate().toString()}
                  tickLine={false}
                  axisLine={false}
                  dy={15}
                  minTickGap={10}
                  label={{ value: 'Days', position: 'insideBottom', offset: -20, fill: '#ff7b00', fontSize: 12, fontWeight: 'bold' }}
                />
                <YAxis
                  stroke="rgba(255,123,0,0.5)"
                  tick={{ fill: 'rgba(255,123,0,0.8)', fontSize: 10, fontWeight: 700 }}
                  tickLine={false}
                  axisLine={false}
                  dx={-15}
                  label={{ value: 'Contributions', angle: -90, position: 'insideLeft', offset: -5, fill: '#ff7b00', fontSize: 12, fontWeight: 'bold' }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid rgba(255,123,0,0.2)', borderRadius: '8px' }}
                  itemStyle={{ color: '#ff7b00', fontWeight: 'bold' }}
                  labelStyle={{ color: '#8b949e', marginBottom: '4px' }}
                  cursor={{ stroke: 'rgba(255,123,0,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area
                  type="linear"
                  dataKey="contributions"
                  stroke="#ff7b00"
                  strokeWidth={3}
                  fill="url(#gradient-contrib)"
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#1a1f2e', fill: '#ff7b00' }}
                  dot={{ r: 4, strokeWidth: 2, stroke: '#1a1f2e', fill: '#ff7b00' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default ActivityTrendChart;