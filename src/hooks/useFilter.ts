// src/hooks/useFilter.ts

import { useState, useMemo, useCallback } from 'react';

interface FilterConfig<T> {
  searchFields?: (keyof T)[];
  filterFields?: {
    [key in keyof T]?: (value: T[key], filterValue: any) => boolean;
  };
}

export function useFilter<T>(
  data: T[],
  config: FilterConfig<T> = {}
) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Partial<Record<keyof T, any>>>({});

  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchQuery && config.searchFields) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) =>
        config.searchFields!.some((field) => {
          const value = item[field];
          return String(value).toLowerCase().includes(query);
        })
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, filterValue]) => {
      if (filterValue !== undefined && filterValue !== null && filterValue !== '') {
        const field = key as keyof T;
        const customFilter = config.filterFields?.[field];

        if (customFilter) {
          result = result.filter((item) => customFilter(item[field], filterValue));
        } else {
          result = result.filter((item) => item[field] === filterValue);
        }
      }
    });

    return result;
  }, [data, searchQuery, filters, config]);

  const setFilter = useCallback((field: keyof T, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const clearFilter = useCallback((field: keyof T) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[field];
      return newFilters;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
  }, []);

  return {
    filteredData,
    searchQuery,
    setSearchQuery,
    filters,
    setFilter,
    clearFilter,
    clearAllFilters,
  };
}