/**
 * 개선된 EventsArtifactPanel - 통합 상태 관리 적용
 * 실시간 동기화와 자동 이벤트 동기화
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
// Date utilities for filtering
import { getUserTimezone, getDateRangeForQuery, isEventInRange } from '@/utils/dateUtils';

interface EnhancedArtifactPanelProps {
  locale: 'ko' | 'en';
  onEventEdit?: (eventId: string) => void;
  onEventDelete?: (eventId: string) => void;
  onRefresh?: () => void;
  userId?: string;
  authToken?: string;
}

export function EnhancedEventsArtifactPanel({
  locale,
  onEventEdit,
  onEventDelete,
  onRefresh,
  userId,
  authToken
}: EnhancedArtifactPanelProps) {
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
  const unifiedSync = useUnifiedSync({
    userId,
    authToken,
    enabled: isOpen, // 패널이 열려있을 때만 활성화
    preferredMethod: 'auto'
  });

  // === 디바운스 검색 ===
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // === 필터링된 이벤트 ===
  const filteredEvents = useMemo(() => {
    let events = artifactEvents;

    // First apply date filtering if artifactQuery exists
    if (artifactQuery) {
      const dateRange = getDateRangeForQuery(artifactQuery, getUserTimezone());

      if (dateRange) {
        events = events.filter(event => {
          const inRange = isEventInRange(event, dateRange.start, dateRange.end, getUserTimezone());
          return inRange;
        });

        console.log('[EventsArtifactPanel] Date filtered results:', {
          query: artifactQuery,
          dateRange: {
            start: dateRange.start.toISOString(),
            end: dateRange.end.toISOString(),
            label: dateRange.label
          },
          originalCount: artifactEvents.length,
          filteredCount: events.length,
          filteredEvents: events.map(e => ({
            id: e.id,
            title: e.summary,
            date: e.start
          }))
        });
      }
    }

    // Then apply search query filter
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      events = events.filter(event => (
        event.summary?.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query)
      ));
    }

    return events;
  }, [artifactEvents, artifactQuery, debouncedSearchQuery]);

  // === 이벤트 핸들러들 ===
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
      unifiedSync.triggerSync();

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
      // Optimistic delete with SWR cache
      await optimisticDelete(event.id);

      // Also update store for consistency
      deleteEvent(event.id);

      // 외부 삭제 함수 호출
      if (onEventDelete) {
        await onEventDelete(event.id);
      }

      toast.success(locale === 'ko' ? '일정이 삭제되었습니다' : 'Event deleted');
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error(locale === 'ko' ? '삭제 실패' : 'Delete failed');
    }
  }, [optimisticDelete, deleteEvent, onEventDelete, toast, locale]);

  const handleApplyChanges = useCallback(async () => {
    if (!focusedEvent || !pendingChanges) return;

    try {
      // Optimistic update with caching
      if (focusedEvent.id && pendingChanges) {
        await optimisticUpdate(focusedEvent.id, pendingChanges);
      }

      // Apply changes to store
      applyChanges();
      toast.success(locale === 'ko' ? '변경사항이 저장되었습니다' : 'Changes saved');
    } catch (error) {
      console.error('Apply changes failed:', error);
      toast.error(locale === 'ko' ? '저장 실패' : 'Save failed');
    }
  }, [focusedEvent, pendingChanges, optimisticUpdate, applyChanges, toast, locale]);

  // === 동기화 상태 정보 ===
  const syncStatusInfo = getUnifiedSyncStatusInfo(
    unifiedSync.method,
    unifiedSync.connected,
    unifiedSync.quality,
    locale
  );

  // === 렌더링 조건 ===
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{
          type: 'spring',
          damping: 25,
          stiffness: 250
        }}
        className={`fixed top-0 right-0 h-full bg-gray-50/50 dark:bg-gray-950 backdrop-blur-sm shadow-xl z-50 flex flex-col border-l border-gray-200 dark:border-gray-800 ${
          isMaximized ? 'w-full lg:w-2/3' : 'w-full lg:w-[450px]'
        }`}
      >
        {/* === 헤더 === */}
        <div className="border-b border-gray-200 dark:border-gray-800">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* 제목 */}
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {mode === 'focused' && focusedEvent
                    ? focusedEvent.summary || (locale === 'ko' ? '제목 없음' : 'Untitled')
                    : (locale === 'ko' ? '일정' : 'Events')}
                </h2>

                {/* 이벤트 수 배지 */}
                {mode !== 'focused' && (
                  <span className="px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-full">
                    {filteredEvents.length}
                  </span>
                )}

                {/* 동기화 상태 */}
                <div className={`flex items-center gap-1 text-xs ${syncStatusInfo.color}`}>
                  <span className={syncStatusInfo.pulse ? 'animate-pulse' : ''}>
                    {syncStatusInfo.icon}
                  </span>
                  <span>{syncStatusInfo.text}</span>
                </div>

                {/* Cache status indicator */}
                {fromCache && (
                  <div className="flex items-center gap-1 text-xs text-blue-500">
                    <CheckCircle className="w-3 h-3" />
                    <span>{locale === 'ko' ? '캐시됨' : 'Cached'}</span>
                  </div>
                )}

                {/* Loading/Validating indicator */}
                {(isLoading || isValidating) && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>{isLoading ? (locale === 'ko' ? '로딩 중' : 'Loading') : (locale === 'ko' ? '검증 중' : 'Validating')}</span>
                  </div>
                )}

                {/* 펜딩 업로드 표시 */}
                {pendingUploads > 0 && (
                  <div className="flex items-center gap-1 text-xs text-orange-500">
                    <Zap className="w-3 h-3" />
                    <span>{pendingUploads}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* 새로고침 버튼 */}
                <button
                  onClick={handleRefresh}
                  className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-all"
                  title={locale === 'ko' ? '새로고침' : 'Refresh'}
                  disabled={syncStatus === 'syncing'}
                >
                  <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                </button>

                {/* 확대/축소 버튼 */}
                <button
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-all"
                >
                  {isMaximized ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>

                {/* 닫기 버튼 */}
                <button
                  onClick={closePanel}
                  className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 검색 바 (리스트 모드에서만) */}
            {mode !== 'focused' && (
              <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={locale === 'ko' ? '일정 검색...' : 'Search events...'}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* 펜딩 변경사항 알림 */}
            {pendingChanges && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    {locale === 'ko' ? '저장되지 않은 변경사항이 있습니다' : 'You have unsaved changes'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleApplyChanges}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      {locale === 'ko' ? '저장' : 'Save'}
                    </button>
                    <button
                      onClick={cancelChanges}
                      className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                    >
                      {locale === 'ko' ? '취소' : 'Cancel'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* === 컨텐츠 영역 === */}
        <div className="flex-1 overflow-y-auto">
          {mode === 'focused' && focusedEvent ? (
            // 포커스 모드
            <FocusedEventView
              event={focusedEvent}
              locale={locale}
              onEdit={() => setMode('edit')}
              onDelete={() => handleEventDelete(focusedEvent)}
            />
          ) : (
            // 리스트 모드
            <div className="p-4 space-y-3">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">
                    {searchQuery
                      ? (locale === 'ko' ? '검색 결과가 없습니다' : 'No events found')
                      : (locale === 'ko' ? '표시할 일정이 없습니다' : 'No events to display')
                    }
                  </p>
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <NotionStyleEventCard
                    key={event.id}
                    event={event}
                    locale={locale}
                    isExpanded={expandedEvents.has(event.id || '')}
                    onToggleExpand={() => event.id && toggleEventExpansion(event.id)}
                    onEdit={() => handleEventEdit(event)}
                    onDelete={() => handleEventDelete(event)}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* === 푸터 (상태 정보) === */}
        <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-2">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-3">
              <span>
                {locale === 'ko' ? '마지막 동기화' : 'Last sync'}:{' '}
                {lastSync || unifiedSync.lastActivity
                  ? (lastSync || unifiedSync.lastActivity)!.toLocaleTimeString(locale)
                  : (locale === 'ko' ? '없음' : 'Never')
                }
              </span>
              {(syncError || cacheError) && (
                <span className="text-red-500">
                  {locale === 'ko' ? '오류' : 'Error'}: {syncError || cacheError?.message}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unifiedSync.method !== 'none' && (
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                  {unifiedSync.method === 'supabase' ? 'Realtime' : 'SSE'}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}