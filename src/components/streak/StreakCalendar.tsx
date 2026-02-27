'use client';

import React from 'react';

interface StreakCalendarProps {
    history?: { date: string; active: boolean }[];
    className?: string;
}

export const StreakCalendar: React.FC<StreakCalendarProps> = ({
    history = [],
    className = '',
}) => {
    // Generate last 90 days
    const days = React.useMemo(() => {
        const result = [];
        const today = new Date();
        for (let i = 89; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const isActive = history.some(h => h.date === dateStr && h.active);
            result.push({ date: dateStr, isActive, dayOfWeek: date.getDay() });
        }
        return result;
    }, [history]);

    const weeks = React.useMemo(() => {
        const result: typeof days[] = [];
        let week: typeof days = [];
        for (const day of days) {
            week.push(day);
            if (day.dayOfWeek === 6) {
                result.push(week);
                week = [];
            }
        }
        if (week.length > 0) result.push(week);
        return result;
    }, [days]);

    const activeDays = days.filter(d => d.isActive).length;

    return (
        <div className={`bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Activity Calendar</h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {activeDays} active days (last 90)
                </span>
            </div>

            <div className="flex gap-1 overflow-x-auto pb-2">
                {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-1">
                        {week.map((day) => (
                            <div
                                key={day.date}
                                title={`${day.date} — ${day.isActive ? 'Active' : 'Inactive'}`}
                                className={`w-3 h-3 rounded-sm transition-colors ${day.isActive
                                        ? 'bg-green-500 dark:bg-green-400'
                                        : 'bg-gray-100 dark:bg-zinc-800'
                                    }`}
                            />
                        ))}
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                <span>Less</span>
                <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-zinc-800" />
                <div className="w-3 h-3 rounded-sm bg-green-300 dark:bg-green-600" />
                <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-400" />
                <span>More</span>
            </div>
        </div>
    );
};

export default StreakCalendar;
