/**
 * Optimized EventsArtifactPanel - Enhanced performance with optimized filtering
 * 실시간 동기화와 자동 이벤트 동기화 with performance improvements
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  Maximize2,
  Minimize2,
  RefreshCw,
  Check,
  List,
  Eye,
  Filter,
  Search,
  Plus,
  Zap,
  CheckCircle
} from 'lucide-react';
import { CalendarEvent } from '@/types';
import Image from 'next/image';
import { FocusedEventView } from './FocusedEventView';
import { NotionStyleEventCard } from './NotionStyleEventCard';
import { useToastContext } from '@/providers/ToastProvider';

// 통합 상태 관리
import {
  useArtifactPanel,
  useEvents,
  useSyncState,
  useUnifiedEventStore
} from '@/store/unifiedEventStore';
import { useUnifiedSync, getUnifiedSyncStatusInfo } from '@/hooks/useUnifiedSync';
// Optimized caching hook
import { useArtifactCache } from '@/hooks/useArtifactCache';
// Optimized filtering hook
import { useOptimizedEventFiltering } from '@/hooks/useOptimizedEventFiltering';

interface OptimizedArtifactPanelProps {
  locale: 'ko' | 'en';
  onEventEdit?: (eventId: string) => void;
  onEventDelete?: (eventId: string) => void;
  onRefresh?: () => void;
  userId?: string;
  authToken?: string;
}

export const OptimizedEventsArtifactPanel = React.memo<OptimizedArtifactPanelProps>(
  function OptimizedEventsArtifactPanel({
    locale,
    onEventEdit,
    onEventDelete,
    onRefresh,
    userId,
    authToken
  }) {
    const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
    const [isMaximized, setIsMaximized] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    const { toast } = useToastContext();

    // === 통합 상태 관리 - 개별 selectors 사용 ===
    const isOpen = useUnifiedEventStore(state => state.isArtifactOpen);
    const mode = useUnifiedEventStore(state => state.artifactMode);
    const artifactEventsFromStore = useUnifiedEventStore(state => state.artifactEvents);
    const artifactQuery = useUnifiedEventStore(state => state.artifactQuery);
    const focusedEvent = useUnifiedEventStore(state => state.focusedEvent);
    const pendingChanges = useUnifiedEventStore(state => state.pendingChanges);
    const closePanel = useUnifiedEventStore(state => state.closeArtifactPanel);
    const setMode = useUnifiedEventStore(state => state.setArtifactMode);
    const setFocused = useUnifiedEventStore(state => state.setFocusedEvent);
    const setPending = useUnifiedEventStore(state => state.setPendingChanges);
    const applyChanges = useUnifiedEventStore(state => state.applyPendingChanges);
    const cancelChanges = useUnifiedEventStore(state => state.cancelPendingChanges);

    const allEvents = useUnifiedEventStore(state => state.events);
    const updateEvent = useUnifiedEventStore(state => state.updateEvent);
    const deleteEvent = useUnifiedEventStore(state => state.deleteEvent);
    const highlightedEventId = useUnifiedEventStore(state => state.highlightedEventId);

    const syncStatus = useUnifiedEventStore(state => state.syncStatus);
    const pendingUploads = useUnifiedEventStore(state => state.pendingUploads);
    const syncError = useUnifiedEventStore(state => state.syncError);

    // === Optimized caching with SWR ===
    const {
      data: cachedEvents,
      lastSync,
      fromCache,
      isLoading,
      isValidating,
      error: cacheError,
      revalidate,
      optimisticCreate,
      optimisticUpdate,
      optimisticDelete
    } = useArtifactCache({
      userId,
      authToken,
      enabled: isOpen && !!userId,
      refreshInterval: 60000, // Refresh every minute
      dedupingInterval: 5000  // Dedupe requests within 5 seconds
    });

    // Use cached events if available, fallback to store
    const artifactEvents = useMemo(() => {
      if (cachedEvents && cachedEvents.length > 0) {
        return cachedEvents;
      }
      return artifactEventsFromStore;
    }, [cachedEvents, artifactEventsFromStore]);

    // === 실시간 동기화 ===
    // Temporarily disable realtime sync to fix overlay navigation freeze
    // const unifiedSync = useUnifiedSync({
    //   userId,
    //   authToken,
    //   enabled: isOpen, // 패널이 열려있을 때만 활성화
    //   preferredMethod: 'auto'
    // });

    // Mock unifiedSync object to prevent reference errors
    const unifiedSync = {
      connected: false,
      errors: 0,
      method: 'none' as const,
      lastActivity: null
    };

    // === 디바운스 검색 - 성능 최적화 ===
    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedSearchQuery(searchQuery);
      }, 300);
      return () => clearTimeout(timer);
    }, [searchQuery]);

    // === 최적화된 필터링 ===
    const {
      events: filteredEvents,
      stats: filterStats,
      isEventMatching,
      getEventsInRange,
      userTimezone,
      dateRange
    } = useOptimizedEventFiltering({
      events: artifactEvents,
      searchQuery: debouncedSearchQuery,
      artifactQuery: artifactQuery ?? undefined,
      isDevelopment: process.env.NODE_ENV === 'development'
    });

    // === 성능 최적화된 이벤트 핸들러들 ===
    const toggleEventExpansion = useCallback((eventId: string) => {
      setExpandedEvents(prev => {
        const newSet = new Set(prev);
        if (newSet.has(eventId)) {
          newSet.delete(eventId);
        } else {
          newSet.add(eventId);
        }
        return newSet;
      });
    }, []);

    const handleRefresh = useCallback(async () => {
      try {
        // Use SWR revalidate for intelligent caching
        await revalidate();

        // Also trigger unified sync for realtime updates
        // Trigger sync if available
        // unifiedSync might not have triggerSync if not connected

        // 외부 새로고침 함수 호출
        if (onRefresh) {
          await onRefresh();
        }

        toast.success(locale === 'ko' ? '동기화 완료' : 'Sync completed');
      } catch (error) {
        console.error('Refresh failed:', error);
        toast.error(locale === 'ko' ? '동기화 실패' : 'Sync failed');
      }
    }, [revalidate, unifiedSync, onRefresh, toast, locale]);

    const handleEventEdit = useCallback((event: CalendarEvent) => {
      if (onEventEdit && event.id) {
        onEventEdit(event.id);
      } else {
        // 인라인 편집 모드
        setFocused(event);
        setMode('edit');
      }
    }, [onEventEdit, setFocused, setMode]);

    const handleEventDelete = useCallback(async (event: CalendarEvent) => {
      if (!event.id) return;

      const confirmMessage = locale === 'ko'
        ? `"${event.summary}" 일정을 삭제하시겠습니까?`
        : `Are you sure you want to delete "${event.summary}"?`;

      if (!confirm(confirmMessage)) return;

      try {
        // Optimistic deletion for better UX
        optimisticDelete(event.id);

        // Call parent handler
        if (onEventDelete) {
          await onEventDelete(event.id);
        }

        // Remove from store
        deleteEvent(event.id);

        toast.success(locale === 'ko' ? '일정이 삭제되었습니다' : 'Event deleted successfully');
      } catch (error) {
        console.error('Failed to delete event:', error);
        toast.error(locale === 'ko' ? '일정 삭제 실패' : 'Failed to delete event');
        // Revalidate to restore the event if deletion failed
        await revalidate();
      }
    }, [locale, onEventDelete, optimisticDelete, deleteEvent, toast, revalidate]);

    // === Memoized UI Components ===
    const syncStatusInfo = useMemo(() => {
      const quality = unifiedSync && 'quality' in unifiedSync ? (unifiedSync as any).quality : 'unknown';
      return getUnifiedSyncStatusInfo(
        unifiedSync?.method || 'none',
        unifiedSync?.connected || false,
        quality as string,
        locale
      );
    }, [unifiedSync?.connected, unifiedSync?.errors, locale]);

    const headerTitle = useMemo(() => {
      const baseTitle = locale === 'ko' ? '일정' : 'Events';
      if (filterStats.finalCount !== filterStats.originalCount) {
        return `${baseTitle} (${filterStats.finalCount}/${filterStats.originalCount})`;
      }
      return `${baseTitle} (${filterStats.finalCount})`;
    }, [locale, filterStats.finalCount, filterStats.originalCount]);

    // === Render optimization: only show if panel is open ===
    if (!isOpen) return null;

    return (
      <AnimatePresence>
        <motion.div
          key="artifact-panel"
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`fixed inset-y-0 right-0 z-50 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl ${
            isMaximized ? 'w-full' : 'w-96'
          }`}
        >
          {/* Header - Optimized */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {headerTitle}
                </h2>
              </div>

              {/* Sync Status Indicator */}
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${syncStatusInfo.color}`} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {syncStatusInfo.text}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isValidating}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                title={locale === 'ko' ? '새로고침' : 'Refresh'}
              >
                <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
              </button>

              {/* Maximize/Minimize */}
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title={isMaximized ?
                  (locale === 'ko' ? '축소' : 'Minimize') :
                  (locale === 'ko' ? '확대' : 'Maximize')
                }
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close Button */}
              <button
                onClick={closePanel}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title={locale === 'ko' ? '닫기' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar - Performance optimized */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={locale === 'ko' ? '일정 검색...' : 'Search events...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Summary */}
            {(dateRange || searchQuery) && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {dateRange && (
                  <span>
                    {locale === 'ko' ? '기간: ' : 'Period: '}
                    {dateRange.label || 'Custom range'}
                  </span>
                )}
                {dateRange && searchQuery && ' • '}
                {searchQuery && (
                  <span>
                    {locale === 'ko' ? '검색: ' : 'Search: '}
                    "{searchQuery}"
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                <span className="ml-2 text-gray-500 dark:text-gray-400">
                  {locale === 'ko' ? '로딩 중...' : 'Loading...'}
                </span>
              </div>
            )}

            {/* Error State */}
            {cacheError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 text-red-700 dark:text-red-300">
                <p className="font-medium">
                  {locale === 'ko' ? '오류 발생' : 'Error occurred'}
                </p>
                <p className="text-sm mt-1">
                  {cacheError.message}
                </p>
              </div>
            )}

            {/* Events List - Optimized rendering */}
            {!isLoading && filteredEvents.length > 0 && (
              <div className="p-4 space-y-3">
                {filteredEvents.map((event) => (
                  <div key={event.id} className="relative">
                    <NotionStyleEventCard
                      event={event}
                      isExpanded={expandedEvents.has(event.id!)}
                      onToggleExpand={() => toggleEventExpansion(event.id!)}
                      onEdit={() => handleEventEdit(event)}
                      onDelete={() => handleEventDelete(event)}
                      locale={locale}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredEvents.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400">
                <Calendar className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">
                  {searchQuery || artifactQuery
                    ? (locale === 'ko' ? '일정을 찾을 수 없습니다' : 'No events found')
                    : (locale === 'ko' ? '일정이 없습니다' : 'No events')
                  }
                </p>
                {searchQuery && (
                  <p className="text-sm text-center">
                    {locale === 'ko'
                      ? '다른 검색어를 시도해보세요'
                      : 'Try a different search term'
                    }
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer with cache info (development only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
              <div className="flex justify-between items-center">
                <span>
                  Cache: {fromCache ? '✓' : '✗'} |
                  Last: {lastSync ? new Date(lastSync).toLocaleTimeString() : 'Never'}
                </span>
                <span>
                  Filtered: {filterStats.finalCount}/{filterStats.originalCount}
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }
);

OptimizedEventsArtifactPanel.displayName = 'OptimizedEventsArtifactPanel';