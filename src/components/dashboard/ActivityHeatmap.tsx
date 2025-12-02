'use client';

import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';

interface HeatmapData {
  date: string;
  count: number;
}

interface ActivityHeatmapProps {
  data: HeatmapData[];
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const weeks = useMemo(() => {
    const weekData: HeatmapData[][] = [];
    let currentWeek: HeatmapData[] = [];

    data.forEach((day, index) => {
      currentWeek.push(day);
      
      // Create a new week every 7 days
      if (currentWeek.length === 7 || index === data.length - 1) {
        weekData.push([...currentWeek]);
        currentWeek = [];
      }
    });

    return weekData;
  }, [data]);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (count < 3) return 'bg-green-200 dark:bg-green-900';
    if (count < 6) return 'bg-green-400 dark:bg-green-700';
    if (count < 10) return 'bg-green-600 dark:bg-green-500';
    return 'bg-green-800 dark:bg-green-400';
  };

  const getTooltipContent = (day: HeatmapData) => {
    try {
      const dateObj = parseISO(day.date);
      return `${day.count} problems on ${format(dateObj, 'MMM dd, yyyy')}`;
    } catch {
      return `${day.count} problems`;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">365 Day Activity</h3>
      
      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((day) => (
                <div
                  key={day.date}
                  className={`w-3 h-3 rounded-sm ${getColor(day.count)} transition-all duration-200 cursor-pointer hover:ring-2 hover:ring-blue-500 hover:scale-110`}
                  title={getTooltipContent(day)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 text-sm text-gray-600 dark:text-gray-400">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 2, 5, 8, 12].map((count) => (
            <div
              key={count}
              className={`w-3 h-3 rounded-sm ${getColor(count)}`}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}