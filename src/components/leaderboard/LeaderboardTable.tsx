'use client';

import React, { useState, useEffect } from 'react';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  change?: number;
}

interface LeaderboardTableProps {
  category?: string;
  timeRange?: 'day' | 'week' | 'month' | 'all';
  limit?: number;
  className?: string;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  category,
  timeRange = 'week',
  limit = 50,
  className = '',
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({
      ...(category && { category }),
      timeRange,
      limit: limit.toString(),
    });

    fetch(`/api/leaderboard?${params}`)
      .then(r => r.json())
      .then(data => setEntries(data))
      .finally(() => setLoading(false));
  }, [category, timeRange, limit]);

  if (loading) {
    return <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
      ))}
    </div>;
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Rank</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">User</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Score</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.map((entry) => (
              <tr key={entry.userId} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${entry.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                      entry.rank === 2 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                        entry.rank === 3 ? 'bg-gradient-to-br from-orange-600 to-orange-800' :
                          'bg-gray-300 text-gray-700'
                    }`}>
                    {entry.rank}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {entry.avatar ? (
                      <img src={entry.avatar} alt={entry.username} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                        {entry.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-gray-900">{entry.username}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-bold text-gray-900">
                  {entry.score.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right">
                  {entry.change !== undefined && (
                    <span className={`text-sm font-medium ${entry.change > 0 ? 'text-green-600' : entry.change < 0 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                      {entry.change > 0 && '+'}{entry.change}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaderboardTable;
