'use client';

import { useAdminMetrics } from '@/hooks/useAdminMetrics';

export function MetricsDashboard() {
    const { dashboard: metrics, isLoadingDashboard: loading } = useAdminMetrics();

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading metrics...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="text-sm text-zinc-500 mb-2">CPU Usage</div>
                    <div className="text-3xl font-bold text-blue-400">{metrics?.cpu || 0}%</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="text-sm text-zinc-500 mb-2">Memory Usage</div>
                    <div className="text-3xl font-bold text-purple-400">{metrics?.memory || 0}%</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="text-sm text-zinc-500 mb-2">Response Time</div>
                    <div className="text-3xl font-bold text-green-400">{metrics?.responseTime || 0}ms</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="text-sm text-zinc-500 mb-2">Active Connections</div>
                    <div className="text-3xl font-bold text-yellow-400">{metrics?.connections || 0}</div>
                </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">System Health</h3>
                <div className="space-y-3">
                    {metrics?.services?.map((service: any) => (
                        <div key={service.name} className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg">
                            <span className="text-white">{service.name}</span>
                            <span className={`px-3 py-1 rounded text-sm ${service.status === 'healthy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                {service.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default MetricsDashboard;
