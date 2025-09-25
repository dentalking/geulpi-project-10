'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MoreHorizontal,
  Edit3,
  Trash,
  MapPin,
  Users,
  AlarmClock,
  Calendar as CalendarIcon,
  Copy,
  ExternalLink
} from 'lucide-react';
import { CalendarEvent } from '@/types';

interface NotionStyleEventCardProps {
  event: CalendarEvent;
  locale: 'ko' | 'en';
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

function NotionStyleEventCardComponent({
  event,
  locale,
  onEdit,
  onDelete,
  onDuplicate,
  isExpanded = false,
  onToggleExpand
}: NotionStyleEventCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Format date with Notion-style
  const formatDate = (dateTime?: string, date?: string) => {
    if (!dateTime && !date) return '';
    const d = new Date(dateTime || date || '');
    if (isNaN(d.getTime())) return '';

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if today, tomorrow, or yesterday
    const isToday = d.toDateString() === today.toDateString();
    const isTomorrow = d.toDateString() === tomorrow.toDateString();
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) {
      return locale === 'ko' ? '오늘' : 'Today';
    } else if (isTomorrow) {
      return locale === 'ko' ? '내일' : 'Tomorrow';
    } else if (isYesterday) {
      return locale === 'ko' ? '어제' : 'Yesterday';
    }

    // Format as "Jan 15" or "1월 15일"
    return d.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateTime?: string, date?: string) => {
    if (!dateTime) return null;
    const d = new Date(dateTime);
    if (isNaN(d.getTime())) return null;

    return d.toLocaleTimeString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatTimeRange = () => {
    const startTime = formatTime(event.start?.dateTime, event.start?.date);
    const endTime = formatTime(event.end?.dateTime, event.end?.date);

    if (!startTime && !endTime) {
      return locale === 'ko' ? '종일' : 'All day';
    }

    if (startTime && endTime) {
      return `${startTime} → ${endTime}`;
    }

    return startTime || '';
  };

  // Get subtle event color based on colorId
  const getEventAccent = () => {
    const colors = [
      'bg-blue-50 border-blue-200 hover:bg-blue-100',
      'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
      'bg-amber-50 border-amber-200 hover:bg-amber-100',
      'bg-rose-50 border-rose-200 hover:bg-rose-100',
      'bg-violet-50 border-violet-200 hover:bg-violet-100',
      'bg-pink-50 border-pink-200 hover:bg-pink-100',
      'bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
      'bg-gray-50 border-gray-200 hover:bg-gray-100',
      'bg-orange-50 border-orange-200 hover:bg-orange-100',
      'bg-teal-50 border-teal-200 hover:bg-teal-100',
      'bg-cyan-50 border-cyan-200 hover:bg-cyan-100'
    ];

    const darkColors = [
      'dark:bg-blue-950/30 dark:border-blue-800 dark:hover:bg-blue-950/50',
      'dark:bg-emerald-950/30 dark:border-emerald-800 dark:hover:bg-emerald-950/50',
      'dark:bg-amber-950/30 dark:border-amber-800 dark:hover:bg-amber-950/50',
      'dark:bg-rose-950/30 dark:border-rose-800 dark:hover:bg-rose-950/50',
      'dark:bg-violet-950/30 dark:border-violet-800 dark:hover:bg-violet-950/50',
      'dark:bg-pink-950/30 dark:border-pink-800 dark:hover:bg-pink-950/50',
      'dark:bg-indigo-950/30 dark:border-indigo-800 dark:hover:bg-indigo-950/50',
      'dark:bg-gray-800/30 dark:border-gray-700 dark:hover:bg-gray-800/50',
      'dark:bg-orange-950/30 dark:border-orange-800 dark:hover:bg-orange-950/50',
      'dark:bg-teal-950/30 dark:border-teal-800 dark:hover:bg-teal-950/50',
      'dark:bg-cyan-950/30 dark:border-cyan-800 dark:hover:bg-cyan-950/50'
    ];

    const index = event.colorId ? parseInt(event.colorId) - 1 : 7;
    return `${colors[index] || colors[7]} ${darkColors[index] || darkColors[7]}`;
  };

  // Get status indicator color
  const getStatusIndicator = () => {
    const now = new Date();
    const startDate = new Date(event.start?.dateTime || event.start?.date || '');
    const endDate = new Date(event.end?.dateTime || event.end?.date || '');

    if (now >= startDate && now <= endDate) {
      return 'bg-green-500'; // Ongoing
    } else if (now > endDate) {
      return 'bg-gray-400'; // Past
    } else {
      return 'bg-blue-500'; // Future
    }
  };

  return (
    <motion.div
      className={`
        group relative border rounded-xl transition-all duration-200
        ${getEventAccent()}
        ${isHovered ? 'shadow-md' : 'shadow-sm'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowActions(false);
      }}
      onClick={onToggleExpand}
    >
      {/* Main Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Status Indicator */}
          <div className="mt-1.5">
            <div className={`w-2 h-2 rounded-full ${getStatusIndicator()}`} />
          </div>

          {/* Event Details */}
          <div className="flex-1 min-w-0">
            {/* Title and Actions Row */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 leading-tight">
                {event.summary || (locale === 'ko' ? '제목 없음' : 'Untitled')}
              </h3>

              {/* Action Menu - Only visible on hover */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    className="relative"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowActions(!showActions);
                      }}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4 text-gray-500" />
                    </button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                      {showActions && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit?.();
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            {locale === 'ko' ? '편집' : 'Edit'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicate?.();
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {locale === 'ko' ? '복제' : 'Duplicate'}
                          </button>
                          <hr className="my-1 border-gray-200 dark:border-gray-700" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete?.();
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center gap-2"
                          >
                            <Trash className="w-3.5 h-3.5" />
                            {locale === 'ko' ? '삭제' : 'Delete'}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Date, Time and Meta Info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
              {/* Date */}
              <span className="font-medium">
                {formatDate(event.start?.dateTime, event.start?.date)}
              </span>

              {/* Time */}
              <span className="text-gray-500">
                {formatTimeRange()}
              </span>

              {/* Location */}
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[200px]">{event.location}</span>
                </span>
              )}

              {/* Attendees */}
              {event.attendees && event.attendees.length > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>{event.attendees.length}</span>
                </span>
              )}
            </div>

            {/* Description Preview - Only show first line */}
            {event.description && !isExpanded && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                {event.description}
              </p>
            )}
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Full Description */}
              {event.description && (
                <div className="mb-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>
              )}

              {/* Attendees List */}
              {event.attendees && event.attendees.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    {locale === 'ko' ? '참석자' : 'Attendees'}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {event.attendees.map((attendee, i) => (
                      <div
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-md"
                      >
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-medium">
                          {attendee.email?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-gray-700 dark:text-gray-300">
                          {attendee.displayName || attendee.email}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Meeting Link */}
              {(event as any).hangoutLink && (
                <a
                  href={(event as any).hangoutLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {locale === 'ko' ? '미팅 참여' : 'Join Meeting'}
                </a>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Memoized component with custom comparison
export const NotionStyleEventCard = React.memo(
  NotionStyleEventCardComponent,
  (prevProps, nextProps) => {
    // Custom equality check for performance
    return (
      prevProps.event.id === nextProps.event.id &&
      prevProps.event.summary === nextProps.event.summary &&
      prevProps.event.start?.dateTime === nextProps.event.start?.dateTime &&
      prevProps.event.location === nextProps.event.location &&
      prevProps.locale === nextProps.locale &&
      prevProps.isExpanded === nextProps.isExpanded
    );
  }
);