// src/components/achievements/AchievementLeaderboard.tsx
'use client';

import { memo, useState, useEffect, useCallback, useMemo } from 'react';
/* eslint-disable @typescript-eslint/no-unused-vars */
// =============================================================================
// TYPES
// =============================================================================

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  name: string;
  avatar?: string;
  totalPoints: number;
  totalAchievements: number;
  recentAchievement?: {
    icon: string;
    title: string;
  };
  isCurrentUser?: boolean;
}

interface AchievementLeaderboardProps {
  userId?: string;
  period?: 'all' | 'year' | 'month' | 'week';
  limit?: number;
  showCurrentUser?: boolean;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const AchievementLeaderboard = memo(function AchievementLeaderboard({
  userId,
  period: initialPeriod = 'all',
  limit = 10,
  showCurrentUser = true,
  className = '',
}: AchievementLeaderboardProps) {
  const [period, setPeriod] = useState(initialPeriod);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserEntry, setCurrentUserEntry] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ period, limit: limit.toString() });
      const response = await fetch(`/api/achievements/leaderboard?${params}`);

      if (!response.ok) throw new Error('Failed to fetch leaderboard');

      const data = await response.json();
      setEntries(data.entries || []);

      if (showCurrentUser && userId && data.currentUser) {
        setCurrentUserEntry(data.currentUser);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [period, limit, showCurrentUser, userId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const periods = useMemo(() => [
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
    { key: 'all', label: 'All Time' },
  ] as const, []);

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white';
      case 2: return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800';
      case 3: return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '👑';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return null;
    }
  };

  if (isLoading) {
    return <LeaderboardSkeleton limit={limit} className={className} />;
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-xl p-6 text-center ${className}`}>
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchLeaderboard}
          className="mt-3 text-sm text-red-700 hover:text-red-800 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            🏆 Leaderboard
          </h3>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {periods.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`
                  px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                  ${period === key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Entries */}
      <div className="divide-y divide-gray-50">
        {entries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No entries yet. Be the first!
          </div>
        ) : (
          entries.map((entry, index) => (
            <div
              key={entry.userId}
              className={`
                flex items-center gap-4 p-4 transition-colors
                ${entry.isCurrentUser ? 'bg-indigo-50' : 'hover:bg-gray-50'}
              `}
            >
              {/* Rank */}
              <div
                className={`
                  w-10 h-10 flex items-center justify-center rounded-full
                  font-bold text-sm ${getRankStyle(entry.rank)}
                `}
              >
                {getRankIcon(entry.rank) || entry.rank}
              </div>

              {/* Avatar */}
              <div className="relative">
                {entry.avatar ? (
                  <img
                    src={entry.avatar}
                    alt={entry.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {entry.name.charAt(0)}
                  </div>
                )}
                {entry.recentAchievement && (
                  <span className="absolute -bottom-1 -right-1 text-lg">
                    {entry.recentAchievement.icon}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">
                    {entry.name}
                  </span>
                  {entry.isCurrentUser && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">
                      You
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  @{entry.username} • {entry.totalAchievements} achievements
                </div>
              </div>

              {/* Points */}
              <div className="text-right">
                <div className="text-lg font-bold text-indigo-600">
                  {entry.totalPoints.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">points</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Current User (if not in top) */}
      {currentUserEntry && !entries.find(e => e.isCurrentUser) && (
        <>
          <div className="border-t-2 border-dashed border-gray-200" />
          <div className="flex items-center gap-4 p-4 bg-indigo-50">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 font-bold text-sm">
              {currentUserEntry.rank}
            </div>
            <div className="relative">
              {currentUserEntry.avatar ? (
                <img
                  src={currentUserEntry.avatar}
                  alt={currentUserEntry.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-indigo-200 shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {currentUserEntry.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{currentUserEntry.name}</span>
                <span className="px-1.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">
                  You
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {currentUserEntry.totalAchievements} achievements
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-indigo-600">
                {currentUserEntry.totalPoints.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">points</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

// =============================================================================
// SKELETON
// =============================================================================

function LeaderboardSkeleton({ limit, className }: { limit: number; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-100">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="divide-y divide-gray-50">
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
            <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default AchievementLeaderboard;