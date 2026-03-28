// src/context/SearchContext.tsx
// Global search context

'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type SearchCategory = 'all' | 'tracker' | 'goals' | 'achievements' | 'blog' | 'users' | 'platforms';

export interface SearchResult {
  id: string;
  type: SearchCategory;
  title: string;
  subtitle?: string;
  url: string;
  icon?: React.ReactNode;
  metadata?: Record<string, unknown>;
}

interface SearchContextValue {
  query: string;
  isOpen: boolean;
  isLoading: boolean;
  results: SearchResult[];
  recentSearches: string[];
  selectedCategory: SearchCategory;
  setQuery: (query: string) => void;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
  setCategory: (category: SearchCategory) => void;
  clearResults: () => void;
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const SearchContext = createContext<SearchContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

const MAX_RECENT = 8;

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQueryState] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('recent_searches') ?? '[]'); } catch { return []; }
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    clearTimeout(debounceRef.current);

    if (!q.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${selectedCategory}&limit=8`);
        if (res.ok) {
          const data = await res.json();
          setResults(data?.data?.results ?? []);
        }
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, [selectedCategory]);

  const openSearch = useCallback(() => setIsOpen(true), []);
  const closeSearch = useCallback(() => { setIsOpen(false); setQueryState(''); setResults([]); }, []);
  const toggleSearch = useCallback(() => setIsOpen((o) => !o), []);
  const setCategory = useCallback((c: SearchCategory) => setSelectedCategory(c), []);
  const clearResults = useCallback(() => { setResults([]); setQueryState(''); }, []);

  const addRecentSearch = useCallback((q: string) => {
    if (!q.trim()) return;
    setRecentSearches((prev) => {
      const updated = [q, ...prev.filter((r) => r !== q)].slice(0, MAX_RECENT);
      if (typeof window !== 'undefined') localStorage.setItem('recent_searches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    if (typeof window !== 'undefined') localStorage.removeItem('recent_searches');
  }, []);

  return (
    <SearchContext.Provider value={{
      query, isOpen, isLoading, results, recentSearches, selectedCategory,
      setQuery, openSearch, closeSearch, toggleSearch, setCategory, clearResults,
      addRecentSearch, clearRecentSearches,
    }}>
      {children}
    </SearchContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within a SearchProvider');
  return ctx;
}
