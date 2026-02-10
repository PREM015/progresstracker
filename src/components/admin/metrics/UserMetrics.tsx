import { useAdminMetrics } from '@/hooks/useAdminMetrics';

export function UserMetrics() {
    const { users: metrics, isLoadingUsers: loading } = useAdminMetrics();

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading user metrics...</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Active Users (24h)</div>
                <div className="text-3xl font-bold text-green-400">{metrics?.activeUsers || 0}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">New Signups</div>
                <div className="text-3xl font-bold text-blue-400">{metrics?.newSignups || 0}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Avg Session Time</div>
                <div className="text-3xl font-bold text-purple-400">{metrics?.avgSessionTime || 0}m</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Retention Rate</div>
                <div className="text-3xl font-bold text-yellow-400">{metrics?.retentionRate || 0}%</div>
            </div>
        </div>
    );
}

export default UserMetrics;
