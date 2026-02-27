'use client';

import { useState, useEffect } from 'react';

interface Activity {
    id: string;
    type: string;
    action: string;
    description: string;
    timestamp: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
}

interface UserActivityProps {
    userId: string;
    limit?: number;
}

export function UserActivity({ userId, limit = 20 }: UserActivityProps) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchActivity();
    }, [userId]);

    const fetchActivity = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/admin/users/${userId}/activity?limit=${limit}`);
            if (!res.ok) throw new Error('Failed to fetch activity');

            const data = await res.json();
            setActivities(data.activities || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const getActivityIcon = (type: string) => {
        const icons: Record<string, string> = {
            login: '🔐',
            logout: '👋',
            create: '✨',
            update: '✏️',
            delete: '🗑️',
            sync: '🔄',
            export: '📤',
            import: '📥',
            achievement: '🏆',
            subscription: '💳',
        };
        return icons[type] || '📝';
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
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
            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 mb-3">Recent Activity</h4>

            {activities.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                    No activity recorded
                </div>
            ) : (
                <div className="space-y-2">
                    {activities.map((activity) => (
                        <div
                            key={activity.id}
                            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-gray-900 text-sm">{activity.action}</span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-500">{formatTime(activity.timestamp)}</span>
                                </div>
                                <p className="text-xs text-gray-600">{activity.description}</p>
                                {activity.ipAddress && (
                                    <p className="text-xs text-gray-400 mt-1">IP: {activity.ipAddress}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activities.length >= limit && (
                <button
                    onClick={fetchActivity}
                    className="w-full py-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                    Load more
                </button>
            )}
        </div>
    );
}

export default UserActivity;
