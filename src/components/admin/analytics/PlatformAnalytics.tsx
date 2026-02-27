'use client';

import { useState, useEffect } from 'react';

export function PlatformAnalytics() {
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/analytics/platforms')
            .then(res => res.json())
            .then(data => setAnalytics(data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading platform analytics...</div>;
    }

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Platform Usage</h3>
            <div className="space-y-3">
                {analytics?.platforms?.map((platform: any) => (
                    <div key={platform.name} className="flex justify-between items-center p-3 bg-zinc-950 rounded-lg">
                        <span className="text-white">{platform.name}</span>
                        <div className="flex gap-4">
                            <span className="text-zinc-400">{platform.users} users</span>
                            <span className="text-green-400">{platform.growth}% growth</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default PlatformAnalytics;
