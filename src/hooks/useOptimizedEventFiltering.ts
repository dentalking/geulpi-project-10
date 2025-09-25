/**
 * Optimized event filtering hook
 * Reduces expensive operations and improves filtering performance
 */

import { useMemo, useCallback } from 'react';
import { CalendarEvent } from '@/types';
import { getUserTimezone, getDateRangeForQuery, isEventInRange } from '@/utils/dateUtils';

interface UseOptimizedEventFilteringOptions {
  events: CalendarEvent[];
  searchQuery: string;
  artifactQuery?: string;
  isDevelopment?: boolean;
}

interface FilteredResult {
  events: CalendarEvent[];
  stats: {
    originalCount: number;
    dateFiltered: number;
    searchFiltered: number;
    finalCount: number;
  };
}

export function useOptimizedEventFiltering({
  events,
  searchQuery,
  artifactQuery,
  isDevelopment = false
}: UseOptimizedEventFilteringOptions): FilteredResult {

  // Memoize timezone to avoid recalculation
  const userTimezone = useMemo(() => getUserTimezone(), []);

  // Memoize date range calculation
  const dateRange = useMemo(() => {
    if (!artifactQuery) return null;
    return getDateRangeForQuery(artifactQuery, userTimezone);
  }, [artifactQuery, userTimezone]);

  // Memoize search terms for better string matching
  const searchTerms = useMemo(() => {
    if (!searchQuery.trim()) return null;

    const normalizedQuery = searchQuery.toLowerCase().trim();
    return {
      query: normalizedQuery,
      terms: normalizedQuery.split(' ').filter(term => term.length > 0)
    };
  }, [searchQuery]);

  // Pre-process events with searchable text
  const eventsWithSearchableText = useMemo(() => {
    return events.map(event => ({
      ...event,
      _searchText: [
        event.summary?.toLowerCase() || '',
        event.description?.toLowerCase() || '',
        event.location?.toLowerCase() || ''
      ].join(' ')
    }));
  }, [events]);

  // Optimized filtering with early returns and minimal operations
  const filteredResult = useMemo(() => {
    const stats = {
      originalCount: events.length,
      dateFiltered: 0,
      searchFiltered: 0,
      finalCount: 0
    };

    // Early return if no events
    if (events.length === 0) {
      return { events: [], stats };
    }

    let filteredEvents = eventsWithSearchableText;

    // Step 1: Date filtering (if needed)
    if (dateRange && dateRange.start && dateRange.end) {
      filteredEvents = filteredEvents.filter(event => {
        return isEventInRange(event, dateRange.start, dateRange.end, userTimezone);
      });

      stats.dateFiltered = filteredEvents.length;

      // Development-only logging
      if (isDevelopment) {
        console.log('[OptimizedEventFiltering] Date filtered:', {
          query: artifactQuery,
          originalCount: stats.originalCount,
          filteredCount: stats.dateFiltered,
          dateRange: {
            start: dateRange.start.toISOString(),
            end: dateRange.end.toISOString()
          }
        });
      }
    } else {
      stats.dateFiltered = filteredEvents.length;
    }

    // Step 2: Search filtering (optimized string matching)
    if (searchTerms) {
      filteredEvents = filteredEvents.filter(event => {
        const searchText = event._searchText;

        // Use includes for single term, or check all terms for multi-word search
        if (searchTerms.terms.length === 1) {
          return searchText.includes(searchTerms.query);
        } else {
          // For multi-word search, check if all terms are present
          return searchTerms.terms.every(term => searchText.includes(term));
        }
      });
    }

    stats.searchFiltered = filteredEvents.length;
    stats.finalCount = filteredEvents.length;

    // Remove the temporary searchable text property
    const cleanedEvents = filteredEvents.map(event => {
      const { _searchText, ...cleanEvent } = event;
      return cleanEvent as CalendarEvent;
    });

    return {
      events: cleanedEvents,
      stats
    };
  }, [eventsWithSearchableText, dateRange, searchTerms, userTimezone, artifactQuery, isDevelopment]);

  // Optimized event matching function for external use
  const isEventMatching = useCallback((event: CalendarEvent, query: string): boolean => {
    if (!query.trim()) return true;

    const searchText = [
      event.summary?.toLowerCase() || '',
      event.description?.toLowerCase() || '',
      event.location?.toLowerCase() || ''
    ].join(' ');

    const normalizedQuery = query.toLowerCase().trim();
    return searchText.includes(normalizedQuery);
  }, []);

  // Get events within a specific date range (cached)
  const getEventsInRange = useCallback((startDate: Date, endDate: Date) => {
    return events.filter(event =>
      isEventInRange(event, startDate, endDate, userTimezone)
    );
  }, [events, userTimezone]);

  return {
    ...filteredResult,
    isEventMatching,
    getEventsInRange,
    userTimezone,
    dateRange
  };
}