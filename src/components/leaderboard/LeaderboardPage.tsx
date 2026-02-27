'use client';

import React, { useState, useEffect } from 'react';

interface LeaderboardUser {
  rank: number;
  username: string;
  avatar?: string;
  score: number;
  streak: number;
}

interface LeaderboardPageProps {
  className?: string;
}

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({
  className = '',
}) => {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'alltime'>('week');

  useEffect(() => {
    fetch(`/api/leaderboard?timeframe=${timeframe}`)
      .then(r => r.json())
      .then(data => setUsers(data));
  }, [timeframe]);

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'from-yellow-400 to-yellow-500';
    if (rank === 2) return 'from-gray-300 to-gray-400';
    if (rank === 3) return 'from-amber-600 to-amber-700';
    return 'from-gray-100 to-gray-200';
  };

  return (
    <div className={`bg-white rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">🏆 Leaderboard</h2>

        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as any)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="alltime">All Time</option>
        </select>
      </div>

      <div className="space-y-3">
        {users.map(user => (
          <div
            key={user.username}
            className={`flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r ${getRankColor(user.rank)}`}
          >
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center font-bold text-lg">
              #{user.rank}
            </div>
            {user.avatar && (
              <img src={user.avatar} alt={user.username} className="w-12 h-12 rounded-full" />
            )}
            <div className="flex-1">
              <div className="font-bold">{user.username}</div>
              <div className="text-sm opacity-75">🔥 {user.streak} day streak</div>
            </div>
            <div className="text-2xl font-bold">{user.score}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeaderboardPage;
