'use client';

import React, { useState } from 'react';
import { TrackerFilter } from '@/types/tracker';

interface TrackerFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  className?: string;
}

interface FilterState extends TrackerFilter {
  sortBy?: string;
}

export const TrackerFilters: React.FC<TrackerFiltersProps> = ({
  onFilterChange,
  className = '',
}) => {
  const [filters, setFilters] = useState<FilterState>({});

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 ${className}`}>
      <div className="grid grid-cols-4 gap-4">
        <select
          onChange={(e) => updateFilter('platformIds', e.target.value ? [e.target.value] : [])}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Platforms</option>
          <option value="leetcode">LeetCode</option>
          <option value="github">GitHub</option>
        </select>

        <select
          onChange={(e) => updateFilter('startDate', e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>

        <select
          onChange={(e) => updateFilter('categories', e.target.value ? [e.target.value as any] : [])}
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
