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
  Plus
} from 'lucide-react';
import { CalendarEvent } from '@/types';
import Image from 'next/image';
import { FocusedEventView } from './FocusedEventView';
import { NotionStyleEventCard } from './NotionStyleEventCard';

type ArtifactMode = 'list' | 'focused' | 'edit';

interface EventsArtifactPanelProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  title?: string;
  locale: 'ko' | 'en';
  onEventEdit?: (eventId: string) => void;
  onEventDelete?: (eventId: string) => void;
  onRefresh?: () => void;
  mode?: ArtifactMode;
  focusedEvent?: CalendarEvent | null;
  pendingChanges?: Partial<CalendarEvent> | null;
  onApplyChanges?: (changes: Partial<CalendarEvent>) => void;
}

export function EventsArtifactPanel({
  isOpen,
  onClose,
  events,
  title,
  locale,
  onEventEdit,
  onEventDelete,
  onRefresh,
  mode = 'list',
  focusedEvent = null,
  pendingChanges = null,
  onApplyChanges
}: EventsArtifactPanelProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [isMaximized, setIsMaximized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debug: Log received events
  useEffect(() => {
    console.log('[EventsArtifactPanel] Received events:', {
      count: events?.length,
      mode,
      title,
      isOpen,
      events: events?.slice(0, 3).map(e => ({ id: e.id, summary: e.summary }))
    });
  }, [events, mode, title, isOpen]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Filter events based on debounced search query
  const filteredEvents = useMemo(() => {
    if (!debouncedSearchQuery) return events;
    const query = debouncedSearchQuery.toLowerCase();
    return events.filter(event => (
      event.summary?.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query)
    ));
  }, [events, debouncedSearchQuery]);


  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - Now visible on all screen sizes but with different opacity */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 lg:bg-black/5 backdrop-blur-sm z-[70] pointer-events-auto cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
          />

          {/* Panel - Notion Style */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 250
            }}
            onClick={(e) => {
              e.stopPropagation(); // Prevent backdrop click when clicking inside panel
            }}
            className={`fixed top-0 right-0 h-full bg-gray-50/50 dark:bg-gray-950 backdrop-blur-sm shadow-xl z-[80] flex flex-col border-l border-gray-200 dark:border-gray-800 pointer-events-auto ${
              isMaximized ? 'w-full lg:w-2/3' : 'w-full lg:w-[450px]'
            }`}
          >
            {/* Header - Notion Style */}
            <div className="border-b border-gray-200 dark:border-gray-800">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Title */}
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {mode === 'focused' && focusedEvent
                        ? focusedEvent.summary || (locale === 'ko' ? '제목 없음' : 'Untitled')
                        : (title || (locale === 'ko' ? '일정' : 'Events'))}
                    </h2>
                    {/* Count Badge */}
                    {mode !== 'focused' && (
                      <span className="px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-full">
                        {filteredEvents.length}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Actions */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRefresh();
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-all pointer-events-auto"
                      title={locale === 'ko' ? '새로고침' : 'Refresh'}
                      style={{ minWidth: '32px', minHeight: '32px' }}
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsMaximized(!isMaximized);
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-all pointer-events-auto"
                      title={locale === 'ko' ? (isMaximized ? '최소화' : '최대화') : (isMaximized ? 'Minimize' : 'Maximize')}
                      style={{ minWidth: '32px', minHeight: '32px' }}
                    >
                      {isMaximized ? (
                        <Minimize2 className="w-4 h-4" />
                      ) : (
                        <Maximize2 className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onClose();
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-all pointer-events-auto"
                      title={locale === 'ko' ? '닫기' : 'Close'}
                      style={{ minWidth: '32px', minHeight: '32px' }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Search Bar - Only in list mode */}
                {mode !== 'focused' && (
                  <div className="mt-4 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={locale === 'ko' ? '일정 검색...' : 'Search events...'}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Content based on mode */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {mode === 'focused' && focusedEvent ? (
                  // Focused Event View
                  <motion.div
                    key="focused"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full p-6"
                  >
                    <FocusedEventView
                      event={focusedEvent}
                      pendingChanges={pendingChanges}
                      locale={locale}
                      onApplyChanges={onApplyChanges}
                      onCancelChanges={() => {
                        // Reset pending changes
                        if (onApplyChanges) {
                          // Call with empty object to clear changes
                          onApplyChanges({});
                        }
                      }}
                      onEdit={onEventEdit}
                      onDelete={onEventDelete}
                    />
                  </motion.div>
                ) : filteredEvents.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-full py-12"
                  >
                    <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      {searchQuery
                        ? (locale === 'ko' ? '검색 결과가 없습니다' : 'No matching events')
                        : (locale === 'ko' ? '일정이 없습니다' : 'No events found')}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-6 space-y-3"
                  >
                    {/* Events List with Notion Style Cards */}
                    {filteredEvents.map((event, index) => (
                      <NotionStyleEventCard
                        key={event.id || index}
                        event={event}
                        locale={locale}
                        onEdit={() => event.id && onEventEdit?.(event.id)}
                        onDelete={() => event.id && onEventDelete?.(event.id)}
                        onDuplicate={() => {
                          // TODO: Implement duplicate functionality
                          console.log('Duplicate event:', event.id);
                        }}
                        isExpanded={event.id ? expandedEvents.has(event.id) : false}
                        onToggleExpand={() => event.id && toggleEventExpansion(event.id)}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer - Notion Style */}
            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50">
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                {locale === 'ko'
                  ? 'AI 채팅으로 일정을 관리하세요'
                  : 'Manage events through AI chat'}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}