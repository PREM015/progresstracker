'use client';

import { useState, useEffect } from 'react';

export function RevenueChart() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/billing/revenue-chart')
            .then(res => res.json())
            .then(data => setData(data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading revenue chart...</div>;
    }

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Revenue Trend</h3>

            <div className="space-y-4">
                {data?.months?.map((month: any) => (
                    <div key={month.label} className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">{month.label}</span>
                            <span className="text-green-400 font-semibold">${month.revenue}</span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-2">
                            <div
                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                                style={{ width: `${(month.revenue / data.max) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default RevenueChart;
