/**
 * Component: AchievementProgress
 * Location: components/achievements/AchievementProgress.tsx
 * 
 * Description: Premium Achievement Progress visualizations with circular and linear modes
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress, CircularProgress } from '@/components/ui/Progress';
import { AchievementBadge } from './AchievementBadge';
import { AchievementProgress as IAchievementProgress } from '@/types/achievement';

export interface AchievementProgressProps {
  progress: IAchievementProgress;
  variant?: 'card' | 'inset' | 'circular';
  className?: string;
}

export const AchievementProgress: React.FC<AchievementProgressProps> = ({
  progress,
  variant = 'card',
  className,
}) => {
  const { achievement, current, target, percentage, isUnlocked } = progress;

  if (variant === 'circular') {
    return (
      <div className={cn('flex flex-col items-center gap-4', className)}>
        <div className="relative">
          <CircularProgress
            value={percentage}
            size={120}
            strokeWidth={10}
            className="text-[var(--primary)] drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <AchievementBadge achievement={achievement} isUnlocked={isUnlocked} size="md" animate={false} />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]"> Progress</p>
          <p className="text-2xl font-black">{Math.round(percentage)}%</p>
          <p className="text-xs text-[var(--text-muted)] font-medium mt-1">{current} / {target}</p>
        </div>
      </div>
    );
  }

  if (variant === 'inset') {
    return (
      <div className={cn('bg-black/5 dark:bg-white/5 rounded-2xl p-4 border border-[var(--card-border)]/50', className)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[var(--primary)]" />
            <span className="text-xs font-bold uppercase tracking-wider">Current Progress</span>
          </div>
          <span className="text-xs font-black text-[var(--primary)]">{Math.round(percentage)}%</span>
        </div>
        <Progress value={percentage} size="sm" className="bg-[var(--card-bg)]" />
        <div className="flex justify-between mt-2 text-[10px] font-bold text-[var(--text-muted)]">
          <span>{current} {achievement.requirement.metric.replace('_', ' ')}</span>
          <span>GOAL: {target}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-xl relative overflow-hidden group transition-all duration-300',
      className
    )}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-[var(--primary)]/10 transition-colors" />

      <div className="flex items-center gap-4 relative z-10">
        <AchievementBadge achievement={achievement} isUnlocked={isUnlocked} size="md" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black truncate">{achievement.title}</h3>
            {isUnlocked && <Trophy className="w-4 h-4 text-amber-500 fill-amber-500" />}
          </div>
          <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed mt-0.5 line-clamp-1">
            {achievement.description}
          </p>
        </div>

        {!isUnlocked && (
          <div className="shrink-0 flex items-center gap-1 text-[var(--primary)] font-black text-sm">
            {Math.round(percentage)}%
            <ChevronRight className="w-4 h-4" />
          </div>
        )}
      </div>

      {!isUnlocked && (
        <div className="mt-5 space-y-2 relative z-10">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Progress Tracker</span>
            <span className="text-[10px] font-black text-[var(--primary)]">{current} / {target}</span>
          </div>
          <Progress value={percentage} size="md" className="h-2 rounded-full shadow-inner" />
        </div>
      )}

      {isUnlocked && (
        <div className="mt-4 pt-4 border-t border-[var(--card-border)] flex items-center justify-between text-[10px] font-bold uppercase tracking-widest relative z-10">
          <span className="text-emerald-500">Achievement Unlocked</span>
          <span className="text-[var(--text-muted)]">Complete</span>
        </div>
      )}
    </div>
  );
};

export default AchievementProgress;
