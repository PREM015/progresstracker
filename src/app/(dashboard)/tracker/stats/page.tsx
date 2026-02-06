"use client";

import { useState, useEffect } from "react";

export default function TrackerStatsPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        fetch('/api/tracker/stats')
            .then(r => r.json())
            .then(data => setStats(data))
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
                <h1 className="text-4xl font-bold mb-8">Tracker Statistics</h1>

                <div className="grid md:grid-cols-4 gap-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="text-3xl mb-2">📊</div>
                        <div className="text-2xl font-bold text-gray-900">{stats?.totalEntries || 0}</div>
                        <div className="text-sm text-gray-600">Total Entries</div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="text-3xl mb-2">📅</div>
                        <div className="text-2xl font-bold text-gray-900">{stats?.thisWeek || 0}</div>
                        <div className="text-sm text-gray-600">This Week</div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="text-3xl mb-2">📈</div>
                        <div className="text-2xl font-bold text-gray-900">{stats?.thisMonth || 0}</div>
                        <div className="text-sm text-gray-600">This Month</div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="text-3xl mb-2">⏱️</div>
                        <div className="text-2xl font-bold text-gray-900">{stats?.avgPerDay || 0}</div>
                        <div className="text-sm text-gray-600">Avg Per Day</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
