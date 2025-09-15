'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';

interface SearchOptions {
  debounceDelay?: number;
  minQueryLength?: number;
  maxResults?: number;
  cacheTime?: number;
  enableHistory?: boolean;
  enableAutoComplete?: boolean;
}

interface SearchResult {
  id: string;
  type: 'event' | 'task' | 'note' | 'contact';
  title: string;
  description?: string;
  date?: string;
  location?: string;
  tags?: string[];
  score?: number;
  highlight?: string;
}

interface SearchState {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  suggestions: string[];
  recentSearches: string[];
}

// Search result cache
const searchCache = new Map<string, { results: SearchResult[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Search history management
const SEARCH_HISTORY_KEY = 'search-history';
const MAX_HISTORY_ITEMS = 10;

export function useSearch(options: SearchOptions = {}) {
  const {
    debounceDelay = 300,
    minQueryLength = 2,
    maxResults = 20,
    cacheTime = CACHE_DURATION,
    enableHistory = true,
    enableAutoComplete = true
  } = options;

  const [state, setState] = useState<SearchState>({
    query: '',
    results: [],
    isLoading: false,
    error: null,
    hasMore: false,
    suggestions: [],
    recentSearches: []
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const debouncedQuery = useDebounce(state.query, debounceDelay);

  // Load search history on mount
  useEffect(() => {
    if (enableHistory) {
      const history = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (history) {
        setState(prev => ({
          ...prev,
          recentSearches: JSON.parse(history)
        }));
      }
    }
  }, [enableHistory]);

  // Save to search history
  const saveToHistory = useCallback((query: string) => {
    if (!enableHistory || !query.trim()) return;

    const history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
    const newHistory = [
      query,
      ...history.filter((item: string) => item !== query)
    ].slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    setState(prev => ({
      ...prev,
      recentSearches: newHistory
    }));
  }, [enableHistory]);

  // Clear search history
  const clearHistory = useCallback(() => {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    setState(prev => ({
      ...prev,
      recentSearches: []
    }));
  }, []);

  // Check cache
  const checkCache = useCallback((query: string): SearchResult[] | null => {
    const cached = searchCache.get(query);
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      return cached.results;
    }
    searchCache.delete(query);
    return null;
  }, [cacheTime]);

  // Perform search
  const performSearch = useCallback(async (query: string) => {
    if (!query || query.length < minQueryLength) {
      setState(prev => ({
        ...prev,
        results: [],
        suggestions: [],
        isLoading: false
      }));
      return;
    }

    // Check cache first
    const cachedResults = checkCache(query);
    if (cachedResults) {
      setState(prev => ({
        ...prev,
        results: cachedResults,
        isLoading: false,
        error: null
      }));
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies with request
        body: JSON.stringify({
          query,
          limit: maxResults,
          includeAutoComplete: enableAutoComplete
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache the results
      searchCache.set(query, {
        results: data.results,
        timestamp: Date.now()
      });

      setState(prev => ({
        ...prev,
        results: data.results || [],
        suggestions: data.suggestions || [],
        hasMore: data.hasMore || false,
        isLoading: false,
        error: null
      }));

      // Save successful search to history
      if (data.results && data.results.length > 0) {
        saveToHistory(query);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error,
        results: []
      }));
    }
  }, [minQueryLength, maxResults, enableAutoComplete, checkCache, saveToHistory]);

  // Trigger search on debounced query change
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    } else {
      setState(prev => ({
        ...prev,
        results: [],
        suggestions: [],
        isLoading: false
      }));
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedQuery, performSearch]);

  // Set query
  const setQuery = useCallback((query: string) => {
    setState(prev => ({
      ...prev,
      query
    }));
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState(prev => ({
      ...prev,
      query: '',
      results: [],
      suggestions: [],
      isLoading: false,
      error: null
    }));
  }, []);

  // Load more results
  const loadMore = useCallback(async () => {
    if (!state.hasMore || state.isLoading) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: state.query,
          offset: state.results.length,
          limit: maxResults
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load more results');
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        results: [...prev.results, ...data.results],
        hasMore: data.hasMore || false,
        isLoading: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error
      }));
    }
  }, [state.hasMore, state.isLoading, state.query, state.results.length, maxResults]);

  // Retry failed search
  const retry = useCallback(() => {
    if (state.query) {
      performSearch(state.query);
    }
  }, [state.query, performSearch]);

  return {
    // State
    query: state.query,
    results: state.results,
    isLoading: state.isLoading,
    error: state.error,
    hasMore: state.hasMore,
    suggestions: state.suggestions,
    recentSearches: state.recentSearches,
    
    // Actions
    setQuery,
    clearSearch,
    loadMore,
    retry,
    clearHistory,
    
    // Utils
    isEmpty: state.results.length === 0,
    hasResults: state.results.length > 0,
    isSearching: state.isLoading && state.query.length >= minQueryLength
  };
}

// Search filters hook
export function useSearchFilters() {
  const [filters, setFilters] = useState({
    dateRange: 'all',
    type: 'all',
    location: false,
    tags: [] as string[],
    sortBy: 'relevance' as 'relevance' | 'date' | 'title'
  });

  const updateFilter = useCallback(<K extends keyof typeof filters>(
    key: K,
    value: typeof filters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      dateRange: 'all',
      type: 'all',
      location: false,
      tags: [],
      sortBy: 'relevance'
    });
  }, []);

  const hasActiveFilters = 
    filters.dateRange !== 'all' ||
    filters.type !== 'all' ||
    filters.location ||
    filters.tags.length > 0 ||
    filters.sortBy !== 'relevance';

  return {
    filters,
    updateFilter,
    resetFilters,
    hasActiveFilters
  };
}

// Search highlighting utility - DEPRECATED: Use safeHighlightText from @/lib/html-sanitizer instead
import { safeHighlightText } from '@/lib/html-sanitizer';

export function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm) return text;
  
  // Use safe highlighting to prevent XSS
  return safeHighlightText(text, searchTerm);
}