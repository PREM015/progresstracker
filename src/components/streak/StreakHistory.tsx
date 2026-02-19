'use client';

import React from 'react';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';

interface StreakHistoryEntry {
    startDate: string;
    endDate: string;
    length: number;
}

interface StreakHistoryProps {
    history?: StreakHistoryEntry[];
    className?: string;
}

export const StreakHistory: React.FC<StreakHistoryProps> = ({
    history = [],
    className = '',
}) => {
    if (history.length === 0) {
        return (
            <div className={`bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 ${className}`}>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Streak History</h3>
                <div className="text-center py-8">
                    <Calendar className="h-10 w-10 text-gray-300 dark:text-zinc-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No streak history yet</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Start your first streak today!</p>
                </div>
            </div>
        );
    }

    const sortedHistory = [...history].sort((a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );

    return (
        <div className={`bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 ${className}`}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Streak History</h3>
            <div className="space-y-3">
                {sortedHistory.map((entry, idx) => (
                    <div
                        key={idx}
                        className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50"
                    >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${entry.length >= 7 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-zinc-800'
                            }`}>
                            {entry.length >= 7 ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                                <TrendingDown className="h-4 w-4 text-gray-400" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-white">{entry.length} days</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(entry.startDate).toLocaleDateString()} – {new Date(entry.endDate).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="w-16 bg-gray-200 dark:bg-zinc-700 rounded-full h-1.5">
                            <div
                                className="bg-orange-500 h-1.5 rounded-full"
                                style={{ width: `${Math.min((entry.length / 30) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StreakHistory;
