'use client';

import { useState, useEffect } from 'react';
import type { TrackerEntry } from '@/types/tracker';
import { formatTimeSpent, getActivitySummary } from '@/types/tracker';

interface TrackerRecentActivityProps {
    userId?: string;
    limit?: number;
    onEntryClick?: (entry: TrackerEntry) => void;
    className?: string;
}

export function TrackerRecentActivity({
    userId,
    limit = 10,
    onEntryClick,
    className = ''
}: TrackerRecentActivityProps) {
    const [entries, setEntries] = useState<TrackerEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchRecentEntries();
    }, [limit]);

    const fetchRecentEntries = async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                limit: String(limit),
                sortBy: 'createdAt',
                sortOrder: 'desc',
            });

            const res = await fetch(`/api/tracker?${params}`);
            if (!res.ok) throw new Error('Failed to fetch recent activity');

            const data = await res.json();
            setEntries(data.data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const getRelativeTime = (date: Date): string => {
        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    };

    if (loading) {
        return (
            <div className={`space-y-3 ${className}`}>
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-red-50 border border-red-200 rounded-xl p-4 ${className}`}>
                <p className="text-red-600 text-sm">{error}</p>
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className={`text-center py-8 bg-gray-50 rounded-xl ${className}`}>
                <span className="text-4xl mb-2 block">📊</span>
                <p className="text-gray-500 text-sm">No recent activity</p>
            </div>
        );
    }

    return (
        <div className={`space-y-2 ${className}`}>
            <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>

            {entries.map((entry) => (
                <div
                    key={entry.id}
                    onClick={() => onEntryClick?.(entry)}
                    className={`flex items-center gap-3 p-3 bg-white border  border-gray-200 rounded-lg hover:shadow-md transition-shadow ${onEntryClick ? 'cursor-pointer' : ''
                        }`}
                >
                    {/* Platform Icon */}
                    {entry.platform && (
                        <div
                            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg text-xl"
                            style={{ backgroundColor: entry.platform.color + '20' }}
                        >
                            {entry.platform.icon}
                        </div>
                    )}

                    {/* Entry Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 text-sm truncate">
                                {entry.platform?.name || 'Manual Entry'}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                                {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                        <p className="text-xs text-gray-600 truncate">
                            {getActivitySummary(entry)}
                        </p>
                    </div>

                    {/* Time Badge */}
                    <div className="shrink-0 text-xs text-gray-400">
                        {getRelativeTime(entry.createdAt)}
                    </div>
                </div>
            ))}

            {/* View All Button */}
            {entries.length >= limit && (
                <button
                    onClick={() => window.location.href = '/tracker'}
                    className="w-full py-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                    View all activity →
                </button>
            )}
        </div>
    );
}

export default TrackerRecentActivity;
