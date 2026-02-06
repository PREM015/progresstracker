'use client';

import { useState, useEffect } from 'react';

export function UserAnalytics() {
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        fetch('/api/admin/analytics/users')
            .then(res => res.json())
            .then(d => setData(d));
    }, []);

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">User Analytics</h3>
            <div className="space-y-4">
                <div className="flex justify-between">
                    <span className="text-zinc-400">New signups</span>
                    <span className="text-white font-medium">{data?.newSignups || 0}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-400">Retention rate</span>
                    <span className="text-white font-medium">{data?.retentionRate || 0}%</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-400">Avg session time</span>
                    <span className="text-white font-medium">{data?.avgSessionTime || 0} min</span>
                </div>
            </div>
        </div>
    );
}

export default UserAnalytics;
