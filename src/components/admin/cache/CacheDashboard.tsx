'use client';
import { useState, useEffect } from 'react';

export function CacheDashboard() {
    const [stats, setStats] = useState<any>(null);
    useEffect(() => {
        fetch('/api/admin/cache/stats').then(r => r.json()).then(d => setStats(d));
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Total Keys</div>
                <div className="text-3xl font-bold text-white">{stats?.totalKeys || 0}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Hit Rate</div>
                <div className="text-3xl font-bold text-green-400">{stats?.hitRate || 0}%</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Memory Used</div>
                <div className="text-3xl font-bold text-blue-400">{stats?.memoryUsed || 0} MB</div>
            </div>
        </div>
    );
}
export default CacheDashboard;
