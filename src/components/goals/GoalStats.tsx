'use client';

import React from 'react';
import { Target, Trophy, CheckCircle2, Zap, TrendingUp, Activity, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

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
          setStats({
            totalGoals: apiStats.overview.total,
            completedGoals: apiStats.overview.completed,
            activeGoals: apiStats.overview.active,
            completionRate: apiStats.overview.completionRate,
            averageProgress: apiStats.activeGoals?.avgProgress || 0,
            goalsByCategory: Object.entries(apiStats.byCategory || {}).map(([category, data]: [string, any]) => ({
              category,
              count: data.total
            })),
          });
        }
      })
      .catch(err => console.error('Error loading stats:', err))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-white/50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      label: 'Success Rate',
      value: `${stats.completionRate}%`,
      sub: 'Goals Completed',
      icon: Zap,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      progress: stats.completionRate
    },
    {
      label: 'Active Targets',
      value: stats.activeGoals,
      sub: `In Progress (${stats.averageProgress.toFixed(0)}% avg)`,
      icon: Target,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10',
      progress: stats.averageProgress
    },
    {
      label: 'Milestones',
      value: stats.completedGoals,
      sub: 'Lifetime Achievement',
      icon: Trophy,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      progress: stats.totalGoals > 0 ? (stats.completedGoals / stats.totalGoals) * 100 : 0
    },
    {
      label: 'Consistency',
      value: '+12%',
      sub: 'Better than last week',
      icon: TrendingUp,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      progress: 75
    }
  ];

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {cards.map((card, idx) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.1 }}
        >
          <GlassCard className="p-5 border-zinc-200/50 dark:border-zinc-800/50 hover:bg-white dark:hover:bg-zinc-900 transition-colors cursor-default group">
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-2.5 rounded-xl shadow-sm border", card.bg, card.color, "border-black/5 dark:border-white/5")}>
                <card.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{card.label}</span>
            </div>

            <div className="space-y-1">
              <h4 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">{card.value}</h4>
              <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 truncate uppercase tracking-tight">{card.sub}</p>
            </div>

            <div className="mt-4 h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${card.progress}%` }}
                className={cn("h-full rounded-full transition-all duration-1000", idx % 2 === 0 ? "bg-indigo-500" : "bg-purple-500")}
              />
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
};

export default GoalStats;
