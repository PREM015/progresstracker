'use client';

import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { platforms, CATEGORY_TO_PRISMA } from '@/config/platforms';

interface AnalyticsFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  className?: string;
}

interface FilterState {
  timeRange?: string;
  category?: string;
  platform?: string;
  metric?: string;
  groupBy?: string;
}

// Dynamically generate categories from config
const formatCategoryLabel = (cat: string) => {
  const map: Record<string, string> = {
    dsa: 'DSA & Coding',
    job: 'Jobs',
    git: 'Version Control',
    learning: 'Learning',
    hackathon: 'Hackathons',
    opensource: 'Open Source',
    company: 'Companies',
    design: 'Design',
    data_science: 'Data Science',
    other: 'Other'
  };
  return map[cat] || cat.replace('_', ' ').toUpperCase();
};

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  ...Object.keys(CATEGORY_TO_PRISMA).map(cat => ({
    value: cat,
    label: formatCategoryLabel(cat)
  }))
];

// Dynamically generate platforms by category from config
const PLATFORMS_BY_CATEGORY: Record<string, { value: string, label: string }[]> = {
  all: [
    { value: 'all', label: 'All Platforms' },
    ...platforms.map(p => ({ value: p.id, label: p.name }))
  ]
};

Object.keys(CATEGORY_TO_PRISMA).forEach(cat => {
  PLATFORMS_BY_CATEGORY[cat] = [
    { value: 'all', label: `All ${formatCategoryLabel(cat)}` },
    ...platforms.filter(p => p.category === cat).map(p => ({ value: p.id, label: p.name }))
  ];
});

export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  onFilterChange,
  className = '',
}) => {
  const [filters, setFilters] = useState<FilterState>({
    timeRange: 'last_30_days',
    category: 'all',
    platform: 'all',
    metric: 'all',
    groupBy: 'day',
  });

  const updateFilter = (key: keyof FilterState, value: string) => {
    let newFilters = { ...filters, [key]: value };
    
    // Cascade Category -> Platform reset
    if (key === 'category') {
      newFilters.platform = 'all';
    }

    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const currentPlatforms = PLATFORMS_BY_CATEGORY[filters.category || 'all'] || PLATFORMS_BY_CATEGORY['all'];

  return (
    <div className={cn("glass-card p-6 flex flex-col gap-6", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tighter">Analysis Filters</h3>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Parameters</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">Time Range</label>
          <Select
            value={filters.timeRange}
            onValueChange={(val) => updateFilter('timeRange', val)}
          >
            <SelectTrigger className="w-full bg-zinc-100 dark:bg-zinc-800/50 border-none font-bold text-xs h-10 rounded-xl">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-zinc-200 dark:border-zinc-800">
              <SelectItem value="last_7_days" className="font-bold text-xs uppercase tracking-widest">Last 7 Days</SelectItem>
              <SelectItem value="last_30_days" className="font-bold text-xs uppercase tracking-widest">Last 30 Days</SelectItem>
              <SelectItem value="last_90_days" className="font-bold text-xs uppercase tracking-widest">Last 90 Days</SelectItem>
              <SelectItem value="this_year" className="font-bold text-xs uppercase tracking-widest">This Year</SelectItem>
              <SelectItem value="all_time" className="font-bold text-xs uppercase tracking-widest">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">Category</label>
          <Select
            value={filters.category}
            onValueChange={(val) => updateFilter('category', val)}
          >
            <SelectTrigger className="w-full bg-zinc-100 dark:bg-zinc-800/50 border-none font-bold text-xs h-10 rounded-xl">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-zinc-200 dark:border-zinc-800">
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value} className="font-bold text-xs uppercase tracking-widest">
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">Platform</label>
          <Select
            value={filters.platform}
            onValueChange={(val) => updateFilter('platform', val)}
          >
            <SelectTrigger className="w-full bg-zinc-100 dark:bg-zinc-800/50 border-none font-bold text-xs h-10 rounded-xl">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-zinc-200 dark:border-zinc-800">
              {currentPlatforms.map(plat => (
                <SelectItem key={plat.value} value={plat.value} className="font-bold text-xs uppercase tracking-widest">
                  {plat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">Metric</label>
          <Select
            value={filters.metric}
            onValueChange={(val) => updateFilter('metric', val)}
          >
            <SelectTrigger className="w-full bg-zinc-100 dark:bg-zinc-800/50 border-none font-bold text-xs h-10 rounded-xl">
              <SelectValue placeholder="Metric" />
            </SelectTrigger>
            <SelectContent className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-zinc-200 dark:border-zinc-800">
              <SelectItem value="all" className="font-bold text-xs uppercase tracking-widest">All Metrics</SelectItem>
              <SelectItem value="problems" className="font-bold text-xs uppercase tracking-widest">Problems Solved</SelectItem>
              <SelectItem value="commits" className="font-bold text-xs uppercase tracking-widest">Commits</SelectItem>
              <SelectItem value="time" className="font-bold text-xs uppercase tracking-widest">Time Spent</SelectItem>
              <SelectItem value="streak" className="font-bold text-xs uppercase tracking-widest">Streak</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">Group By</label>
          <Select
            value={filters.groupBy}
            onValueChange={(val) => updateFilter('groupBy', val)}
          >
            <SelectTrigger className="w-full bg-zinc-100 dark:bg-zinc-800/50 border-none font-bold text-xs h-10 rounded-xl">
              <SelectValue placeholder="Interval" />
            </SelectTrigger>
            <SelectContent className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-zinc-200 dark:border-zinc-800">
              <SelectItem value="day" className="font-bold text-xs uppercase tracking-widest">Daily</SelectItem>
              <SelectItem value="week" className="font-bold text-xs uppercase tracking-widest">Weekly</SelectItem>
              <SelectItem value="month" className="font-bold text-xs uppercase tracking-widest">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsFilters;

