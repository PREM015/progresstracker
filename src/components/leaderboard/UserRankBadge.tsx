'use client';

import React from 'react';

interface UserRankBadgeProps {
  rank: number;
  size?: 'sm' | 'md' | 'lg';
  showChange?: boolean;
  change?: number;
  className?: string;
}

export const UserRankBadge: React.FC<UserRankBadgeProps> = ({
  rank,
  size = 'md',
  showChange = false,
  change = 0,
  className = '',
}) => {
  const getRankDisplay = () => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-2',
    lg: 'text-lg px-4 py-3',
  };

  const getRankColor = () => {
    if (rank <= 3) return 'from-yellow-400 to-yellow-500';
    if (rank <= 10) return 'from-indigo-500 to-purple-500';
    return 'from-gray-400 to-gray-500';
  };

  return (
    <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${getRankColor()} text-white rounded-lg font-bold ${sizeClasses[size]} ${className}`}>
      <span>{getRankDisplay()}</span>
      {showChange && change !== 0 && (
        <span className="text-xs">
          {change > 0 ? `↑${change}` : `↓${Math.abs(change)}`}
        </span>
      )}
    </div>
  );
};

export default UserRankBadge;
