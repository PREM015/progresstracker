'use client';

import { useState, useEffect } from 'react';

interface AdminStats {
    users: {
        total: number;
        active: number;
        banned: number;
        newToday: number;
        newThisWeek: number;
        newThisMonth: number;
    };
}

export function UserStats() {
    const [stats, setStats] = useState<AdminStats['users'] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            const data = await res.json();
            setStats(data.users);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="animate-pulse space-y-3">
                            <div className="h-4 bg-zinc-800 rounded w-1/2" />
                            <div className="h-8 bg-zinc-800 rounded w-3/4" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Users */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-sm text-zinc-500 mb-2">Total Users</div>
                        <div className="text-3xl font-bold text-white">
                            {(stats?.total || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-zinc-600 mt-2">All registered</div>
                    </div>
                    <div className="p-3 bg-indigo-500/10 rounded-lg">
                        <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Active Users */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-sm text-zinc-500 mb-2">Active Users</div>
                        <div className="text-3xl font-bold text-white">
                            {(stats?.active || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-green-500 mt-2">
                            {stats && stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% active` : '0%'}
                        </div>
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-lg">
                        <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* New This Week */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-sm text-zinc-500 mb-2">New This Week</div>
                        <div className="text-3xl font-bold text-white">
                            {(stats?.newThisWeek || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-blue-400 mt-2">
                            +{stats?.newToday || 0} today
                        </div>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                        <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Banned Users */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-sm text-zinc-500 mb-2">Banned Users</div>
                        <div className="text-3xl font-bold text-white">
                            {(stats?.banned || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-red-500 mt-2">
                            {stats && stats.total > 0 ? `${Math.round((stats.banned / stats.total) * 100)}% of total` : '0%'}
                        </div>
                    </div>
                    <div className="p-3 bg-red-500/10 rounded-lg">
                        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UserStats;
