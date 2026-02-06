'use client';

import React from 'react';

interface LeaderboardCardProps {
  user: {
    rank: number;
    username: string;
    avatar?: string;
    score: number;
    change: number;
  };
  className?: string;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  user,
  className = '',
}) => {
  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className={`bg-white border rounded-xl p-4 hover:shadow-lg transition-shadow ${className}`}>
      <div className="flex items-center gap-4">
        <div className="text-2xl font-bold w-16 text-center">
          {getRankBadge(user.rank)}
        </div>
        {user.avatar && (
          <img src={user.avatar} alt={user.username} className="w-12 h-12 rounded-full" />
        )}
        <div className="flex-1">
          <div className="font-bold text-lg">{user.username}</div>
          <div className="text-sm text-gray-600">
            {user.change > 0 && <span className="text-green-600">↑ {user.change}</span>}
            {user.change < 0 && <span className="text-red-600">↓ {Math.abs(user.change)}</span>}
            {user.change === 0 && <span className="text-gray-500">−</span>}
          </div>
        </div>
        <div className="text-2xl font-bold text-indigo-600">{user.score}</div>
      </div>
    </div>
  );
};

export default LeaderboardCard;
