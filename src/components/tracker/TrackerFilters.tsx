'use client';

import React, { useState } from 'react';

interface TrackerFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  className?: string;
}

interface FilterState {
  platform?: string;
  dateRange?: string;
  category?: string;
  sortBy?: string;
}

export const TrackerFilters: React.FC<TrackerFiltersProps> = ({
  onFilterChange,
  className = '',
}) => {
  const [filters, setFilters] = useState<FilterState>({});

  const updateFilter = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 ${className}`}>
      <div className="grid grid-cols-4 gap-4">
        <select
          onChange={(e) => updateFilter('platform', e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Platforms</option>
          <option value="leetcode">LeetCode</option>
          <option value="github">GitHub</option>
        </select>

        <select
          onChange={(e) => updateFilter('dateRange', e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>

        <select
          onChange={(e) => updateFilter('category', e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Categories</option>
          <option value="coding">Coding</option>
          <option value="learning">Learning</option>
        </select>

        <select
          onChange={(e) => updateFilter('sortBy', e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="date">Sort by Date</option>
          <option value="value">Sort by Value</option>
          <option value="platform">Sort by Platform</option>
        </select>
      </div>
    </div>
  );
};

export default TrackerFilters;
