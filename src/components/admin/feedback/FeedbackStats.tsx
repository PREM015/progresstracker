'use client';

import { useState, useEffect } from 'react';

export function FeedbackStats() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/feedback/stats')
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
                <div className="text-sm text-zinc-500 mb-2">Total Feedback</div>
                <div className="text-3xl font-bold text-white">{stats?.total || 0}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Bug Reports</div>
                <div className="text-3xl font-bold text-red-400">{stats?.bugs || 0}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Feature Requests</div>
                <div className="text-3xl font-bold text-blue-400">{stats?.features || 0}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Avg Response Time</div>
                <div className="text-3xl font-bold text-purple-400">{stats?.avgResponseTime || 0}h</div>
            </div>
        </div>
    );
}

export default FeedbackStats;
