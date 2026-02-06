'use client';

import { useState, useEffect } from 'react';

export function SyncHistory() {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await fetch('/api/admin/sync/history');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setHistory(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading sync history...</div>;
    }

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800">
                <h3 className="text-lg font-semibold text-white">Sync History</h3>
            </div>

            <table className="w-full">
                <thead>
                    <tr className="border-b border-zinc-800">
                        <th className="text-left p-4 text-sm font-medium text-zinc-400">Platform</th>
                        <th className="text-left p-4 text-sm font-medium text-zinc-400">Status</th>
                        <th className="text-left p-4 text-sm font-medium text-zinc-400">Records</th>
                        <th className="text-left p-4 text-sm font-medium text-zinc-400">Duration</th>
                        <th className="text-left p-4 text-sm font-medium text-zinc-400">Time</th>
                    </tr>
                </thead>
                <tbody>
                    {history.map((sync) => (
                        <tr key={sync.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                            <td className="p-4 text-white">{sync.platform.name}</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded text-xs ${sync.status === 'SUCCESS' ? 'bg-green-500/20 text-green-400' :
                                        sync.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                                            'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                    {sync.status}
                                </span>
                            </td>
                            <td className="p-4 text-zinc-400">{sync.recordsProcessed || 0}</td>
                            <td className="p-4 text-zinc-400">{sync.duration || 0}s</td>
                            <td className="p-4 text-zinc-400 text-sm">
                                {new Date(sync.createdAt).toLocaleString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {history.length === 0 && (
                <div className="p-8 text-center text-zinc-500">No sync history available</div>
            )}
        </div>
    );
}

export default SyncHistory;
