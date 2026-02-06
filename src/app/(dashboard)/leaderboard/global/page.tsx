"use client";

import { useState, useEffect } from "react";

export default function GlobalLeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('all-time');

    useEffect(() => {
        fetch(`/api/leaderboard/global?timeframe=${timeframe}`)
            .then(r => r.json())
            .then(data => setLeaderboard(data.users || []))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [timeframe]);

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
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-4xl font-bold">Global Leaderboard</h1>
                    <select
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg"
                    >
                        <option value="all-time">All Time</option>
                        <option value="month">This Month</option>
                        <option value="week">This Week</option>
                    </select>
                </div>

                {leaderboard.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
                        <span className="text-5xl">🏆</span>
                        <p className="mt-4 text-gray-500">No leaderboard data yet</p>
                    </div>
                ) : (
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="divide-y divide-gray-200">
                            {leaderboard.map((user, idx) => (
                                <div key={user.id} className="p-6 flex items-center gap-4 hover:bg-gray-50 transition">
                                    <div className={`text-3xl font-bold ${idx === 0 ? 'text-yellow-500' :
                                            idx === 1 ? 'text-gray-400' :
                                                idx === 2 ? 'text-amber-600' :
                                                    'text-gray-300'
                                        }`}>
                                        #{idx + 1}
                                    </div>

                                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                                        {user.image ? (
                                            <img src={user.image} alt={user.name} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            <span className="text-xl">👤</span>
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <div className="font-bold text-gray-900">{user.name || user.username}</div>
                                        <div className="text-sm text-gray-600">@{user.username}</div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-indigo-600">{user.totalPoints || 0}</div>
                                        <div className="text-xs text-gray-600">points</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
