'use client';

import { useAdminAchievementStats } from '@/hooks/useAdminGamification';

export function AchievementStats() {
    const { stats, isLoading: loading } = useAdminAchievementStats();

    if (loading) return <div className="p-8 text-center text-zinc-500">Loading stats...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Total Achievements</div>
                <div className="text-3xl font-bold text-white">{stats?.total || 0}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Unlocked</div>
                <div className="text-3xl font-bold text-green-400">{stats?.unlocked || 0}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Avg Points</div>
                <div className="text-3xl font-bold text-blue-400">{stats?.avgPoints || 0}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Completion Rate</div>
                <div className="text-3xl font-bold text-purple-400">{stats?.completionRate || 0}%</div>
            </div>
        </div>
    );
}

export default AchievementStats;
