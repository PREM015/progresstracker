'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  PieChart as PieChartIcon,
  ExternalLink,
  ChevronRight,
  Globe,
  TrendingUp,
  Clock,
  Target
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Link from 'next/link';

interface PlatformData {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  color?: string | null;
  category: string;
  problemsSolved: number;
  commits: number;
  timeSpent: number;
  points: number;
  lastActivity?: string;
  percentage?: number;
}

interface PlatformBreakdownProps {
  className?: string;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

const categoryColors: Record<string, string> = {
  DSA: '#6366f1',
  GIT: '#10b981',
  JOB: '#f59e0b',
  LEARNING: '#3b82f6',
  HACKATHON: '#8b5cf6',
  OPENSOURCE: '#06b6d4',
  DESIGN: '#ec4899',
  DATA_SCIENCE: '#14b8a6',
  OTHER: '#6b7280',
};

const defaultColors = [
  '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
  '#06b6d4', '#3b82f6', '#14b8a6', '#f97316', '#84cc16'
];

export function PlatformBreakdown({ className }: PlatformBreakdownProps) {
  const [platforms, setPlatforms] = useState<PlatformData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'problems' | 'time' | 'points'>('problems');

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const res = await fetch('/api/analytics/platforms');
        if (!res.ok) throw new Error('Failed to fetch platform data');

        const json = (await res.json()) as ApiSuccess<{ platforms: PlatformData[] }>;

        if (!json?.success) throw new Error('Invalid response');

        if (isMounted) {
          setPlatforms(json.data?.platforms || []);
        }
      } catch (err) {
        console.error('Error fetching platforms:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, []);

  const chartData = useMemo(() => {
    if (!platforms.length) return [];

    return platforms
      .map((p, idx) => {
        let value = 0;
        switch (selectedMetric) {
          case 'problems': value = p.problemsSolved || 0; break;
          case 'time': value = p.timeSpent || 0; break;
          case 'points': value = p.points || 0; break;
        }
        return {
          name: p.name,
          value,
          color: p.color || categoryColors[p.category] || defaultColors[idx % defaultColors.length],
          platform: p,
        };
      })
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [platforms, selectedMetric]);

  const total = useMemo(() =>
    chartData.reduce((sum, d) => sum + d.value, 0),
    [chartData]
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload;
    const percentage = total ? ((data.value / total) * 100).toFixed(1) : 0;

    return (
      <div className="glass-card p-4 border-black/10 dark:border-white/10 shadow-2xl backdrop-blur-xl bg-white/90 dark:bg-black/80">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <span className="text-sm font-black text-zinc-900 dark:text-white">{data.name}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-zinc-900 dark:text-white">
            {selectedMetric === 'time'
              ? `${(data.value / 60).toFixed(1)}h`
              : data.value.toLocaleString()}
          </span>
          <span className="text-xs font-bold text-zinc-500">({percentage}%)</span>
        </div>
      </div>
    );
  };

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
        <div className="flex flex-col items-center justify-center h-64">
          <Globe className="w-12 h-12 text-red-500/50 mb-4" />
          <p className="text-red-400 font-bold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className={cn("h-full", className)}
    >
      <div className="glass-card h-full p-8 relative overflow-hidden flex flex-col border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all duration-300 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-xl">
              <PieChartIcon className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Platform Breakdown</h2>
              <p className="text-zinc-600 dark:text-zinc-500 font-bold text-xs uppercase tracking-widest mt-0.5">
                Activity Distribution
              </p>
            </div>
          </div>
          <Link
            href="/connected-platforms"
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
          >
            <ExternalLink className="w-4 h-4 text-zinc-500 hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
          </Link>
        </div>

        {/* Metric Selector */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'problems', label: 'Problems', icon: Target },
            { key: 'time', label: 'Time', icon: Clock },
            { key: 'points', label: 'Points', icon: TrendingUp },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSelectedMetric(key as typeof selectedMetric)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border",
                selectedMetric === key
                  ? "bg-primary text-white border-primary/50 shadow-lg shadow-primary/20"
                  : "bg-zinc-100 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {chartData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center glass rounded-2xl border-black/5 dark:border-white/5 py-12">
              <Globe className="w-12 h-12 text-zinc-400 dark:text-zinc-700 mb-4" />
              <p className="text-zinc-900 dark:text-white font-bold">No Platform Data</p>
              <p className="text-zinc-600 dark:text-zinc-500 text-sm mt-1">Connect platforms to see breakdown</p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6 flex-1">
              {/* Chart */}
              <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                      animationBegin={300}
                      animationDuration={1500}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          style={{ filter: `drop-shadow(0 0 8px ${entry.color}44)` }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend / List */}
              <div className="lg:w-48 space-y-2">
                {chartData.slice(0, 6).map((item, idx) => {
                  const percentage = total ? ((item.value / total) * 100).toFixed(0) : 0;

                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + idx * 0.05 }}
                      className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-zinc-900 dark:text-white truncate group-hover:text-primary transition-colors">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {selectedMetric === 'time'
                            ? `${(item.value / 60).toFixed(1)}h`
                            : item.value.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-[10px] font-black text-zinc-500">
                        {percentage}%
                      </div>
                    </motion.div>
                  );
                })}

                {chartData.length > 6 && (
                  <Link
                    href="/analytics/platforms"
                    className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors pt-2"
                  >
                    +{chartData.length - 6} more <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Total */}
        {total > 0 && (
          <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Total {selectedMetric}
            </span>
            <span className="text-lg font-black text-zinc-900 dark:text-white">
              {selectedMetric === 'time'
                ? `${(total / 60).toFixed(1)} hours`
                : total.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default PlatformBreakdown;