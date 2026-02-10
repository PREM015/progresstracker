'use client';
import { useAdminTemplateStats } from '@/hooks/useAdminTemplates';

export function GoalTemplateStats() {
    const { stats, isLoading } = useAdminTemplateStats();

    if (isLoading) return <div className="p-8 text-center text-zinc-500">Loading stats...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Total Templates</div>
                <div className="text-3xl font-bold text-white">{stats?.total || 0}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Most Popular</div>
                <div className="text-3xl font-bold text-green-400">{stats?.popularCategory || '-'}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Active Users</div>
                <div className="text-3xl font-bold text-blue-400">{stats?.activeUsers || 0}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Avg Completion</div>
                <div className="text-3xl font-bold text-purple-400">{stats?.completionRate || 0}%</div>
            </div>
        </div>
    );
}

export default GoalTemplateStats;
