'use client';

import { useState, useEffect } from 'react';

export function WaitlistEntries() {
    const [entries, setEntries] = useState<any[]>([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEntries();
    }, [filter]);

    const fetchEntries = async () => {
        try {
            const res = await fetch(`/api/admin/waitlist?status=${filter}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setEntries(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const approveEntry = async (id: string) => {
        try {
            await fetch(`/api/admin/waitlist/${id}/approve`, { method: 'POST' });
            fetchEntries();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const rejectEntry = async (id: string) => {
        if (!confirm('Reject this waitlist entry?')) return;
        try {
            await fetch(`/api/admin/waitlist/${id}/reject`, { method: 'POST' });
            fetchEntries();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading waitlist entries...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Filter */}
            <div className="flex gap-2">
                {['all', 'pending', 'approved', 'rejected'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === status
                                ? 'bg-indigo-600 text-white'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                ))}
            </div>

            {/* Entries */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-zinc-800">
                            <th className="text-left p-4 text-sm font-medium text-zinc-400">Email</th>
                            <th className="text-left p-4 text-sm font-medium text-zinc-400">Name</th>
                            <th className="text-left p-4 text-sm font-medium text-zinc-400">Status</th>
                            <th className="text-left p-4 text-sm font-medium text-zinc-400">Date</th>
                            <th className="text-left p-4 text-sm font-medium text-zinc-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((entry) => (
                            <tr key={entry.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                                <td className="p-4 text-white">{entry.email}</td>
                                <td className="p-4 text-zinc-400">{entry.name || '-'}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs ${entry.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                                            entry.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                                                'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                        {entry.status}
                                    </span>
                                </td>
                                <td className="p-4 text-zinc-400 text-sm">
                                    {new Date(entry.createdAt).toLocaleDateString()}
                                </td>
                                <td className="p-4">
                                    {entry.status === 'PENDING' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => approveEntry(entry.id)}
                                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => rejectEntry(entry.id)}
                                                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {entries.length === 0 && (
                    <div className="p-8 text-center text-zinc-500">No entries found</div>
                )}
            </div>
        </div>
    );
}

export default WaitlistEntries;
