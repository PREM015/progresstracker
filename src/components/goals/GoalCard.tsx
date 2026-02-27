'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Edit2, Trash2, Clock, CheckCircle2, AlertCircle, PlayCircle, PauseCircle, Trophy, Target, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

import { Goal } from '@/types/goal';

interface GoalCardProps {
  goal: Goal;
  className?: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  className = '',
  onEdit,
  onDelete,
}) => {
  const current = (goal as any).currentValue ?? goal.progress;
  const target = (goal as any).targetValue ?? goal.target;

  const progress = Math.min((current / target) * 100, 100);
  const isComplete = goal.status === 'completed' || progress >= 100;

  const daysRemaining = goal.deadline
    ? Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const statusKey = (goal.status?.toLowerCase() as any) || 'active';

  const configMap: Record<string, any> = {
    active: { icon: PlayCircle, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10", border: "border-indigo-100 dark:border-indigo-500/20" },
    completed: { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-100 dark:border-emerald-500/20" },
    paused: { icon: PauseCircle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-100 dark:border-amber-500/20" },
    failed: { icon: AlertCircle, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10", border: "border-rose-100 dark:border-rose-500/20" },
    draft: { icon: Edit2, color: "text-zinc-500 dark:text-zinc-400", bg: "bg-zinc-100 dark:bg-zinc-800", border: "border-zinc-200 dark:border-zinc-700" },
    archived: { icon: Trash2, color: "text-zinc-400", bg: "bg-zinc-50 dark:bg-zinc-900", border: "border-zinc-200 dark:border-zinc-800" },
  };

  const statusConfig = configMap[statusKey] || configMap.active;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className={cn(
        "group relative overflow-hidden rounded-2xl border transition-all duration-300",
        "bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl",
        "border-zinc-200 dark:border-zinc-800",
        "hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:border-indigo-500/30 dark:hover:border-white/20",
        className
      )}
    >
      <div className="relative p-6">
        {/* Header - Stacks on mobile */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={cn(
              "p-4 rounded-2xl flex items-center justify-center shadow-xl border-b-4",
              statusConfig.bg,
              statusConfig.color,
              statusConfig.border
            )}>
              {isComplete ? <Trophy className="w-8 h-8" /> : <Target className="w-8 h-8" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                  statusConfig.bg,
                  statusConfig.color
                )}>
                  {goal.status}
                </span>
                {goal.category && (
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                    {goal.category}
                  </span>
                )}
              </div>
              <h3 className="font-black text-xl text-zinc-900 dark:text-zinc-50 leading-tight tracking-tight">
                {goal.title}
              </h3>
            </div>
          </div>

          <div className="flex md:flex-col items-center md:items-end gap-3">
            {daysRemaining !== null ? (
              <div className={cn(
                "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all shadow-sm",
                daysRemaining < 0
                  ? "text-white bg-rose-600 shadow-rose-200 dark:shadow-none"
                  : daysRemaining <= 3
                    ? "text-rose-700 bg-rose-100 animate-pulse border border-rose-200"
                    : "text-zinc-500 bg-zinc-100 dark:bg-zinc-800/50"
              )}>
                <Clock className="w-3.5 h-3.5" />
                {daysRemaining < 0
                  ? `${Math.abs(daysRemaining)}d OVERDUE`
                  : daysRemaining === 0
                    ? "DUE TODAY"
                    : `${daysRemaining}D LEFT`}
              </div>
            ) : (
              <div className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl text-zinc-400 bg-zinc-50 dark:bg-zinc-800/20 border border-transparent">
                OPEN TARGET
              </div>
            )}

            <div className="flex items-center gap-1 ml-auto md:ml-0">
              {onEdit && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all" onClick={() => onEdit(goal.id)}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all" onClick={() => onDelete(goal.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="mt-8 space-y-4">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Momentum</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tighter">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                {current} / {target}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                {goal.unit}
              </span>
            </div>
          </div>

          <div className="relative h-4 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden p-[2px] border border-zinc-200 dark:border-zinc-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
              className={cn(
                "h-full rounded-full shadow-sm bg-gradient-to-r relative",
                isComplete ? "from-emerald-400 to-teal-500" : "from-indigo-500 via-purple-500 to-indigo-600"
              )}
            >
              <div className="absolute inset-0 bg-white/20 mix-blend-overlay animate-pulse" />
            </motion.div>
          </div>
        </div>

        {/* Action/Footer */}
        <div className="mt-8 pt-6 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/30 text-orange-600 border border-orange-100 dark:border-orange-500/20">
              <span className="text-xs font-black tracking-tight">🔥 {goal.currentStreakDays || 0}</span>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">STREAK</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-10 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100"
            onClick={(e) => {
              e.stopPropagation();
              if (onEdit) onEdit(goal.id);
            }}
          >
            Update Progress
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default GoalCard;
