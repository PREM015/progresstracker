// src/components/achievements/AchievementFilters.tsx
'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import type { AchievementCategory, AchievementRarity, AchievementTier } from '@/types/achievement';
import { RARITY_CONFIG, TIER_CONFIG, CATEGORY_CONFIG } from '@/types/achievement';

// =============================================================================
// TYPES
// =============================================================================

export interface AchievementFilterState {
  category: AchievementCategory | null;
  rarity: AchievementRarity | null;
  tier: AchievementTier | null;
  status: 'all' | 'unlocked' | 'locked';
  search: string;
  sortBy: 'default' | 'points' | 'rarity' | 'recent' | 'progress';
}

interface AchievementFiltersProps {
  filters: AchievementFilterState;
  onChange: (filters: AchievementFilterState) => void;
  totalCount?: number;
  filteredCount?: number;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const AchievementFilters = memo(function AchievementFilters({
  filters,
  onChange,
  totalCount = 0,
  filteredCount = 0,
  className = '',
}: AchievementFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState(filters.search);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) {
        onChange({ ...filters, search: searchValue });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, filters, onChange]);

  const updateFilter = useCallback(<K extends keyof AchievementFilterState>(
    key: K,
    value: AchievementFilterState[K]
  ) => {
    onChange({ ...filters, [key]: value });
  }, [filters, onChange]);

  const clearFilters = useCallback(() => {
    setSearchValue('');
    onChange({
      category: null,
      rarity: null,
      tier: null,
      status: 'all',
      search: '',
      sortBy: 'default',
    });
  }, [onChange]);

  const hasActiveFilters = filters.category || filters.rarity || filters.tier ||
    filters.status !== 'all' || filters.search || filters.sortBy !== 'default';

  const activeFilterCount = [
    filters.category,
    filters.rarity,
    filters.tier,
    filters.status !== 'all',
    filters.sortBy !== 'default',
  ].filter(Boolean).length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search achievements..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
          />
          {searchValue && (
            <button
              onClick={() => setSearchValue('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors
            ${isExpanded || hasActiveFilters
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }
          `}
        >
          <FilterIcon className="w-5 h-5" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-indigo-500 text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Sort Dropdown */}
        <select
          value={filters.sortBy}
          onChange={(e) => updateFilter('sortBy', e.target.value as AchievementFilterState['sortBy'])}
          className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none cursor-pointer"
        >
          <option value="default">Default Order</option>
          <option value="points">By Points</option>
          <option value="rarity">By Rarity</option>
          <option value="recent">Recently Unlocked</option>
          <option value="progress">By Progress</option>
        </select>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="p-4 bg-gray-50 rounded-xl space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
            <div className="flex flex-wrap gap-2">
              {(['all', 'unlocked', 'locked'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => updateFilter('status', status)}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${filters.status === status
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                    }
                  `}
                >
                  {status === 'all' ? '🏆 All' : status === 'unlocked' ? '✅ Unlocked' : '🔒 Locked'}
                </button>
              ))}
            </div>
          </div>

          {/* Rarity Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Rarity</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(RARITY_CONFIG) as [AchievementRarity, typeof RARITY_CONFIG[AchievementRarity]][]).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => updateFilter('rarity', filters.rarity === key ? null : key)}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${filters.rarity === key
                      ? `${config.bgClass} ${config.textClass} ring-2 ring-offset-1`
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                    }
                  `}
                  style={filters.rarity === key ? { '--tw-ring-color': config.color } as React.CSSProperties : undefined}
                >
                  {config.emoji} {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tier Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Tier</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(TIER_CONFIG) as [AchievementTier, typeof TIER_CONFIG[AchievementTier]][]).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => updateFilter('tier', filters.tier === key ? null : key)}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${filters.tier === key
                      ? 'bg-gray-800 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                    }
                  `}
                >
                  {config.emoji} {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(CATEGORY_CONFIG) as [AchievementCategory, typeof CATEGORY_CONFIG[AchievementCategory]][]).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => updateFilter('category', filters.category === key ? null : key)}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${filters.category === key
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                    }
                  `}
                >
                  {config.emoji} {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="pt-2 border-t border-gray-200">
              <button
                onClick={clearFilters}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-gray-500">
        Showing {filteredCount} of {totalCount} achievements
        {hasActiveFilters && ' (filtered)'}
      </div>
    </div>
  );
});

// =============================================================================
// ICONS
// =============================================================================

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default AchievementFilters;