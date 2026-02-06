"use client";

import { useState, useEffect } from "react";

export default function TrackerStreakPage() {
    const [loading, setLoading] = useState(true);
    const [streakData, setStreakData] = useState<any>(null);

    useEffect(() => {
        fetch('/api/tracker/streak')
            .then(r => r.json())
            .then(data => setStreakData(data))
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
            <div className="max-w-5xl mx-auto">
                <h1 className="text-4xl font-bold mb-8">🔥 Tracker Streak</h1>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                        <div className="text-6xl mb-4">🔥</div>
                        <div className="text-4xl font-bold text-gray-900">{streakData?.currentStreak || 0}</div>
                        <div className="text-gray-600 mt-2">Current Streak (days)</div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                        <div className="text-6xl mb-4">⭐</div>
                        <div className="text-4xl font-bold text-gray-900">{streakData?.longestStreak || 0}</div>
                        <div className="text-gray-600 mt-2">Longest Streak (days)</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
