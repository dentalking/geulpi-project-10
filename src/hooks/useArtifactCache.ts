/**
 * Optimized caching hook for artifact panel data
 * Uses SWR for intelligent caching and revalidation
 */

import useSWR, { mutate } from 'swr';
import { CalendarEvent } from '@/types';
import { logger } from '@/lib/logger';
import { apiRateLimitManager } from '@/lib/ApiRateLimitManager';

interface ArtifactCacheOptions {
  userId?: string | null;
  authToken?: string;
  enabled?: boolean;
  refreshInterval?: number;
  dedupingInterval?: number;
}

interface ArtifactData {
  events: CalendarEvent[];
  lastSync: Date;
  fromCache: boolean;
}

// SWR fetcher function with rate limiting
const artifactFetcher = async (url: string, authToken?: string): Promise<ArtifactData> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `auth-token ${authToken}`;
  }

  // Use fetchWithRateLimit for automatic rate limiting
  const response = await apiRateLimitManager.fetchWithRateLimit(
    url,
    {
      method: 'GET',
      headers,
      credentials: 'include',
    },
    'ko'
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    events: data.events || [],
    lastSync: new Date(),
    fromCache: false
  };
};

/**
 * Optimized hook for artifact panel data with intelligent caching
 */
export function useArtifactCache(options: ArtifactCacheOptions = {}) {
  const {
    userId,
    authToken,
    enabled = true,
    refreshInterval = 60000, // 1 minute default
    dedupingInterval = 5000, // 5 seconds deduping
  } = options;

  // Build cache key with user context
  const cacheKey = enabled && userId
    ? `/api/calendar/events?userId=${userId}&artifact=true`
    : null;

  // Use SWR with optimized config
  const { data, error, isLoading, isValidating, mutate: revalidate } = useSWR<ArtifactData>(
    cacheKey,
    (url) => artifactFetcher(url, authToken),
    {
      // Intelligent refresh settings
      refreshInterval,
      dedupingInterval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      shouldRetryOnError: true,
      errorRetryInterval: 10000,
      errorRetryCount: 3,

      // Keep stale data while revalidating
      keepPreviousData: true,

      // Fallback data from memory cache
      fallbackData: undefined,

      // Optimistic UI updates
      revalidateIfStale: false,
      revalidateOnMount: true,

      // Custom compare function to prevent unnecessary re-renders
      compare: (a, b) => {
        if (!a || !b) return a === b;

        // Check if events are actually different
        if (a.events.length !== b.events.length) return false;

        // Deep comparison for events (checking IDs only for performance)
        const aIds = new Set(a.events.map(e => e.id));
        const bIds = new Set(b.events.map(e => e.id));

        if (aIds.size !== bIds.size) return false;

        for (const id of aIds) {
          if (!bIds.has(id)) return false;
        }

        return true;
      },

      onSuccess: (data) => {
        logger.debug('[ArtifactCache] Data fetched successfully', {
          eventCount: data.events.length,
          fromCache: data.fromCache
        });
      },

      onError: (err) => {
        logger.error('[ArtifactCache] Fetch error', err);
      }
    }
  );

  // Optimistic update function for creating events
  const optimisticCreate = async (newEvent: CalendarEvent) => {
    // Optimistic UI update
    await mutate(
      cacheKey,
      (current) => {
        if (!current) return current;
        return {
          ...current,
          events: [...current.events, newEvent],
          fromCache: true
        };
      },
      false // Don't revalidate immediately
    );

    // Then revalidate in background
    setTimeout(() => revalidate(), 1000);
  };

  // Optimistic update function for updating events
  const optimisticUpdate = async (eventId: string, updates: Partial<CalendarEvent>) => {
    await mutate(
      cacheKey,
      (current) => {
        if (!current) return current;
        return {
          ...current,
          events: current.events.map(e =>
            e.id === eventId ? { ...e, ...updates } : e
          ),
          fromCache: true
        };
      },
      false
    );

    // Then revalidate in background
    setTimeout(() => revalidate(), 1000);
  };

  // Optimistic delete function
  const optimisticDelete = async (eventId: string) => {
    await mutate(
      cacheKey,
      (current) => {
        if (!current) return current;
        return {
          ...current,
          events: current.events.filter(e => e.id !== eventId),
          fromCache: true
        };
      },
      false
    );

    // Then revalidate in background
    setTimeout(() => revalidate(), 1000);
  };

  // Clear cache function
  const clearCache = async () => {
    await mutate(cacheKey, undefined, false);
  };

  return {
    data: data?.events || [],
    lastSync: data?.lastSync || null,
    fromCache: data?.fromCache || false,
    isLoading,
    isValidating,
    error,
    revalidate,
    optimisticCreate,
    optimisticUpdate,
    optimisticDelete,
    clearCache
  };
}

/**
 * Global cache invalidation helper
 */
export async function invalidateArtifactCache(userId?: string) {
  const cacheKey = userId
    ? `/api/calendar/events?userId=${userId}&artifact=true`
    : `/api/calendar/events`;

  await mutate(cacheKey);
}

/**
 * Prefetch artifact data for better UX
 */
export async function prefetchArtifactData(userId: string, authToken?: string) {
  const url = `/api/calendar/events?userId=${userId}&artifact=true`;

  try {
    const data = await artifactFetcher(url, authToken);

    // Pre-populate SWR cache
    await mutate(url, data, false);

    return data;
  } catch (error) {
    logger.error('[ArtifactCache] Prefetch failed', error);
    return null;
  }
}