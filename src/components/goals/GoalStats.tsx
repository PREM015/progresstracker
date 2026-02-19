'use client';

import React, { useState } from 'react';
import { Target, Trophy, CheckCircle2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoalStatsProps {
  userId: string;
  className?: string;
}

interface Stats {
  totalGoals: number;
  completedGoals: number;
  activeGoals: number;
  completionRate: number;
  averageProgress: number;
  goalsByCategory: Array<{ category: string; count: number }>;
  goalsByPriority: { low: number; medium: number; high: number };
}

export const GoalStats: React.FC<GoalStatsProps> = ({
  userId,
  className = '',
}) => {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/goals/stats')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          const apiStats = data.data;

          // Transform API response to match component state structure
          const formattedStats: Stats = {
            totalGoals: apiStats.overview.total,
            completedGoals: apiStats.overview.completed,
            activeGoals: apiStats.overview.active,
            completionRate: apiStats.overview.completionRate,
            averageProgress: apiStats.activeGoals?.avgProgress || 0,
            goalsByCategory: Object.entries(apiStats.byCategory || {}).map(([category, data]: [string, any]) => ({
              category,
              count: data.total
            })),
            goalsByPriority: { low: 0, medium: 0, high: 0 } // Mock/Default as API doesn't return this yet
          };

          setStats(formattedStats);
        } else {
          console.error('Failed to load stats:', data);
        }
      })
      .catch(err => console.error('Error loading stats:', err))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="h-32 bg-zinc-100 dark:bg-zinc-900 rounded-xl animate-pulse" />
        <div className="h-32 bg-zinc-100 dark:bg-zinc-900 rounded-xl animate-pulse" />
      </div>
    </div>;
  }

  if (!stats) return null;

  return (
    <div className={cn("space-y-6", className)}>
      <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 mb-6 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-indigo-500" />
          Performance
        </h3>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">{stats.completedGoals}</div>
            <div className="text-xs font-medium text-indigo-600/70 dark:text-indigo-400/70 uppercase tracking-wider">Completed</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">{stats.activeGoals}</div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Active</div>
          </div>
          <div className="col-span-2 p-4 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-indigo-100 font-medium text-sm">Success Rate</span>
              <Zap className="w-4 h-4 text-indigo-200" />
            </div>
            <div className="text-3xl font-bold">{stats.completionRate}%</div>
            <div className="mt-2 h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
              <div className="h-full bg-white/90 rounded-full" style={{ width: `${stats.completionRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 mb-4">Categories</h3>
        <div className="space-y-3">
          {stats.goalsByCategory.length > 0 ? stats.goalsByCategory.map((cat, idx) => (
            <div key={idx} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 group-hover:bg-indigo-500 transition-colors" />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{cat.category || 'Uncategorized'}</span>
              </div>
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md min-w-[24px] text-center">{cat.count}</span>
            </div>
          )) : (
            <div className="text-center py-4 text-zinc-500 text-sm">No categories yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoalStats;
