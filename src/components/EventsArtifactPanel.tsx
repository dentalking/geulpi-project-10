'use client';

import { useState, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { CalendarEvent } from '@/types';
import Image from 'next/image';

interface EventsArtifactPanelProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  title?: string;
  locale: 'ko' | 'en';
  onEventEdit?: (eventId: string) => void;
  onEventDelete?: (eventId: string) => void;
  onRefresh?: () => void;
}

export function EventsArtifactPanel({
  isOpen,
  onClose,
  events,
  title,
  locale,
  onEventEdit,
  onEventDelete,
  onRefresh
}: EventsArtifactPanelProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [isMaximized, setIsMaximized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const formatTime = (dateTime?: string, date?: string) => {
    if (!dateTime && !date) return null;
    const d = new Date(dateTime || date || '');
    if (isNaN(d.getTime())) return null;

    if (dateTime) {
      return d.toLocaleTimeString(locale === 'ko' ? 'ko-KR' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return locale === 'ko' ? '종일' : 'All day';
  };

  const formatDate = (dateTime?: string, date?: string) => {
    if (!dateTime && !date) return '';
    const d = new Date(dateTime || date || '');
    if (isNaN(d.getTime())) return '';

    return d.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const getEventColor = (event: CalendarEvent) => {
    // Use event color if available, otherwise use default based on event type
    if (event.colorId) {
      const colors = [
        'bg-blue-100 border-blue-300 text-blue-900',
        'bg-green-100 border-green-300 text-green-900',
        'bg-red-100 border-red-300 text-red-900',
        'bg-yellow-100 border-yellow-300 text-yellow-900',
        'bg-purple-100 border-purple-300 text-purple-900',
        'bg-pink-100 border-pink-300 text-pink-900',
        'bg-indigo-100 border-indigo-300 text-indigo-900',
        'bg-gray-100 border-gray-300 text-gray-900',
        'bg-orange-100 border-orange-300 text-orange-900',
        'bg-teal-100 border-teal-300 text-teal-900',
        'bg-cyan-100 border-cyan-300 text-cyan-900'
      ];
      return colors[parseInt(event.colorId) - 1] || colors[0];
    }
    return 'bg-white border-gray-200';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300
            }}
            className={`fixed top-0 right-0 h-full bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col ${
              isMaximized ? 'w-full lg:w-3/4' : 'w-full lg:w-1/3 xl:w-1/4'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 relative">
                  <Image
                    src="/images/logo.svg"
                    alt="Geulpi"
                    fill
                    className="object-contain dark:invert"
                  />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    {title || (locale === 'ko' ? '일정 목록' : 'Events List')}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {events.length}{locale === 'ko' ? '개 일정' : ' events'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title={locale === 'ko' ? '새로고침' : 'Refresh'}
                >
                  <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {isMaximized ? (
                    <Minimize2 className="w-5 h-5" />
                  ) : (
                    <Maximize2 className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Events List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {events.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">
                    {locale === 'ko' ? '일정이 없습니다' : 'No events found'}
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {events.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      className={`border-2 rounded-lg overflow-hidden transition-all ${
                        getEventColor(event)
                      } ${event.id && expandedEvents.has(event.id) ? 'shadow-md' : ''}`}
                    >
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => event.id && toggleEventExpansion(event.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-base mb-2">
                              {event.summary || (locale === 'ko' ? '제목 없음' : 'No title')}
                            </h3>

                            <div className="space-y-1">
                              {/* Date and Time */}
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="w-4 h-4 opacity-60" />
                                <span>{formatDate(event.start?.dateTime, event.start?.date)}</span>
                                {formatTime(event.start?.dateTime, event.start?.date) && (
                                  <>
                                    <Clock className="w-4 h-4 opacity-60 ml-2" />
                                    <span>{formatTime(event.start?.dateTime, event.start?.date)}</span>
                                  </>
                                )}
                              </div>

                              {/* Location */}
                              {event.location && (
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="w-4 h-4 opacity-60" />
                                  <span className="truncate">{event.location}</span>
                                </div>
                              )}

                              {/* Attendees */}
                              {event.attendees && event.attendees.length > 0 && (
                                <div className="flex items-center gap-2 text-sm">
                                  <User className="w-4 h-4 opacity-60" />
                                  <span>
                                    {event.attendees.length}
                                    {locale === 'ko' ? '명 참석' : ' attendees'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center ml-3">
                            <button
                              className="transition-transform duration-200"
                              style={{
                                transform: event.id && expandedEvents.has(event.id) ? 'rotate(90deg)' : 'rotate(0deg)'
                              }}
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      <AnimatePresence>
                        {event.id && expandedEvents.has(event.id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-current/20"
                          >
                            <div className="p-4 space-y-3">
                              {/* Description */}
                              {event.description && (
                                <div>
                                  <h4 className="text-sm font-medium mb-1">
                                    {locale === 'ko' ? '설명' : 'Description'}
                                  </h4>
                                  <p className="text-sm opacity-80 whitespace-pre-wrap">
                                    {event.description}
                                  </p>
                                </div>
                              )}

                              {/* End Time */}
                              {event.end && (
                                <div className="text-sm">
                                  <span className="font-medium">
                                    {locale === 'ko' ? '종료: ' : 'Ends: '}
                                  </span>
                                  {formatDate(event.end.dateTime, event.end.date)}
                                  {formatTime(event.end.dateTime, event.end.date) && (
                                    <span className="ml-1">
                                      {formatTime(event.end.dateTime, event.end.date)}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Attendees List */}
                              {event.attendees && event.attendees.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium mb-1">
                                    {locale === 'ko' ? '참석자' : 'Attendees'}
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {event.attendees.map((attendee, i) => (
                                      <span
                                        key={i}
                                        className="text-xs px-2 py-1 bg-white/50 dark:bg-black/20 rounded"
                                      >
                                        {attendee.email}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex gap-2 pt-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    event.id && onEventEdit?.(event.id);
                                  }}
                                  className="flex items-center gap-2 px-3 py-1 text-sm bg-white/50 dark:bg-black/20 hover:bg-white/70 dark:hover:bg-black/30 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  {locale === 'ko' ? '수정' : 'Edit'}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    event.id && onEventDelete?.(event.id);
                                  }}
                                  className="flex items-center gap-2 px-3 py-1 text-sm bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  {locale === 'ko' ? '삭제' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 text-center">
                {locale === 'ko'
                  ? '채팅으로 일정을 수정하거나 추가할 수 있습니다'
                  : 'You can edit or add events through chat'}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}