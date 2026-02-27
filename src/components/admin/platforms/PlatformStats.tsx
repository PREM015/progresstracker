'use client';

import { useState, useEffect } from 'react';

export function PlatformStats() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/platforms/stats')
            .then(res => res.json())
            .then(data => setStats(data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading platform stats...</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Total Platforms</div>
                <div className="text-3xl font-bold text-white">{stats?.total || 0}</div>
                <div className="text-xs text-zinc-600 mt-1">Configured</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Active</div>
                <div className="text-3xl font-bold text-green-400">{stats?.active || 0}</div>
                <div className="text-xs text-green-500 mt-1">Currently enabled</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Connected Users</div>
                <div className="text-3xl font-bold text-blue-400">{stats?.connectedUsers || 0}</div>
                <div className="text-xs text-zinc-600 mt-1">Total connections</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Sync Rate</div>
                <div className="text-3xl font-bold text-purple-400">{stats?.syncRate || 0}%</div>
                <div className="text-xs text-zinc-600 mt-1">Success rate</div>
            </div>
        </div>
    );
}

export default PlatformStats;
