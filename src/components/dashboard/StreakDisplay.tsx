'use client';

import React, { useEffect, useState } from 'react';

interface StreakDisplayProps {
  className?: string;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface StreakResponse {
  streak?: {
    current?: number;
    longest?: number;
  };
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({ className = '' }) => {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchStreak = async () => {
      try {
        const res = await fetch('/api/user/streak');
        const json = (await res.json()) as ApiSuccess<StreakResponse>;
        if (!res.ok || !json?.success) {
          throw new Error('Failed to fetch streak info');
        }

        const current = json.data?.streak?.current ?? 0;
        const longest = json.data?.streak?.longest ?? 0;

        if (isMounted) {
          setCurrentStreak(current);
          setLongestStreak(longest);
        }
      } catch (error) {
        console.error('Failed to load streak info:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStreak();

    return () => {
      isMounted = false;
    };
  }, []);

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return 'from-purple-500 to-pink-500';
    if (streak >= 14) return 'from-orange-500 to-red-500';
    if (streak >= 7) return 'from-yellow-500 to-orange-500';
    return 'from-blue-500 to-cyan-500';
  };

  if (loading) {
    return <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />;
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Streak</h3>

      <div className={`bg-gradient-to-r ${getStreakColor(currentStreak)} text-white rounded-xl p-8 mb-6`}>
        <div className="text-center">
          <div className="text-5xl font-bold mb-2">{currentStreak}</div>
          <div className="text-lg opacity-90">Day Streak</div>
          <div className="mt-4 text-sm opacity-75">
            {currentStreak > 0 ? 'Keep it going.' : 'Start your streak today.'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{longestStreak}</div>
          <div className="text-xs text-gray-600">Longest Streak</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">
            {currentStreak === longestStreak && currentStreak > 0 ? 'Best' : 'Goal'}
          </div>
          <div className="text-xs text-gray-600">
            {currentStreak === longestStreak && currentStreak > 0 ? 'Personal Best' : 'Keep Building'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreakDisplay;
