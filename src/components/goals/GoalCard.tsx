'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Edit2, Trash2, Clock, CheckCircle2, AlertCircle, PlayCircle, PauseCircle, Trophy, Target } from 'lucide-react';
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
  // Calculate progress
  // Calculate progress
  // Support both legacy props (currentValue) and new props (progress) just in case, but prefer new
  const current = (goal as any).currentValue ?? goal.progress;
  const target = (goal as any).targetValue ?? goal.target;

  const progress = Math.min((current / target) * 100, 100);
  const isComplete = goal.status === 'completed' || progress >= 100;

  // Calculate days remaining
  const daysRemaining = goal.deadline
    ? Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Status visual configs
  const statusKey = (goal.status?.toLowerCase() as any) || 'active';

  const configMap: Record<string, any> = {
    active: { icon: PlayCircle, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10", border: "border-indigo-100 dark:border-indigo-500/20" },
    completed: { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-100 dark:border-emerald-500/20" },
    paused: { icon: PauseCircle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-100 dark:border-amber-500/20" },
    failed: { icon: AlertCircle, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10", border: "border-rose-100 dark:border-rose-500/20" },
    // Fallbacks for other statuses
    draft: { icon: Edit2, color: "text-zinc-500 dark:text-zinc-400", bg: "bg-zinc-100 dark:bg-zinc-800", border: "border-zinc-200 dark:border-zinc-700" },
    archived: { icon: Trash2, color: "text-zinc-400", bg: "bg-zinc-50 dark:bg-zinc-900", border: "border-zinc-200 dark:border-zinc-800" },
  };

  const statusConfig = configMap[statusKey] || configMap.active;
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className={cn(
        "group relative overflow-hidden rounded-2xl border transition-all duration-300",
        "bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl",
        "border-zinc-200 dark:border-zinc-800",
        "hover:shadow-xl hover:translate-y-[-2px] hover:border-indigo-500/30 dark:hover:border-indigo-500/30",
        className
      )}
    >
      {/* Background Gradient Glow */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
        "bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent"
      )} />

      <div className="relative p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start gap-4">
            <div className={cn(
              "p-3 rounded-xl flex items-center justify-center shadow-inner",
              statusConfig.bg,
              statusConfig.color
            )}>
              {isComplete ? <Trophy className="w-6 h-6" /> : <Target className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-xs font-bold uppercase tracking-wider", statusConfig.color)}>
                  {goal.status}
                </span>
                {goal.category && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                    {goal.category}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 leading-tight">
                {goal.title}
              </h3>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 duration-200">
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20" onClick={() => onEdit(goal.id)}>
                <Edit2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress Section */}
        <div className="mt-6 space-y-2">
          <div className="flex justify-between items-end text-sm">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">
              Progress
            </span>
            <div className="text-right">
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {Math.round(progress)}%
              </span>
              <span className="text-xs text-zinc-400 ml-1">
                ({current} / {target} {goal.unit})
              </span>
            </div>
          </div>

          <div className="relative group/progress">
            <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden p-[1px]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full shadow-sm bg-gradient-to-r",
                  isComplete ? "from-emerald-500 to-teal-500" : "from-indigo-500 to-purple-500"
                )}
              />
            </div>
          </div>

          {/* Quick Update Controls */}
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs px-2 ml-auto border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-indigo-600 hover:border-indigo-300"
              onClick={(e) => {
                e.stopPropagation();
                const newVal = Math.min(current + 1, target);
                // Just a quick optimistic UI update for now, or trigger parent
                // Ideally pass onProgressUpdate
                if (onEdit) onEdit(goal.id); // Re-use edit for now or we need a new prop
              }}
            >
              + Log Progress
            </Button>
          </div>
        </div>

        {/* Features: Streak & Privacy */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
          {/* Streak */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400">
            <span className="text-xs font-bold">🔥 {goal.currentStreakDays || 0}</span>
            <span className="text-[10px] font-medium uppercase opacity-80">Streak</span>
          </div>

          {/* Visibility */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-50 dark:bg-zinc-900 text-zinc-500">
            {goal.isPublic ? (
              <span className="text-[10px] font-medium uppercase">Public</span>
            ) : (
              <span className="text-[10px] font-medium uppercase">Private</span>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-4 flex items-center justify-between">
          {daysRemaining !== null ? (
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md bg-zinc-50 dark:bg-zinc-900",
              daysRemaining < 0 ? "text-rose-600 bg-rose-50 dark:bg-rose-900/20" : daysRemaining <= 3 ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20" : "text-zinc-500 dark:text-zinc-400"
            )}>
              <Clock className="w-3.5 h-3.5" />
              {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : daysRemaining === 0 ? "Due today" : `${daysRemaining} days left`}
            </div>
          ) : (
            <span className="text-xs text-zinc-400">No deadline</span>
          )}

          {onDelete && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onDelete(goal.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default GoalCard;
