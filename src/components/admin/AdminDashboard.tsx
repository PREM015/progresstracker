'use client';

import { useState, useEffect } from 'react';

interface DashboardStats {
    users: {
        total: number;
        active: number;
        newToday: number;
        newThisWeek: number;
    };
    platforms: {
        total: number;
        active: number;
    };
    goals: {
        total: number;
        completed: number;
    };
    subscriptions: {
        total: number;
        active: number;
        revenue: number;
    };
}

export function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/dashboard/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            const data = await res.json();
            setStats(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
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
        <div className="space-y-8">
            {/* Welcome */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
                <p className="text-zinc-400">Welcome back! Here's what's happening with your platform.</p>
            </div>

            {/* User Stats */}
            <div>
                <h2 className="text-xl font-semibold text-white mb-4">Users</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="text-sm text-zinc-500 mb-2">Total Users</div>
                                <div className="text-3xl font-bold text-white">
                                    {(stats?.users.total || 0).toLocaleString()}
                                </div>
                            </div>
                            <div className="p-3 bg-indigo-500/10 rounded-lg">
                                <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="text-sm text-zinc-500 mb-2">Active Users</div>
                                <div className="text-3xl font-bold text-white">
                                    {(stats?.users.active || 0).toLocaleString()}
                                </div>
                            </div>
                            <div className="p-3 bg-green-500/10 rounded-lg">
                                <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="text-sm text-zinc-500 mb-2">New Today</div>
                                <div className="text-3xl font-bold text-white">
                                    +{(stats?.users.newToday || 0).toLocaleString()}
                                </div>
                            </div>
                            <div className="p-3 bg-blue-500/10 rounded-lg">
                                <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="text-sm text-zinc-500 mb-2">New This Week</div>
                                <div className="text-3xl font-bold text-white">
                                    +{(stats?.users.newThisWeek || 0).toLocaleString()}
                                </div>
                            </div>
                            <div className="p-3 bg-purple-500/10 rounded-lg">
                                <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Platform & Goals */}
            <div>
                <h2 className="text-xl font-semibold text-white mb-4">Platform & Engagement</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="text-sm text-zinc-500 mb-2">Total Platforms</div>
                        <div className="text-3xl font-bold text-white">{stats?.platforms.total || 0}</div>
                        <div className="text-xs text-zinc-600 mt-2">{stats?.platforms.active || 0} active</div>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="text-sm text-zinc-500 mb-2">Total Goals</div>
                        <div className="text-3xl font-bold text-white">
                            {(stats?.goals.total || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-green-500 mt-2">{stats?.goals.completed || 0} completed</div>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="text-sm text-zinc-500 mb-2">Active Subscriptions</div>
                        <div className="text-3xl font-bold text-white">
                            {(stats?.subscriptions.active || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-zinc-600 mt-2">of {stats?.subscriptions.total || 0} total</div>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="text-sm text-zinc-500 mb-2">Monthly Revenue</div>
                        <div className="text-3xl font-bold text-white">
                            ${(stats?.subscriptions.revenue || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-green-500 mt-2">MRR</div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <a
                        href="/admin/users"
                        className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-indigo-500 transition-colors"
                    >
                        <div className="text-lg font-semibold text-white mb-2">Manage Users</div>
                        <div className="text-sm text-zinc-400">View and manage all users</div>
                    </a>

                    <a
                        href="/admin/platforms"
                        className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-indigo-500 transition-colors"
                    >
                        <div className="text-lg font-semibold text-white mb-2">Platforms</div>
                        <div className="text-sm text-zinc-400">Configure platform integrations</div>
                    </a>

                    <a
                        href="/admin/feature-flags"
                        className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-indigo-500 transition-colors"
                    >
                        <div className="text-lg font-semibold text-white mb-2">Feature Flags</div>
                        <div className="text-sm text-zinc-400">Toggle features on/off</div>
                    </a>

                    <a
                        href="/admin/audit-logs"
                        className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-indigo-500 transition-colors"
                    >
                        <div className="text-lg font-semibold text-white mb-2">Audit Logs</div>
                        <div className="text-sm text-zinc-400">View system activity</div>
                    </a>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;
