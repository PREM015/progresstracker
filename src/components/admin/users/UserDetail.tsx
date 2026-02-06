'use client';

import { useState, useEffect } from 'react';

interface UserDetailProps {
    userId: string;
}

interface UserDetails {
    id: string;
    name: string | null;
    email: string | null;
    username: string | null;
    image: string | null;
    isActive: boolean;
    isBanned: boolean;
    isAdmin: boolean;
    role: string;
    currentStreak: number;
    totalPoints: number;
    createdAt: string;
    lastActiveAt: string | null;
    banReason: string | null;
    bannedAt: string | null;
    subscription: {
        tier: string;
        status: string;
    } | null;
    platforms: Array<{
        id: string;
        platform: { name: string; category: string };
        isActive: boolean;
        syncStatus: string;
    }>;
    goals: Array<{
        id: string;
        title: string;
        status: string;
        progress: number;
    }>;
    _count: {
        trackerEntries: number;
        goals: number;
        achievements: number;
        notifications: number;
    };
    recentActivity: Array<{
        id: string;
        action: string;
        description: string | null;
        createdAt: string;
    }>;
}

export function UserDetail({ userId }: UserDetailProps) {
    const [user, setUser] = useState<UserDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'platforms' | 'goals'>('overview');

    useEffect(() => {
        fetchUser();
    }, [userId]);

    const fetchUser = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users/${userId}`);
            if (!res.ok) throw new Error('Failed to fetch user');
            const data = await res.json();
            setUser(data);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-20 bg-zinc-800 rounded" />
                    <div className="h-40 bg-zinc-800 rounded" />
                </div>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                <div className="text-red-400 mb-2">Error loading user</div>
                <div className="text-sm text-zinc-500">{error}</div>
                <button
                    onClick={fetchUser}
                    className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* User Header */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-start gap-6">
                    {user.image ? (
                        <img src={user.image} alt={user.name || 'User'} className="w-24 h-24 rounded-full" />
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                            {(user.name || user.email || 'U')[0].toUpperCase()}
                        </div>
                    )}

                    <div className="flex-1">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white">{user.name || 'No name'}</h2>
                                <div className="text-zinc-400 mt-1">{user.email}</div>
                                {user.username && <div className="text-zinc-600 text-sm mt-1">@{user.username}</div>}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${user.isAdmin ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-300'
                                    }`}>
                                    {user.role}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${user.isBanned
                                        ? 'bg-red-500/20 text-red-400'
                                        : user.isActive
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                    {user.isBanned ? 'Banned' : user.isActive ? 'Active' : 'Inactive'}
                                </span>
                                {user.subscription && (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                                        {user.subscription.tier}
                                    </span>
                                )}
                            </div>
                        </div>

                        {user.isBanned && user.banReason && (
                            <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg">
                                <div className="text-sm text-red-400 font-medium">Banned</div>
                                <div className="text-sm text-zinc-400 mt-1">{user.banReason}</div>
                                {user.bannedAt && (
                                    <div className="text-xs text-zinc-600 mt-1">
                                        Banned on {new Date(user.bannedAt).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-4 gap-4 mt-6">
                            <div>
                                <div className="text-zinc-500 text-sm">Streak</div>
                                <div className="text-2xl font-bold text-white mt-1">
                                    <span className="text-orange-500">{user.currentStreak}</span> days
                                </div>
                            </div>
                            <div>
                                <div className="text-zinc-500 text-sm">Points</div>
                                <div className="text-2xl font-bold text-white mt-1">
                                    {user.totalPoints.toLocaleString()}
                                </div>
                            </div>
                            <div>
                                <div className="text-zinc-500 text-sm">Goals</div>
                                <div className="text-2xl font-bold text-white mt-1">{user._count.goals}</div>
                            </div>
                            <div>
                                <div className="text-zinc-500 text-sm">Achievements</div>
                                <div className="text-2xl font-bold text-white mt-1">{user._count.achievements}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-zinc-800">
                {(['overview', 'activity', 'platforms', 'goals'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 font-medium capitalize transition-colors ${activeTab === tab
                                ? 'text-white border-b-2 border-indigo-500'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Account Info</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between py-2 border-b border-zinc-800">
                                <span className="text-zinc-500 text-sm">User ID</span>
                                <span className="text-white text-sm font-medium">{user.id}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-zinc-800">
                                <span className="text-zinc-500 text-sm">Created</span>
                                <span className="text-white text-sm font-medium">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-zinc-800">
                                <span className="text-zinc-500 text-sm">Last Active</span>
                                <span className="text-white text-sm font-medium">
                                    {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : 'Never'}
                                </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-zinc-800">
                                <span className="text-zinc-500 text-sm">Tracker Entries</span>
                                <span className="text-white text-sm font-medium">{user._count.trackerEntries}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Subscription</h3>
                        {user.subscription ? (
                            <div className="space-y-3">
                                <div className="flex justify-between py-2 border-b border-zinc-800">
                                    <span className="text-zinc-500 text-sm">Tier</span>
                                    <span className="text-white text-sm font-medium">{user.subscription.tier}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-zinc-800">
                                    <span className="text-zinc-500 text-sm">Status</span>
                                    <span className="text-white text-sm font-medium">{user.subscription.status}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-zinc-500 text-sm">No active subscription</div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'activity' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                    {user.recentActivity && user.recentActivity.length > 0 ? (
                        <div className="space-y-3">
                            {user.recentActivity.map((log) => (
                                <div key={log.id} className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
                                    <div className="flex-1">
                                        <div className="text-white text-sm">{log.description || log.action}</div>
                                        <div className="text-zinc-500 text-xs mt-1">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-zinc-500 text-sm">No recent activity</div>
                    )}
                </div>
            )}

            {activeTab === 'platforms' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Connected Platforms</h3>
                    {user.platforms && user.platforms.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {user.platforms.map((platform) => (
                                <div key={platform.id} className="p-4 bg-zinc-800/50 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-white">{platform.platform.name}</div>
                                            <div className="text-sm text-zinc-500">{platform.platform.category}</div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${platform.isActive ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-300'
                                                }`}>
                                                {platform.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-zinc-700 text-zinc-300">
                                                {platform.syncStatus}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-zinc-500 text-sm">No connected platforms</div>
                    )}
                </div>
            )}

            {activeTab === 'goals' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Goals</h3>
                    {user.goals && user.goals.length > 0 ? (
                        <div className="space-y-3">
                            {user.goals.map((goal) => (
                                <div key={goal.id} className="p-4 bg-zinc-800/50 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="font-medium text-white">{goal.title}</div>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${goal.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-300'
                                            }`}>
                                            {goal.status}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 transition-all"
                                            style={{ width: `${goal.progress}%` }}
                                        />
                                    </div>
                                    <div className="text-xs text-zinc-500 mt-1">{goal.progress}% complete</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-zinc-500 text-sm">No goals yet</div>
                    )}
                </div>
            )}
        </div>
    );
}

export default UserDetail;
