/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useSearch.ts
// PURPOSE: Global search hook - search across entries, goals, achievements
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
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
      const params: Record<string, string> = {
        q: debouncedQuery,
        limit: '20',
      };

      if (filters.types?.length) {
        params.types = filters.types.join(',');
      }
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.platformId) params.platformId = filters.platformId;
      if (filters.category) params.category = filters.category;

      const response = await apiClient.get<ApiResponse<SearchResults>>(
        '/search',
        params
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Search failed');
      }

      return response.data.data!;
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
      const response = await apiClient.get<ApiResponse<{ suggestions: string[] }>>(
        '/search/autocomplete',
        { q: debouncedQuery }
      );

      if (response.error || !response.data?.success) {
        return [];
      }

      return response.data.data!.suggestions;
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
      const response = await apiClient.get<ApiResponse<{ searches: RecentSearch[] }>>(
        '/search/recent'
      );

      if (response.error || !response.data?.success) {
        return [];
      }

      return response.data.data!.searches;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // ==========================================================================
  // SAVE SEARCH (for history)
  // ==========================================================================
  const saveSearchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      await apiClient.post('/search/history', { query: searchQuery });
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
      await apiClient.delete('/search/history');
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