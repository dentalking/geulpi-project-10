'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search as SearchIcon, 
  Calendar,
  Clock,
  MapPin,
  Filter,
  X,
  ArrowLeft,
  TrendingUp,
  History,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Users,
  Video,
  Repeat,
  Star,
  MoreHorizontal,
  Edit3,
  Trash2,
  Share2
} from 'lucide-react';
import Link from 'next/link';
import { useToastContext } from '@/providers/ToastProvider';
import { MobileHeader, MobileBottomNav } from '@/components/MobileNavigation';
import { useSearch, useSearchFilters, highlightSearchTerm } from '@/hooks/useSearch';
import { SearchEventViewer } from '@/components/SearchEventViewer';
import type { CalendarEvent } from '@/types';

interface SearchResultItemProps {
  result: any;
  searchTerm: string;
  onClick: () => void;
  onQuickAction?: (action: 'edit' | 'delete' | 'share', event: any) => void;
}

function SearchResultItem({ result, searchTerm, onClick, onQuickAction }: SearchResultItemProps) {
  const [showActions, setShowActions] = useState(false);
  const locale = useLocale();

  const formatTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatDate = (dateTime: string) => {
    const date = new Date(dateTime);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return locale === 'ko' ? '오늘' : 'Today';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return locale === 'ko' ? '내일' : 'Tomorrow';
    }
    return date.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const hasVideoMeeting = result.location?.toLowerCase().includes('meet') || 
                         result.location?.toLowerCase().includes('zoom') ||
                         result.location?.toLowerCase().includes('teams');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="group relative overflow-hidden"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className="p-5 backdrop-blur-xl rounded-xl border transition-all hover:shadow-lg cursor-pointer bg-white dark:bg-gray-900"
        style={{ 
          borderColor: 'var(--glass-border)' 
        }}
        onClick={onClick}
      >
        <div className="flex items-start gap-4">
          {/* Date Box */}
          <div className="flex-shrink-0 text-center p-3 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {new Date(result.date).getDate()}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 uppercase">
              {new Date(result.date).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', { month: 'short' })}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Title and Badges */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 
                  className="font-semibold text-lg text-gray-900 dark:text-white mb-1"
                  dangerouslySetInnerHTML={{ 
                    __html: highlightSearchTerm(result.title, searchTerm) 
                  }}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  {hasVideoMeeting && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium">
                      <Video className="w-3 h-3" />
                      {locale === 'ko' ? '화상' : 'Video'}
                    </span>
                  )}
                  {result.attendees?.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                      <Users className="w-3 h-3" />
                      {result.attendees.length}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {result.description && (
              <p 
                className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2"
                dangerouslySetInnerHTML={{ 
                  __html: highlightSearchTerm(result.description, searchTerm) 
                }}
              />
            )}

            {/* Meta Info */}
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {formatDate(result.date)} • {formatTime(result.date)}
              </span>
              {result.location && (
                <span className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{result.location}</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions (shown on hover) */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute right-4 top-4 flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => onQuickAction?.('edit', result)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  aria-label="Edit"
                >
                  <Edit3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={() => onQuickAction?.('share', result)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  aria-label="Share"
                >
                  <Share2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={() => onQuickAction?.('delete', result)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default function ImprovedSearchPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const { toast } = useToastContext();
  
  // Use custom search hook
  const {
    query,
    results,
    isLoading,
    error,
    hasMore,
    suggestions,
    recentSearches,
    setQuery,
    clearSearch,
    loadMore,
    retry,
    clearHistory,
    isEmpty,
    hasResults,
    isSearching
  } = useSearch({
    debounceDelay: 300,
    minQueryLength: 2,
    maxResults: 20,
    enableHistory: true,
    enableAutoComplete: true
  });

  // Use search filters hook
  const {
    filters,
    updateFilter,
    resetFilters,
    hasActiveFilters
  } = useSearchFilters();

  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [showEventViewer, setShowEventViewer] = useState(false);

  // Handle search result click - now opens the event viewer
  const handleResultClick = (result: any) => {
    // Convert search result to CalendarEvent format
    const event: CalendarEvent = {
      id: result.id,
      summary: result.title,
      description: result.description,
      location: result.location,
      start: {
        dateTime: result.date,
        timeZone: 'Asia/Seoul'
      },
      end: result.endDate ? {
        dateTime: result.endDate,
        timeZone: 'Asia/Seoul'
      } : undefined,
      attendees: result.attendees,
      reminders: result.reminders,
      status: result.status,
      recurrence: result.recurrence
    };
    
    setSelectedEvent(event);
    setShowEventViewer(true);
  };

  // Handle quick actions
  const handleQuickAction = async (action: 'edit' | 'delete' | 'share', event: any) => {
    if (action === 'share') {
      try {
        const shareData = {
          title: event.title,
          text: `${event.title} - ${new Date(event.date).toLocaleString()}`,
          url: window.location.href
        };
        
        if (navigator.share && navigator.canShare(shareData)) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(`${event.title}\\n${new Date(event.date).toLocaleString()}`);
          toast.success(locale === 'ko' ? '클립보드에 복사되었습니다' : 'Copied to clipboard');
        }
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else if (action === 'delete') {
      // TODO: Implement delete
      toast.info(locale === 'ko' ? '삭제 기능 준비 중입니다' : 'Delete feature coming soon');
    } else if (action === 'edit') {
      // TODO: Implement edit
      toast.info(locale === 'ko' ? '편집 기능 준비 중입니다' : 'Edit feature coming soon');
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
  };

  // Handle recent search click
  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-3xl animate-pulse" 
             style={{ background: 'var(--effect-purple)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-3xl animate-pulse delay-1000" 
             style={{ background: 'var(--effect-pink)' }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b"
              style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg transition-all md:hidden"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label={t('common.back')}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              {t('search.title')}
            </h1>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="ml-auto text-sm px-3 py-1 rounded-lg border transition-all"
                style={{ 
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-secondary)'
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 relative"
        >
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5" 
                       style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={t('search.placeholder')}
              className="w-full pl-12 pr-4 py-3 rounded-xl backdrop-blur-xl border transition-all"
              style={{ 
                background: 'var(--surface-primary)', 
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)'
              }}
              data-search-input
              aria-label="Search input"
              aria-describedby={isSearching ? "search-loading" : undefined}
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1"
                aria-label={t('common.clear')}
              >
                <X className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              </button>
            )}
            
            {/* Loading indicator */}
            {isSearching && (
              <div 
                id="search-loading"
                className="absolute right-12 top-1/2 transform -translate-y-1/2"
              >
                <RefreshCw className="w-4 h-4 animate-spin" style={{ color: 'var(--accent-primary)' }} />
              </div>
            )}
          </div>

          {/* Autocomplete Suggestions */}
          <AnimatePresence>
            {showSuggestions && (suggestions.length > 0 || recentSearches.length > 0) && !isSearching && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 rounded-xl backdrop-blur-xl border overflow-hidden z-10"
                style={{ 
                  background: 'var(--surface-primary)', 
                  borderColor: 'var(--glass-border)' 
                }}
              >
                {suggestions.length > 0 && (
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                      <TrendingUp className="w-3 h-3 inline mr-1" />
                      Suggestions
                    </div>
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
                
                {recentSearches.length > 0 && (
                  <div className="p-2 border-t" style={{ borderColor: 'var(--border-default)' }}>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                        <History className="w-3 h-3 inline mr-1" />
                        Recent
                      </span>
                      <button
                        onClick={clearHistory}
                        className="text-xs hover:underline"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        Clear
                      </button>
                    </div>
                    {recentSearches.slice(0, 5).map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleRecentSearchClick(search)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <History className="w-3 h-3 inline mr-2 opacity-50" />
                        {search}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg border whitespace-nowrap transition-all"
              style={{ 
                background: filters.dateRange !== 'all' ? 'var(--accent-primary)' : 'var(--surface-secondary)',
                borderColor: 'var(--border-default)',
                color: filters.dateRange !== 'all' ? 'white' : 'var(--text-primary)'
              }}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Calendar className="w-4 h-4" />
              <span className="text-sm">{t('search.filters.dateRange')}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg border whitespace-nowrap transition-all"
              style={{ 
                background: filters.location ? 'var(--accent-primary)' : 'var(--surface-secondary)',
                borderColor: 'var(--border-default)',
                color: filters.location ? 'white' : 'var(--text-primary)'
              }}
              onClick={() => updateFilter('location', !filters.location)}
            >
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{t('search.filters.withLocation')}</span>
            </button>
            
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg border whitespace-nowrap transition-all"
              style={{ 
                background: 'var(--surface-secondary)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)'
              }}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">{t('search.filters.more')}</span>
            </button>
          </div>

          {/* Extended Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 mt-2 rounded-xl border"
                     style={{ 
                       background: 'var(--surface-secondary)', 
                       borderColor: 'var(--border-default)' 
                     }}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                        Date Range
                      </label>
                      <select
                        value={filters.dateRange}
                        onChange={(e) => updateFilter('dateRange', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border"
                        style={{ 
                          background: 'var(--surface-primary)', 
                          borderColor: 'var(--border-default)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        <option value="all">All time</option>
                        <option value="today">Today</option>
                        <option value="week">This week</option>
                        <option value="month">This month</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                        Sort By
                      </label>
                      <select
                        value={filters.sortBy}
                        onChange={(e) => updateFilter('sortBy', e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg border"
                        style={{ 
                          background: 'var(--surface-primary)', 
                          borderColor: 'var(--border-default)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        <option value="relevance">Relevance</option>
                        <option value="date">Date</option>
                        <option value="title">Title</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl border flex items-center gap-3"
            style={{ 
              background: 'var(--surface-error)', 
              borderColor: 'var(--border-error)' 
            }}
          >
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700">Search failed</p>
              <p className="text-xs text-red-600 mt-1">{error.message}</p>
            </div>
            <button
              onClick={retry}
              className="px-3 py-1 text-sm rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Search Results */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {hasResults && results.map((result) => (
              <SearchResultItem
                key={result.id}
                result={result}
                searchTerm={query}
                onClick={() => handleResultClick(result)}
                onQuickAction={handleQuickAction}
              />
            ))}
          </AnimatePresence>

          {/* Load More */}
          {hasMore && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-4"
            >
              <button
                onClick={loadMore}
                className="px-6 py-2 rounded-lg border transition-all hover:scale-105"
                style={{ 
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)'
                }}
              >
                Load more results
              </button>
            </motion.div>
          )}

          {/* Empty State */}
          {!isSearching && isEmpty && query && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p style={{ color: 'var(--text-secondary)' }}>{t('search.noResults')}</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-tertiary)' }}>
                Try different keywords or adjust your filters
              </p>
            </motion.div>
          )}

          {/* Initial State */}
          {!query && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p style={{ color: 'var(--text-secondary)' }}>{t('search.startSearching')}</p>
              {recentSearches.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    Or try one of your recent searches:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {recentSearches.slice(0, 3).map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleRecentSearchClick(search)}
                        className="px-3 py-1 rounded-full text-sm border transition-all hover:scale-105"
                        style={{ 
                          borderColor: 'var(--border-default)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>

      <style jsx>{`
        mark {
          background-color: var(--color-yellow-200);
          color: var(--text-primary);
          padding: 0 2px;
          border-radius: 2px;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      {/* Event Viewer */}
      <SearchEventViewer
        event={selectedEvent}
        isOpen={showEventViewer}
        onClose={() => {
          setShowEventViewer(false);
          setSelectedEvent(null);
        }}
        onEdit={(event) => {
          setShowEventViewer(false);
          toast.info(locale === 'ko' ? '편집 기능 준비 중입니다' : 'Edit feature coming soon');
        }}
        onDelete={async (event) => {
          try {
            const response = await fetch(`/api/calendar/events/${event.id}`, {
              method: 'DELETE',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              }
            });

            if (!response.ok) {
              throw new Error('Failed to delete event');
            }

            toast.success(locale === 'ko' ? '일정이 삭제되었습니다' : 'Event deleted successfully');
            setShowEventViewer(false);
            
            // Refresh search results
            retry();
          } catch (error) {
            console.error('Delete event error:', error);
            toast.error(locale === 'ko' ? '삭제 실패' : 'Failed to delete event');
          }
        }}
        locale={locale}
        searchTerm={query}
      />
    </div>
  );
}