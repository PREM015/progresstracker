"use client";

import { useState, useEffect } from "react";

export default function TrackerCalendarPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const month = currentMonth.getMonth() + 1;
    const year = currentMonth.getFullYear();

    fetch(`/api/tracker/calendar?month=${month}&year=${year}`)
      .then(r => r.json())
      .then(data => setEntries(data.entries || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [currentMonth]);

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getEntriesForDay = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return entries.filter(e => e.date?.startsWith(dateStr));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Progress Calendar</h1>
          <div className="flex items-center gap-4">
            <button onClick={prevMonth} className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
              ← Prev
            </button>
            <span className="text-lg font-medium">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={nextMonth} className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
              Next →
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-bold text-gray-700 p-2">
                {day}
              </div>
            ))}

            {getDaysInMonth().map((day, idx) => (
              <div
                key={idx}
                className={`min-h-24 border border-gray-200 rounded-lg p-2 ${day ? 'bg-white' : 'bg-gray-50'
                  }`}
              >
                {day && (
                  <>
                    <div className="font-bold text-gray-900 mb-1">{day}</div>
                    <div className="space-y-1">
                      {getEntriesForDay(day).slice(0, 3).map((entry, i) => (
                        <div key={i} className="text-xs p-1 bg-indigo-50 text-indigo-700 rounded truncate">
                          {entry.type}: {entry.value}
                        </div>
                      ))}
                      {getEntriesForDay(day).length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{getEntriesForDay(day).length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
