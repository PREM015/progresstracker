import { useAdminMetrics } from '@/hooks/useAdminMetrics';

export function SystemMetrics() {
    const { system: metrics, isLoadingSystem: loading } = useAdminMetrics();

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading system metrics...</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Uptime</div>
                <div className="text-3xl font-bold text-green-400">{metrics?.uptime || 0}d</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Disk Usage</div>
                <div className="text-3xl font-bold text-yellow-400">{metrics?.diskUsage || 0}%</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Network I/O</div>
                <div className="text-3xl font-bold text-blue-400">{metrics?.networkIO || 0}MB/s</div>
            </div>
        </div>
    );
}

export default SystemMetrics;
