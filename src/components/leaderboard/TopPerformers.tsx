'use client';

import React from 'react';

interface TopPerformersProps {
  users: Array<{
    rank: number;
    username: string;
    avatar?: string;
    score: number;
  }>;
  className?: string;
}

export const TopPerformers: React.FC<TopPerformersProps> = ({
  users,
  className = '',
}) => {
  const topThree = users.slice(0, 3);

  return (
    <div className={`bg-gradient-to-br from-yellow-100 to-orange-100 rounded-2xl p-8 ${className}`}>
      <h3 className="text-2xl font-bold mb-6 text-center">🏆 Top Performers</h3>

      <div className="flex items-end justify-center gap-4 mb-8">
        {/* 2nd Place */}
        {topThree[1] && (
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full mb-2 flex items-center justify-center text-3xl mx-auto">
              🥈
            </div>
            <div className="font-bold">{topThree[1].username}</div>
            <div className="text-2xl font-bold text-gray-600">{topThree[1].score}</div>
          </div>
        )}

        {/* 1st Place */}
        {topThree[0] && (
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full mb-2 flex items-center justify-center text-4xl mx-auto">
              🥇
            </div>
            <div className="font-bold text-lg">{topThree[0].username}</div>
            <div className="text-3xl font-bold text-yellow-600">{topThree[0].score}</div>
          </div>
        )}

        {/* 3rd Place */}
        {topThree[2] && (
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full mb-2 flex items-center justify-center text-3xl mx-auto">
              🥉
            </div>
            <div className="font-bold">{topThree[2].username}</div>
            <div className="text-2xl font-bold text-amber-700">{topThree[2].score}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopPerformers;
