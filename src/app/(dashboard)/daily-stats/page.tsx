"use client";

import { useState, useEffect } from "react";

export default function DailyStatsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetch(`/api/stats/daily?date=${selectedDate}`)
      .then(r => r.json())
      .then(data => setStats(data.stats))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedDate]);

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
          <h1 className="text-4xl font-bold">Daily Stats</h1>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg"
          />
        </div>

        {!stats ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <span className="text-5xl">📅</span>
            <p className="mt-4 text-gray-500">No data for this date</p>
            <p className="text-sm text-gray-400 mt-2">Start tracking to see your daily stats</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="text-3xl mb-2">💡</div>
                <div className="text-2xl font-bold text-gray-900">{stats.problemsSolved || 0}</div>
                <div className="text-sm text-gray-600">Problems Solved</div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="text-3xl mb-2">⏱️</div>
                <div className="text-2xl font-bold text-gray-900">{stats.minutesSpent || 0}m</div>
                <div className="text-sm text-gray-600">Time Spent</div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="text-3xl mb-2">📝</div>
                <div className="text-2xl font-bold text-gray-900">{stats.commits || 0}</div>
                <div className="text-sm text-gray-600">Commits</div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="text-3xl mb-2">⭐</div>
                <div className="text-2xl font-bold text-gray-900">{stats.points || 0}</div>
                <div className="text-sm text-gray-600">Points Earned</div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Platform Breakdown</h2>
              <div className="space-y-3">
                {stats.platformStats?.map((platform: any) => (
                  <div key={platform.name} className="flex items-center justify-between">
                    <span className="text-gray-700">{platform.name}</span>
                    <span className="text-gray-900 font-medium">{platform.count} activities</span>
                  </div>
                ))}
                {(!stats.platformStats || stats.platformStats.length === 0) && (
                  <p className="text-gray-400 text-sm">No platform activity today</p>
                )}
              </div>
            </div>

            {stats.goals && stats.goals.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">Goals Progress</h2>
                <div className="space-y-3">
                  {stats.goals.map((goal: any) => (
                    <div key={goal.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700">{goal.title}</span>
                        <span className="text-sm text-gray-500">{goal.progress}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
