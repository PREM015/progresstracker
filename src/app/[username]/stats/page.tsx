"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function UserStatsPage() {
  const params = useParams();
  const username = params.username as string;

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/profile/${username}/stats`)
      .then(r => r.json())
      .then(data => setStats(data.stats))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl">📊</span>
          <p className="mt-4 text-gray-500">No stats available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">@{username}'s Stats</h1>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="text-3xl mb-2">💡</div>
            <div className="text-3xl font-bold text-indigo-600">{stats.totalProblems || 0}</div>
            <div className="text-sm text-gray-600 mt-1">Total Problems</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="text-3xl mb-2">📝</div>
            <div className="text-3xl font-bold text-purple-600">{stats.totalCommits || 0}</div>
            <div className="text-sm text-gray-600 mt-1">Total Commits</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="text-3xl mb-2">🔥</div>
            <div className="text-3xl font-bold text-orange-600">{stats.currentStreak || 0}</div>
            <div className="text-sm text-gray-600 mt-1">Current Streak</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-3xl font-bold text-yellow-600">{stats.achievements || 0}</div>
            <div className="text-sm text-gray-600 mt-1">Achievements</div>
          </div>
        </div>

        {stats.platformStats && stats.platformStats.length > 0 && (
          <div className="mt-8 bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6">Platform Stats</h2>
            <div className="space-y-4">
              {stats.platformStats.map((platform: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{platform.icon || '🌐'}</span>
                    <span className="font-medium text-gray-900">{platform.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{platform.value}</div>
                    <div className="text-xs text-gray-500">{platform.metric}</div>
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
