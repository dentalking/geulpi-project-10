'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SignatureDayView } from './SignatureDayView';
import { useEvents, useArtifactPanel } from '@/contexts/EventContext';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Grid3x3, List } from 'lucide-react';

interface ArtifactDayViewProps {
  locale?: 'ko' | 'en';
  onDateSelect?: (date: Date) => void;
}

export function ArtifactDayView({ locale = 'ko', onDateSelect }: ArtifactDayViewProps) {
  const { events, selectedEvent, selectEvent } = useEvents();
  const { isOpen, mode } = useArtifactPanel();

  // Local state for ArtifactDayView
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [viewMode, setViewMode] = React.useState<'week' | 'day' | 'list'>('week');
  const [currentWeek, setCurrentWeek] = React.useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Generate week days
  const weekDays = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  }, [currentWeek]);

  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => addDays(prev, direction === 'next' ? 7 : -7));
  };

  // Handle date selection
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  // Count events for each day
  const getEventCount = (date: Date) => {
    return events.filter(event => {
      if (!event.start) return false;
      const eventDate = new Date(event.start.dateTime || event.start.date || '');
      return isSameDay(eventDate, date);
    }).length;
  };

  return (
    <motion.div
      className="artifact-day-view bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: isOpen ? 1 : 0.7, x: isOpen ? 0 : -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="header bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">일정 아티팩트</h3>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('week')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'week' ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
              title="주간 뷰"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'day' ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
              title="일간 뷰"
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'list' ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
              title="리스트 뷰"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Week navigation */}
        {viewMode === 'week' && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs">
              {format(currentWeek, 'M월 d일', { locale: ko })} - {format(addDays(currentWeek, 6), 'M월 d일', { locale: ko })}
            </span>
            <button
              onClick={() => navigateWeek('next')}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="content p-3">
        {viewMode === 'week' && (
          <div className="week-view grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const eventCount = getEventCount(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const today = isToday(day);

              return (
                <motion.button
                  key={day.toISOString()}
                  onClick={() => handleDateClick(day)}
                  className={`day-miniature p-2 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500'
                      : today
                      ? 'bg-green-50 dark:bg-green-900/30 border-green-500'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  } hover:shadow-md`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="text-xs font-medium">
                    {format(day, 'EEE', { locale: locale === 'ko' ? ko : enUS })}
                  </div>
                  <div className="text-lg font-bold">
                    {format(day, 'd')}
                  </div>
                  {eventCount > 0 && (
                    <div className="mt-1">
                      <div className="flex flex-wrap gap-0.5">
                        {Array.from({ length: Math.min(eventCount, 3) }, (_, i) => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                          />
                        ))}
                        {eventCount > 3 && (
                          <span className="text-[10px] text-gray-600 dark:text-gray-400">
                            +{eventCount - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}

        {viewMode === 'day' && selectedDate && (
          <div className="day-view">
            <SignatureDayView
              date={selectedDate}
              locale={locale}
              compact={true}
              showChatPanel={false}
            />
          </div>
        )}

        {viewMode === 'list' && (
          <div className="list-view space-y-2 max-h-96 overflow-y-auto">
            {events
              .filter(event => {
                if (!selectedDate || !event.start) return true;
                const eventDate = new Date(event.start.dateTime || event.start.date || '');
                return isSameDay(eventDate, selectedDate);
              })
              .slice(0, 10)
              .map((event) => {
                const eventDate = event.start ? new Date(event.start.dateTime || event.start.date || '') : new Date();
                const isSelected = selectedEvent?.id === event.id;

                return (
                  <motion.div
                    key={event.id}
                    onClick={() => selectEvent(event)}
                    className={`event-item p-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-100 dark:bg-blue-900/50 border border-blue-500'
                        : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    whileHover={{ x: 4 }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm truncate">
                          {event.summary || 'Untitled'}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {format(eventDate, 'M/d HH:mm')}
                        </div>
                      </div>
                      {event.location && (
                        <span className="text-xs text-gray-500">📍</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}

            {events.length === 0 && (
              <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                일정이 없습니다
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="stats border-t border-gray-200 dark:border-gray-700 p-3">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="font-bold text-lg">{events.length}</div>
            <div className="text-gray-600 dark:text-gray-400">전체</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-blue-600">
              {events.filter(e => {
                if (!e.start) return false;
                const eventDate = new Date(e.start.dateTime || e.start.date || '');
                return isToday(eventDate);
              }).length}
            </div>
            <div className="text-gray-600 dark:text-gray-400">오늘</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-green-600">
              {events.filter(e => {
                if (!e.start) return false;
                const eventDate = new Date(e.start.dateTime || e.start.date || '');
                const now = new Date();
                return eventDate > now && eventDate < addDays(now, 7);
              }).length}
            </div>
            <div className="text-gray-600 dark:text-gray-400">이번 주</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}