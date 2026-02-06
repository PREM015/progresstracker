'use client';

import { useState, useEffect } from 'react';

export function WaitlistDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/waitlist/stats')
            .then(res => res.json())
            .then(data => setStats(data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading waitlist stats...</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Total Signups</div>
                <div className="text-3xl font-bold text-white">{stats?.total || 0}</div>
                <div className="text-xs text-zinc-600 mt-1">All time</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Pending</div>
                <div className="text-3xl font-bold text-yellow-400">{stats?.pending || 0}</div>
                <div className="text-xs text-yellow-500 mt-1">Awaiting approval</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Approved</div>
                <div className="text-3xl font-bold text-green-400">{stats?.approved || 0}</div>
                <div className="text-xs text-green-500 mt-1">Invited</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Conversion Rate</div>
                <div className="text-3xl font-bold text-purple-400">{stats?.conversionRate || 0}%</div>
                <div className="text-xs text-zinc-600 mt-1">Approved → Registered</div>
            </div>
        </div>
    );
}

export default WaitlistDashboard;
