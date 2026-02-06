'use client';

import React, { useState } from 'antml:function_calls>

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
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: CalendarDay[] = [];

    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({
        date: new Date(year, month, d).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 5),
        entries: [],
      });
    }
    return days;
  };

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
        {getDaysInMonth().map((day, idx) => (
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
