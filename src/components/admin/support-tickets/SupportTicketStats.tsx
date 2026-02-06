'use client';

import { useState, useEffect } from 'react';

export function SupportTicketStats() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/support-tickets/stats')
            .then(res => res.json())
            .then(data => setStats(data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading stats...</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Open Tickets</div>
                <div className="text-3xl font-bold text-yellow-400">{stats?.open || 0}</div>
                <div className="text-xs text-zinc-600 mt-1">Awaiting response</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">In Progress</div>
                <div className="text-3xl font-bold text-blue-400">{stats?.inProgress || 0}</div>
                <div className="text-xs text-blue-500 mt-1">Being handled</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Resolved</div>
                <div className="text-3xl font-bold text-green-400">{stats?.resolved || 0}</div>
                <div className="text-xs text-zinc-600 mt-1">This month</div>
            </div>

            <div className=" bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Avg Response Time</div>
                <div className="text-3xl font-bold text-purple-400">{stats?.avgResponseTime || 0}h</div>
                <div className="text-xs text-zinc-600 mt-1">Last 30 days</div>
            </div>
        </div>
    );
}

export default SupportTicketStats;
