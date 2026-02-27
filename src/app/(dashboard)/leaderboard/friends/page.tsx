"use client";

import { useState, useEffect } from "react";

export default function FriendsLeaderboardPage() {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard/friends')
      .then(r => r.json())
      .then(data => setFriends(data.friends || []))
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
        <h1 className="text-4xl font-bold mb-8">Friends Leaderboard</h1>

        {friends.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">👥</span>
            <p className="mt-4 text-gray-500">No friends yet</p>
            <p className="text-sm text-gray-400 mt-2">Add friends to see how you compare!</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="divide-y divide-gray-200">
              {friends.map((friend, idx) => (
                <div key={friend.id} className="p-6 flex items-center gap-4 hover:bg-gray-50 transition">
                  <div className="text-2xl font-bold text-gray-300">#{idx + 1}</div>

                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                    {friend.image ? (
                      <img src={friend.image} alt={friend.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-xl">👤</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="font-bold text-gray-900">{friend.name || friend.username}</div>
                    <div className="text-sm text-gray-600">{friend.currentStreak || 0} day streak 🔥</div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-bold text-indigo-600">{friend.totalPoints || 0}</div>
                    <div className="text-xs text-gray-600">points</div>
                  </div>

                  <a
                    href={`/${friend.username}`}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    View Profile
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
