"use client";

import { useState, useEffect } from "react";

export default function MonthlyLeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard/monthly')
      .then(r => r.json())
      .then(data => setLeaderboard(data.users || []))
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Monthly Leaderboard</h1>
          <p className="text-gray-600 mt-2">Top performers this month</p>
        </div>

        {leaderboard.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">🏆</span>
            <p className="mt-4 text-gray-500">No data for this month yet</p>
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
                    <div className="text-2xl font-bold text-indigo-600">{user.monthlyPoints || 0}</div>
                    <div className="text-xs text-gray-600">points this month</div>
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
