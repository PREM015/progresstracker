'use client';

import { useState, useEffect } from 'react';

export function NewsletterStats() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/newsletter/stats')
            .then(res => res.json())
            .then(data => setStats(data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading stats...</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Open Rate</div>
                <div className="text-3xl font-bold text-green-400">{stats?.openRate || 0}%</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Click Rate</div>
                <div className="text-3xl font-bold text-blue-400">{stats?.clickRate || 0}%</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Unsubscribes</div>
                <div className="text-3xl font-bold text-red-400">{stats?.unsubscribes || 0}</div>
            </div>
        </div>
    );
}

export default NewsletterStats;
