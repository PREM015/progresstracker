'use client';

import { useState, useEffect } from 'react';

export function NewsletterDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/newsletter/stats');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setStats(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading newsletter stats...</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Total Subscribers</div>
                <div className="text-3xl font-bold text-white">{stats?.totalSubscribers || 0}</div>
                <div className="text-xs text-zinc-600 mt-1">All time</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Active Subscribers</div>
                <div className="text-3xl font-bold text-green-400">{stats?.activeSubscribers || 0}</div>
                <div className="text-xs text-green-500 mt-1">Currently subscribed</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Newsletters Sent</div>
                <div className="text-3xl font-bold text-blue-400">{stats?.newslettersSent || 0}</div>
                <div className="text-xs text-zinc-600 mt-1">This month</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Avg Open Rate</div>
                <div className="text-3xl font-bold text-purple-400">{stats?.avgOpenRate || 0}%</div>
                <div className="text-xs text-zinc-600 mt-1">Last 30 days</div>
            </div>
        </div>
    );
}

export default NewsletterDashboard;
