'use client';

import  Card  from '@/components/ui/Card';
import { useEffect, useState } from 'react';
import { format, subDays, startOfDay } from 'date-fns';
import axios from 'axios';

interface StreakCalendarProps {
  userId: string;
}

interface DayData {
  date: string;
  count: number;
}

export function StreakCalendar({ userId }: StreakCalendarProps) {
  const [data, setData] = useState<DayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await axios.get('/api/stats/heatmap');
        const apiData: DayData[] = response.data.heatmap || [];

        // ✅ Generate last 365 days including today
        const today = startOfDay(new Date());
        const days: DayData[] = [];

        for (let i = 364; i >= 0; i--) {
          const date = startOfDay(subDays(today, i));
          const formatted = format(date, 'yyyy-MM-dd');

          const existing = apiData.find(d => d.date === formatted);

          days.push({
            date: formatted,
            count: existing ? existing.count : 0,
          });
        }

        setData(days);
      } catch (error) {
        console.error('Failed to fetch heatmap:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [userId]);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (count < 3) return 'bg-green-200 dark:bg-green-900';
    if (count < 6) return 'bg-green-400 dark:bg-green-700';
    if (count < 10) return 'bg-green-600 dark:bg-green-500';
    return 'bg-green-800 dark:bg-green-400';
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Streak Calendar</h3>
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-500">Loading...</p>
        </div>
      </Card>
    );
  }

  // ✅ Existing week grouping logic (unchanged)
  const weeks: DayData[][] = [];
  let currentWeek: DayData[] = [];

  data.forEach((day, index) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || index === data.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">365 Day Streak Calendar</h3>

      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((day) => (
                <div
                  key={day.date}
                  className={`w-3 h-3 rounded-sm ${getColor(day.count)} transition-all cursor-pointer hover:ring-2 hover:ring-blue-500`}
                  title={`${day.count} problems on ${day.date}`}
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
            <div key={count} className={`w-3 h-3 rounded-sm ${getColor(count)}`} />
          ))}
        </div>
        <span>More</span>
      </div>
    </Card>
  );
}
