import { useAdminMetrics } from '@/hooks/useAdminMetrics';

export function ApiMetrics() {
    const { api: metrics, isLoadingApi: loading } = useAdminMetrics();

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading API metrics...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="text-sm text-zinc-500 mb-2">Total Requests</div>
                    <div className="text-3xl font-bold text-white">{metrics?.totalRequests || 0}</div>
                    <div className="text-xs text-zinc-600 mt-1">Last 24 hours</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="text-sm text-zinc-500 mb-2">Avg Latency</div>
                    <div className="text-3xl font-bold text-blue-400">{metrics?.avgLatency || 0}ms</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="text-sm text-zinc-500 mb-2">Error Rate</div>
                    <div className="text-3xl font-bold text-red-400">{metrics?.errorRate || 0}%</div>
                </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800">
                    <h3 className="text-white font-semibold">Top Endpoints</h3>
                </div>
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-zinc-800">
                            <th className="text-left p-3 text-sm font-medium text-zinc-400">Endpoint</th>
                            <th className="text-left p-3 text-sm font-medium text-zinc-400">Requests</th>
                            <th className="text-left p-3 text-sm font-medium text-zinc-400">Avg Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {metrics?.topEndpoints?.map((endpoint, i) => (
                            <tr key={i} className="border-b border-zinc-800">
                                <td className="p-3 text-white font-mono text-sm">{endpoint.path}</td>
                                <td className="p-3 text-zinc-400">{endpoint.count}</td>
                                <td className="p-3 text-zinc-400">{endpoint.avgTime}ms</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ApiMetrics;
