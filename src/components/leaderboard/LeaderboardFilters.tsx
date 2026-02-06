'use client';

import React from 'react';

interface LeaderboardFiltersProps {
  timeframe: string;
  category: string;
  onChange: (filters: { timeframe: string; category: string }) => void;
  className?: string;
}

export const LeaderboardFilters: React.FC<LeaderboardFiltersProps> = ({
  timeframe,
  category,
  onChange,
  className = '',
}) => {
  return (
    <div className={`flex gap-4 ${className}`}>
      <select
        value={timeframe}
        onChange={(e) => onChange({ timeframe: e.target.value, category })}
        className="px-4 py-2 border rounded-lg"
      >
        <option value="today">Today</option>
        <option value="week">This Week</option>
        <option value="month">This Month</option>
        <option value="alltime">All Time</option>
      </select>

      <select
        value={category}
        onChange={(e) => onChange({ timeframe, category: e.target.value })}
        className="px-4 py-2 border rounded-lg"
      >
        <option value="overall">Overall</option>
        <option value="problems">Problems Solved</option>
        <option value="streak">Longest Streak</option>
        <option value="hours">Hours Studied</option>
      </select>
    </div>
  );
};

export default LeaderboardFilters;
