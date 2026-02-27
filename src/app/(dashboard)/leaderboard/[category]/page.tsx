"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function LeaderboardCategoryPage() {
    const params = useParams();
    const category = params.category as string;

    const [leaders, setLeaders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/leaderboard/${category}`)
            .then(r => r.json())
            .then(data => setLeaders(data.leaders || []))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [category]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-8 capitalize">{category.replace(/-/g, ' ')} Leaderboard</h1>

                {leaders.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
                        <span className="text-5xl">🏆</span>
                        <p className="mt-4 text-gray-500">No leaders in this category yet</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {leaders.map((leader, idx) => (
                            <div key={leader.userId} className={`bg-white border rounded-xl p-6 ${idx === 0 ? 'border-yellow-400 bg-yellow-50' :
                                    idx === 1 ? 'border-gray-400 bg-gray-50' :
                                        idx === 2 ? 'border-amber-600 bg-amber-50' :
                                            'border-gray-200'
                                }`}>
                                <div className="flex items-center gap-4">
                                    <div className={`text-3xl font-bold ${idx === 0 ? 'text-yellow-600' :
                                            idx === 1 ? 'text-gray-600' :
                                                idx === 2 ? 'text-amber-700' :
                                                    'text-gray-400'
                                        }`}>
                                        #{idx + 1}
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-900">{leader.username}</h3>
                                        <div className="text-sm text-gray-600 mt-1">
                                            {leader.score} points • {leader.achievements} achievements
                                        </div>
                                    </div>

                                    {idx < 3 && (
                                        <span className="text-4xl">
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
