'use client';

import React, { useState, useEffect } from 'react';

interface ProfileStats {
  totalProblems: number;
  currentStreak: number;
  totalHours: number;
  achievements: number;
  rank: number;
}

interface ProfileStatsProps {
  userId?: string;
  className?: string;
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({
  userId,
  className = '',
}) => {
  const [stats, setStats] = useState<ProfileStats | null>(null);

  useEffect(() => {
    fetch('/api/profile/stats')
      .then(r => r.json())
      .then(data => setStats(data));
  }, [userId]);

  if (!stats) return <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />;

  return (
    <div className={`grid grid-cols-5 gap-4 ${className}`}>
      {[
        { label: 'Problems', value: stats.totalProblems, icon: '💻' },
        { label: 'Streak', value: `${stats.currentStreak}d`, icon: '🔥' },
        { label: 'Hours', value: stats.totalHours, icon: '⏱️' },
        { label: 'Achievements', value: stats.achievements, icon: '🏆' },
        { label: 'Rank', value: `#${stats.rank}`, icon: '🎖️' },
      ].map((stat, idx) => (
        <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">{stat.icon}</div>
          <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
          <div className="text-sm text-gray-600">{stat.label}</div>
        </div>
      ))}
    </div>
  );
};

export default ProfileStats;
