'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarDays, Trophy, Flame, Clock, Target } from 'lucide-react';

interface LeaderboardFiltersProps {
  timeframe: string;
  category: string;
  onChange: (filters: { timeframe: string; category: string }) => void;
  className?: string;
}

export const LeaderboardFilters: React.FC<LeaderboardFiltersProps> = ({
  timeframe,
  category,
  onChange,
  className = '',
}) => {
  return (
    <div className={cn("flex flex-col md:flex-row gap-4 items-center bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800", className)}>
      <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl">
        {[
          { value: 'week', label: 'Weekly' },
          { value: 'month', label: 'Monthly' },
          { value: 'alltime', label: 'All Time' }
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange({ timeframe: opt.value, category })}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-lg transition-all",
              timeframe === opt.value
                ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="h-6 w-[1px] bg-zinc-200 dark:bg-zinc-800 hidden md:block" />

      <div className="flex-1 w-full md:w-auto">
        <Select
          value={category}
          onValueChange={(val) => onChange({ timeframe, category: val })}
        >
          <SelectTrigger className="w-full md:w-[200px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overall">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span>Overall Score</span>
              </div>
            </SelectItem>
            <SelectItem value="problems">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-500" />
                <span>Problems Solved</span>
              </div>
            </SelectItem>
            <SelectItem value="streak">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span>Longest Streak</span>
              </div>
            </SelectItem>
            <SelectItem value="hours">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>Hours Studied</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default LeaderboardFilters;
