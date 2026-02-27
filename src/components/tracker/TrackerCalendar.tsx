'use client';

import React, { useState, useMemo } from 'react';
import { useTracker } from '@/hooks/useTracker';
import type { TrackerEntry } from '@/types/tracker';

interface CalendarDay {
  date: string;
  count: number;
  entries: any[];
}

interface TrackerCalendarProps {
  className?: string;
}

export const TrackerCalendar: React.FC<TrackerCalendarProps> = ({
  className = '',
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const startOfMonth = useMemo(() => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1), [currentMonth]);
  const endOfMonth = useMemo(() => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59, 999), [currentMonth]);

  const { entries, isLoading } = useTracker({
    startDate: startOfMonth,
    endDate: endOfMonth,
    limit: 1000,
  });

  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const dayList: CalendarDay[] = [];

    const entryMap = new Map<string, TrackerEntry[]>();
    entries?.forEach(entry => {
      const dateStr = new Date(entry.date).toISOString().split('T')[0];
      if (!entryMap.has(dateStr)) entryMap.set(dateStr, []);
      entryMap.get(dateStr)?.push(entry);
    });

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateStr = date.toISOString().split('T')[0];
      const dayEntries = entryMap.get(dateStr) || [];
      dayList.push({
        date: dateStr,
        count: dayEntries.length,
        entries: dayEntries,
      });
    }
    return dayList;
  }, [currentMonth, entries]);

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}>
          ←
        </button>
        <h3 className="text-xl font-bold">
          {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </h3>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}>
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-600">{day}</div>
        ))}
        {days.map((day, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedDay(day)}
            className={`aspect-square rounded-lg border-2 hover:border-indigo-500 ${day.count > 0 ? 'bg-green-100' : 'bg-gray-50'
              }`}
          >
            {new Date(day.date).getDate()}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TrackerCalendar;
