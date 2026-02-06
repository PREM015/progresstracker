'use client';

import { useState, useEffect } from 'react';

export function PerformanceMetrics() {
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/metrics/performance')
            .then(res => res.json())
            .then(data => setMetrics(data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading performance metrics...</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Page Load Time</div>
                <div className="text-3xl font-bold text-blue-400">{metrics?.pageLoadTime || 0}ms</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Time to Interactive</div>
                <div className="text-3xl font-bold text-green-400">{metrics?.tti || 0}ms</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">First Contentful Paint</div>
                <div className="text-3xl font-bold text-purple-400">{metrics?.fcp || 0}ms</div>
            </div>
        </div>
    );
}

export default PerformanceMetrics;
