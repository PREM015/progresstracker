'use client';

import { useState, useEffect } from 'react';

export function PlatformHealth({ platformId }: { platformId: string }) {
    const [health, setHealth] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [platformId]);

    const fetchHealth = async () => {
        try {
            const res = await fetch(`/api/admin/platforms/${platformId}/health`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setHealth(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Checking platform health...</div>;
    }

    const statusColor = health?.status === 'HEALTHY' ? 'text-green-400' :
        health?.status === 'DEGRADED' ? 'text-yellow-400' :
            'text-red-400';

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Platform Health</h3>
                <button
                    onClick={fetchHealth}
                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-sm"
                >
                    Refresh
                </button>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Status</span>
                    <span className={`font-semibold ${statusColor}`}>{health?.status || 'UNKNOWN'}</span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Response Time</span>
                    <span className="text-white">{health?.responseTime || 0}ms</span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Uptime</span>
                    <span className="text-white">{health?.uptime || 0}%</span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Last Check</span>
                    <span className="text-white">{health?.lastCheck ? new Date(health.lastCheck).toLocaleTimeString() : 'Never'}</span>
                </div>

                {health?.errors && health.errors.length > 0 && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded">
                        <div className="text-red-400 font-semibold mb-2">Recent Errors:</div>
                        {health.errors.map((err: string, i: number) => (
                            <div key={i} className="text-red-300 text-sm">{err}</div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default PlatformHealth;
