'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search as SearchIcon, 
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Repeat,
  Star,
  Filter,
  ChevronRight,
  Sparkles,
  TrendingUp,
  History,
  Zap,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useToastContext } from '@/providers/ToastProvider';
import { useSearch } from '@/hooks/useSearch';
import type { CalendarEvent } from '@/types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEvent?: (event: CalendarEvent) => void;
}

export function SearchModal({ isOpen, onClose, onSelectEvent }: SearchModalProps) {
  const locale = useLocale();
  const t = useTranslations('common');
  const { toast } = useToastContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedEventIndex, setSelectedEventIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  
  const { 
    results: searchResults, 
    isLoading: loading, 
    error, 
    setQuery,
    recentSearches,
    clearSearch
  } = useSearch();

  // Convert SearchResult to CalendarEvent format
  const results: CalendarEvent[] = searchResults.map(result => ({
    id: result.id,
    summary: result.title,
    description: result.description,
    location: result.location,
    start: result.date ? { dateTime: result.date } : undefined,
    end: result.date ? { dateTime: result.date } : undefined,
    attendees: []
  } as CalendarEvent));

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      clearSearch();
      setSelectedFilter('all');
      setSelectedEventIndex(0);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, clearSearch]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedEventIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedEventIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        );
      } else if (e.key === 'Enter' && results[selectedEventIndex]) {
        e.preventDefault();
        handleEventClick(results[selectedEventIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedEventIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsContainerRef.current && results.length > 0) {
      const selectedElement = resultsContainerRef.current.children[selectedEventIndex] as HTMLElement;
      selectedElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedEventIndex, results.length]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setSelectedEventIndex(0);
    if (term.trim()) {
      setQuery(term);
    } else {
      clearSearch();
    }
  }, [setQuery, clearSearch]);

  const formatDateTime = (dateTime: string | undefined) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    let dateStr = '';
    if (date.toDateString() === today.toDateString()) {
      dateStr = locale === 'ko' ? '오늘' : 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      dateStr = locale === 'ko' ? '내일' : 'Tomorrow';
    } else {
      dateStr = date.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
        month: 'short',
        day: 'numeric',
        weekday: 'short'
      });
    }

    const timeStr = date.toLocaleTimeString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });

    return `${dateStr} ${timeStr}`;
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (onSelectEvent) {
      onSelectEvent(event);
    }
    onClose();
  };

  const hasVideoMeeting = (location?: string) => {
    if (!location) return false;
    const lowerLocation = location.toLowerCase();
    return lowerLocation.includes('meet') || 
           lowerLocation.includes('zoom') ||
           lowerLocation.includes('teams');
  };

  const getEventTypeIcon = (event: CalendarEvent) => {
    if (hasVideoMeeting(event.location)) return Video;
    if (event.location) return MapPin;
    if (event.attendees && event.attendees.length > 0) return Users;
    if (event.recurrence) return Repeat;
    return Calendar;
  };

  const getEventPriority = (event: CalendarEvent) => {
    const title = event.summary?.toLowerCase() || '';
    if (title.includes('urgent') || title.includes('긴급') || 
        title.includes('important') || title.includes('중요')) {
      return 'high';
    }
    if (event.attendees && event.attendees.length > 5) return 'high';
    if (event.attendees && event.attendees.length > 0) return 'medium';
    return 'low';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
          />
          
          {/* Modal Container - Centered */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="w-full max-w-[650px] lg:max-w-[750px] max-h-[90vh] pointer-events-auto"
            >
            <div className="bg-gradient-to-b from-gray-900/95 to-gray-950/95 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-2xl border border-gray-800/50 h-full md:h-auto flex flex-col">
              {/* Header with gradient */}
              <div className="relative overflow-hidden rounded-t-2xl md:rounded-t-3xl">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-cyan-600/10" />
                <div className="relative p-4 md:p-6 pb-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">
                          {locale === 'ko' ? 'AI 일정 검색' : 'AI Event Search'}
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {locale === 'ko' ? '스마트 필터와 AI 추천' : 'Smart filters & AI suggestions'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-2 rounded-xl hover:bg-white/10 transition-all group"
                    >
                      <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                    </button>
                  </div>
                  
                  {/* Search Input with animations */}
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-xl blur-xl group-focus-within:from-purple-600/30 group-focus-within:to-blue-600/30 transition-all" />
                    <div className="relative flex items-center">
                      <SearchIcon className="absolute left-4 w-5 h-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder={locale === 'ko' ? '일정, 참석자, 장소 검색...' : 'Search events, attendees, locations...'}
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => handleSearch('')}
                          className="absolute right-3 p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors"
                        >
                          <X className="w-4 h-4 text-gray-400" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Quick Filters with better design */}
                  <div className="flex gap-2 mt-4 pb-4 overflow-x-auto scrollbar-hide">
                    {[
                      { id: 'all', label: locale === 'ko' ? '전체' : 'All', icon: Sparkles },
                      { id: 'today', label: locale === 'ko' ? '오늘' : 'Today', icon: Calendar },
                      { id: 'week', label: locale === 'ko' ? '이번 주' : 'This Week', icon: TrendingUp },
                      { id: 'month', label: locale === 'ko' ? '이번 달' : 'This Month', icon: Clock }
                    ].map(filter => {
                      const Icon = filter.icon;
                      return (
                        <button
                          key={filter.id}
                          onClick={() => {
                            setSelectedFilter(filter.id as any);
                            if (searchTerm) {
                              searchEvents(searchTerm, { filter: filter.id as any });
                            }
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                            selectedFilter === filter.id
                              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25'
                              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {filter.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Content with better scrolling */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-0 min-h-0">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative">
                      <div className="w-12 h-12 border-4 border-purple-500/20 rounded-full" />
                      <div className="absolute inset-0 w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="mt-4 text-gray-400">
                      {locale === 'ko' ? 'AI가 일정을 검색하고 있습니다...' : 'AI is searching your events...'}
                    </p>
                  </div>
                ) : searchTerm && results.length > 0 ? (
                  <div ref={resultsContainerRef} className="space-y-2">
                    <p className="text-sm text-gray-400 mb-3">
                      {results.length} {locale === 'ko' ? '개의 결과' : 'results found'}
                    </p>
                    {results.map((event, index) => {
                      const EventIcon = getEventTypeIcon(event);
                      const priority = getEventPriority(event);
                      const isSelected = index === selectedEventIndex;
                      
                      return (
                        <motion.div
                          key={event.id || index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => handleEventClick(event)}
                          onMouseEnter={() => setSelectedEventIndex(index)}
                          className={`relative bg-gray-800/30 hover:bg-gray-800/50 rounded-xl p-4 cursor-pointer transition-all group border ${
                            isSelected 
                              ? 'border-purple-500/50 bg-gray-800/50 shadow-lg shadow-purple-500/10' 
                              : 'border-gray-700/30 hover:border-gray-600/50'
                          }`}
                        >
                          {/* Priority indicator */}
                          {priority === 'high' && (
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-500/20 to-transparent rounded-tr-xl pointer-events-none" />
                          )}
                          
                          <div className="flex items-start gap-3">
                            {/* Icon with gradient background */}
                            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${
                              priority === 'high' ? 'from-red-500/20 to-orange-500/20' :
                              priority === 'medium' ? 'from-yellow-500/20 to-amber-500/20' :
                              'from-blue-500/20 to-cyan-500/20'
                            }`}>
                              <EventIcon className={`w-5 h-5 ${
                                priority === 'high' ? 'text-red-400' :
                                priority === 'medium' ? 'text-yellow-400' :
                                'text-blue-400'
                              }`} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-white group-hover:text-purple-400 transition-colors line-clamp-1">
                                {event.summary || (locale === 'ko' ? '제목 없음' : 'Untitled')}
                              </h3>
                              
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                                <div className="flex items-center gap-1.5 text-gray-400">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span className="font-medium">{formatDateTime(event.start?.dateTime || event.start?.date)}</span>
                                </div>
                                
                                {event.location && (
                                  <div className="flex items-center gap-1.5 text-gray-400">
                                    {hasVideoMeeting(event.location) ? (
                                      <Video className="w-3.5 h-3.5 text-green-400" />
                                    ) : (
                                      <MapPin className="w-3.5 h-3.5" />
                                    )}
                                    <span className="truncate max-w-[150px]">{event.location}</span>
                                  </div>
                                )}
                                
                                {event.attendees && event.attendees.length > 0 && (
                                  <div className="flex items-center gap-1.5 text-gray-400">
                                    <Users className="w-3.5 h-3.5" />
                                    <span>{event.attendees.length} {locale === 'ko' ? '명' : ''}</span>
                                  </div>
                                )}
                              </div>
                              
                              {event.description && (
                                <p className="mt-2 text-xs text-gray-500 line-clamp-2">
                                  {event.description}
                                </p>
                              )}
                            </div>
                            
                            <ArrowRight className={`w-5 h-5 flex-shrink-0 transition-all ${
                              isSelected 
                                ? 'text-purple-400 translate-x-1' 
                                : 'text-gray-600 group-hover:text-gray-400'
                            }`} />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : searchTerm && results.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="p-4 bg-gray-800/30 rounded-2xl mb-4">
                      <SearchIcon className="w-12 h-12 text-gray-600" />
                    </div>
                    <p className="text-gray-400 text-lg font-medium">
                      {locale === 'ko' ? '검색 결과가 없습니다' : 'No results found'}
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      {locale === 'ko' ? '다른 검색어를 시도해보세요' : 'Try a different search term'}
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Recent Searches with better design */}
                    {recentSearches && recentSearches.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <History className="w-4 h-4 text-gray-400" />
                          <h3 className="text-sm font-medium text-gray-400">
                            {locale === 'ko' ? '최근 검색' : 'Recent Searches'}
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recentSearches.slice(0, 5).map((term, index) => (
                            <button
                              key={index}
                              onClick={() => handleSearch(term)}
                              className="group flex items-center gap-2 px-3 py-2 bg-gray-800/40 hover:bg-gray-700/50 border border-gray-700/50 hover:border-gray-600 rounded-xl text-sm text-gray-300 hover:text-white transition-all"
                            >
                              <Clock className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-400" />
                              {term}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                    
                    {/* Popular/Suggested Searches with AI touch */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-4 h-4 text-purple-400" />
                        <h3 className="text-sm font-medium text-gray-400">
                          {locale === 'ko' ? 'AI 추천 검색' : 'AI Suggested'}
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { term: locale === 'ko' ? '오늘 회의' : 'Today meetings', icon: Users },
                          { term: locale === 'ko' ? '중요 일정' : 'Important events', icon: Star },
                          { term: locale === 'ko' ? '화상 회의' : 'Video calls', icon: Video },
                          { term: locale === 'ko' ? '반복 일정' : 'Recurring', icon: Repeat }
                        ].map((suggestion, index) => {
                          const Icon = suggestion.icon;
                          return (
                            <button
                              key={index}
                              onClick={() => handleSearch(suggestion.term)}
                              className="group flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-purple-900/20 to-blue-900/20 hover:from-purple-900/30 hover:to-blue-900/30 border border-purple-800/30 hover:border-purple-700/50 rounded-xl text-sm text-purple-300 hover:text-purple-200 transition-all"
                            >
                              <Icon className="w-4 h-4 text-purple-400" />
                              <span className="font-medium">{suggestion.term}</span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                    
                    {/* Empty state illustration */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="mt-8 text-center"
                    >
                      <p className="text-gray-500 text-sm">
                        {locale === 'ko' 
                          ? '일정을 검색하거나 AI 추천을 사용해보세요' 
                          : 'Search for events or try AI suggestions'}
                      </p>
                    </motion.div>
                  </div>
                )}
              </div>
              
              {/* Footer with keyboard shortcuts hint */}
              <div className="px-4 md:px-6 py-3 border-t border-gray-800/50">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">↑↓</kbd>
                      {locale === 'ko' ? '이동' : 'Navigate'}
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Enter</kbd>
                      {locale === 'ko' ? '선택' : 'Select'}
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Esc</kbd>
                      {locale === 'ko' ? '닫기' : 'Close'}
                    </span>
                  </div>
                  <span className="text-purple-400">
                    {locale === 'ko' ? 'AI 검색 엔진' : 'AI Powered'}
                  </span>
                </div>
              </div>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}