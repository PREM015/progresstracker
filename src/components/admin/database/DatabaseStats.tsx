'use client';
import { useState, useEffect } from 'react';
export function DatabaseStats() {
    const [stats, setStats] = useState<any>(null);
    useEffect(() => { fetch('/api/admin/database/stats').then(r => r.json()).then(d => setStats(d)); }, []);
    return <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"><div className="text-sm text-zinc-500 mb-2">Total Records</div><div className="text-3xl font-bold text-white">{stats?.totalRecords || 0}</div></div><div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"><div className="text-sm text-zinc-500 mb-2">Size</div><div className="text-3xl font-bold text-white">{stats?.size || 0} MB</div></div><div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"><div className="text-sm text-zinc-500 mb-2">Tables</div><div className="text-3xl font-bold text-white">{stats?.tables || 0}</div></div></div>;
}
export default DatabaseStats;
