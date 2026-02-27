'use client';

import { useState, useEffect } from 'react';

export function RevenueAnalytics() {
    const [revenue, setRevenue] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/analytics/revenue')
            .then(res => res.json())
            .then(data => setRevenue(data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading revenue analytics...</div>;
    }

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Revenue Analytics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <div className="text-sm text-zinc-500 mb-2">Total Revenue</div>
                    <div className="text-3xl font-bold text-green-400">${revenue?.total || 0}</div>
                </div>
                <div>
                    <div className="text-sm text-zinc-500 mb-2">Monthly Recurring Revenue</div>
                    <div className="text-3xl font-bold text-blue-400">${revenue?.mrr || 0}</div>
                </div>
                <div>
                    <div className="text-sm text-zinc-500 mb-2">Average Revenue Per User</div>
                    <div className="text-3xl font-bold text-purple-400">${revenue?.arpu || 0}</div>
                </div>
            </div>
        </div>
    );
}

export default RevenueAnalytics;
