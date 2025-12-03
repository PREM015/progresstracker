// src/hooks/useSort.ts

import { useState, useMemo } from 'react';

type SortDirection = 'asc' | 'desc';

interface UseSortOptions<T> {
  initialSortBy?: keyof T;
  initialDirection?: SortDirection;
}

export function useSort<T>(
  data: T[],
  options: UseSortOptions<T> = {}
) {
  const { initialSortBy, initialDirection = 'asc' } = options;

  const [sortBy, setSortBy] = useState<keyof T | undefined>(initialSortBy);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection);

  const sortedData = useMemo(() => {
    if (!sortBy) return data;

    const sorted = [...data].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Handle different types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // Default comparison
      return sortDirection === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });

    return sorted;
  }, [data, sortBy, sortDirection]);

  const toggleSort = (field: keyof T) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const setSortConfig = (field: keyof T, direction: SortDirection) => {
    setSortBy(field);
    setSortDirection(direction);
  };

  return {
    sortedData,
    sortBy,
    sortDirection,
    toggleSort,
    setSortConfig,
  };
}