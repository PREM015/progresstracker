'use client';

import { useState, useEffect } from 'react';

export function ReportsAnalytics() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('30d');

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/admin/reports/analytics?range=${dateRange}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const result = await res.json();
            setData(result);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Generating analytics report...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Analytics Report</h2>
                <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
                >
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                    <option value="1y">Last Year</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="text-sm text-zinc-500 mb-2">Total Users</div>
                    <div className="text-3xl font-bold text-white">{data?.users || 0}</div>
                    <div className="text-xs text-green-400 mt-1">+{data?.userGrowth || 0}%</div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="text-sm text-zinc-500 mb-2">Active Sessions</div>
                    <div className="text-3xl font-bold text-blue-400">{data?.sessions || 0}</div>
                    <div className="text-xs text-zinc-600 mt-1">Avg: {data?.avgSessionTime || 0} min</div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="text-sm text-zinc-500 mb-2">Goals Created</div>
                    <div className="text-3xl font-bold text-purple-400">{data?.goals || 0}</div>
                    <div className="text-xs text-purple-500 mt-1">{data?.completionRate || 0}% completed</div>
                </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Top Platforms</h3>
                <div className="space-y-3">
                    {data?.topPlatforms?.map((platform: any, i: number) => (
                        <div key={i} className="flex justify-between items-center">
                            <span className="text-white">{platform.name}</span>
                            <span className="text-zinc-400">{platform.users} users</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default ReportsAnalytics;
