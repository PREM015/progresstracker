/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useSearch.ts
// PURPOSE: Global search hook - search across entries, goals, achievements
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo, useState } from 'react';
import { SearchService } from '@/services/api/search.service';
import { queryKeys } from './keys';
import { useDebounce } from './utils/useDebounce';

// =============================================================================
// TYPES
// =============================================================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SearchResult {
  type: 'entry' | 'goal' | 'achievement' | 'platform' | 'user';
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  url: string;
  score: number;
  metadata?: Record<string, unknown>;
}

interface SearchResults {
  results: SearchResult[];
  total: number;
  query: string;
  took: number; // milliseconds
}

interface SearchFilters {
  types?: ('entry' | 'goal' | 'achievement' | 'platform' | 'user')[];
  dateFrom?: string;
  dateTo?: string;
  platformId?: string;
  category?: string;
  [key: string]: any;
}

interface RecentSearch {
  query: string;
  timestamp: Date;
  resultCount: number;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useSearch(initialQuery: string = '') {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated';

  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>({});

  const debouncedQuery = useDebounce(query, 300);

  // ==========================================================================
  // SEARCH QUERY
  // ==========================================================================
  const searchQuery = useQuery({
    queryKey: queryKeys.search.results(debouncedQuery, filters),
    queryFn: async (): Promise<SearchResults> => {
      return SearchService.search(debouncedQuery, {
        types: filters.types,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        platformId: filters.platformId,
        category: filters.category,
      });
    },
    enabled: isAuthenticated && debouncedQuery.length >= 2,
    staleTime: 30 * 1000,
  });

  // ==========================================================================
  // SUGGESTIONS
  // ==========================================================================
  const suggestionsQuery = useQuery({
    queryKey: queryKeys.search.suggestions(debouncedQuery),
    queryFn: async (): Promise<string[]> => {
      return SearchService.getSuggestions(debouncedQuery);
    },
    enabled: isAuthenticated && debouncedQuery.length >= 1 && debouncedQuery.length < 3,
    staleTime: 60 * 1000,
  });

  // ==========================================================================
  // RECENT SEARCHES
  // ==========================================================================
  const recentQuery = useQuery({
    queryKey: queryKeys.search.recent(),
    queryFn: async (): Promise<RecentSearch[]> => {
      return SearchService.getRecent();
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // ==========================================================================
  // SAVE SEARCH (for history)
  // ==========================================================================
  const saveSearchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      await SearchService.saveHistory(searchQuery);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.search.recent() });
    },
  });

  // ==========================================================================
  // CLEAR RECENT SEARCHES
  // ==========================================================================
  const clearRecentMutation = useMutation({
    mutationFn: async () => {
      await SearchService.clearHistory();
    },
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.search.recent(), []);
    },
  });

  // ==========================================================================
  // SEARCH FUNCTION
  // ==========================================================================
  const search = useCallback((newQuery: string, newFilters?: SearchFilters) => {
    setQuery(newQuery);
    if (newFilters) {
      setFilters(newFilters);
    }

    // Save to history if query is meaningful
    if (newQuery.length >= 3) {
      saveSearchMutation.mutate(newQuery);
    }
  }, [saveSearchMutation]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setFilters({});
  }, []);

  const clearRecentSearches = useCallback(() => {
    clearRecentMutation.mutate();
  }, [clearRecentMutation]);

  // ==========================================================================
  // RETURN
  // ==========================================================================
  return useMemo(() => ({
    // State
    query,
    debouncedQuery,
    filters,

    // Results
    results: searchQuery.data?.results ?? [],
    total: searchQuery.data?.total ?? 0,
    took: searchQuery.data?.took ?? 0,
    suggestions: suggestionsQuery.data ?? [],
    recentSearches: recentQuery.data ?? [],

    // Loading states
    isSearching: searchQuery.isFetching,
    isLoadingSuggestions: suggestionsQuery.isLoading,
    isLoadingRecent: recentQuery.isLoading,

    // Error states
    error: searchQuery.error,

    // Actions
    search,
    setQuery,
    setFilters,
    clearSearch,
    clearRecentSearches,

    // Convenience
    hasResults: (searchQuery.data?.results.length ?? 0) > 0,
    hasQuery: query.length > 0,
    isReady: debouncedQuery.length >= 2,
  }), [
    query,
    debouncedQuery,
    filters,
    searchQuery.data,
    searchQuery.isFetching,
    searchQuery.error,
    suggestionsQuery.data,
    suggestionsQuery.isLoading,
    recentQuery.data,
    recentQuery.isLoading,
    search,
    clearSearch,
    clearRecentSearches,
  ]);
}

export default useSearch;