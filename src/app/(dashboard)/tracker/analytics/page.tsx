"use client";

import { useState, useEffect } from "react";

export default function TrackerAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<any>(null);

    useEffect(() => {
        fetch('/api/tracker/analytics')
            .then(r => r.json())
            .then(data => setAnalytics(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold mb-8">Tracker Analytics</h1>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="text-3xl mb-2">📊</div>
                        <div className="text-2xl font-bold text-gray-900">{analytics?.totalEntries || 0}</div>
                        <div className="text-sm text-gray-600">Total Entries</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="text-3xl mb-2">⏱️</div>
                        <div className="text-2xl font-bold text-gray-900">{analytics?.avgPerDay || 0}</div>
                        <div className="text-sm text-gray-600">Avg Per Day</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="text-3xl mb-2">🔥</div>
                        <div className="text-2xl font-bold text-gray-900">{analytics?.streak || 0}</div>
                        <div className="text-sm text-gray-600">Current Streak</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
