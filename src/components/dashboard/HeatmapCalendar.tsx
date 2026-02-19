'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';
import { Tooltip } from 'react-tooltip';

interface HeatmapData {
  date: string;
  count: number;
}

interface HeatmapCalendarProps {
  data: HeatmapData[];
  isLoading?: boolean;
  className?: string;
}

export const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({
  data = [],
  isLoading = false,
  className = '',
}) => {

  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-zinc-100 dark:bg-zinc-800/50';
    if (count < 3) return 'bg-emerald-200 dark:bg-emerald-900/60';
    if (count < 6) return 'bg-emerald-400 dark:bg-emerald-700/80';
    if (count < 10) return 'bg-emerald-500 dark:bg-emerald-600';
    return 'bg-emerald-700 dark:bg-emerald-500';
  };

  if (isLoading) return <div className={cn("h-40 bg-zinc-100 dark:bg-zinc-900 rounded-xl animate-pulse", className)} />;

  // Generate last 12 weeks of data visualization
  const weeks: HeatmapData[][] = [];
  // Use processed data or empty
  // Logic to map `data` to the grid
  // Creating a map for O(1) lookup
  const dataMap = new Map(data.map(d => [d.date, d.count]));

  for (let week = 0; week < 12; week++) {
    const days: HeatmapData[] = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date();
      // Calculate date: Today minus (weeks back + days back in that week)
      // 11 - week gets us to look back 12 weeks from 0-11
      const daysToSubtract = (11 - week) * 7 + (6 - day);
      date.setDate(date.getDate() - daysToSubtract);

      const dateStr = date.toISOString().split('T')[0];
      const count = dataMap.get(dateStr) || 0;
      days.push({ date: dateStr, count });
    }
    weeks.push(days);
  }

  return (
    <div className={cn("bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm", className)}>
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-500">
          <Calendar className="w-5 h-5" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Activity Calendar</h3>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-1">
            {week.map((day, dayIdx) => (
              <div
                key={`${weekIdx}-${dayIdx}`}
                className={cn(`w-3 h-3 rounded-sm transition-colors`, getIntensity(day.count))}
                data-tooltip-id="calendar-tooltip"
                data-tooltip-content={`${day.date}: ${day.count} activities`}
              />
            ))}
          </div>
        ))}
      </div>
      <Tooltip id="calendar-tooltip" className="z-50 !bg-zinc-900 !text-zinc-50 !px-2 !py-1 !text-xs !rounded" />

      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
        <span>Less</span>
        {[0, 3, 6, 10, 15].map((count, idx) => (
          <div key={idx} className={cn(`w-3 h-3 rounded-sm`, getIntensity(count))} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
};

export default HeatmapCalendar;
