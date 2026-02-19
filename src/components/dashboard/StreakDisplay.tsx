'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Flame, Trophy } from 'lucide-react';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  isLoading?: boolean;
  className?: string;
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({
  currentStreak = 0,
  longestStreak = 0,
  isLoading = false,
  className = ''
}) => {

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return 'from-purple-500 to-pink-500';
    if (streak >= 14) return 'from-orange-500 to-red-500';
    if (streak >= 7) return 'from-yellow-500 to-orange-500';
    return 'from-blue-500 to-cyan-500';
  };

  if (isLoading) {
    return <div className={cn("h-64 bg-zinc-100 dark:bg-zinc-900 rounded-xl animate-pulse", className)} />;
  }

  return (
    <div className={cn("bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm", className)}>
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-500">
          <Flame className="w-5 h-5" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Streak</h3>
      </div>

      <div className={`bg-gradient-to-r ${getStreakColor(currentStreak)} text-white rounded-xl p-8 mb-6 shadow-lg shadow-orange-500/20`}>
        <div className="text-center">
          <div className="text-5xl font-bold mb-2 tracking-tight">{currentStreak}</div>
          <div className="text-lg font-medium opacity-90">Day Streak</div>
          <div className="mt-4 text-sm font-medium opacity-75">
            {currentStreak > 0 ? 'Keep it going!' : 'Start your streak today.'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800">
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{longestStreak}</div>
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1 uppercase tracking-wide">Longest</div>
        </div>
        <div className="text-center p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800">
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {currentStreak > longestStreak ? 'New Best!' : longestStreak - currentStreak}
          </div>
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1 uppercase tracking-wide">
            {currentStreak > longestStreak ? 'Record Broken' : 'To Beat Record'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreakDisplay;
