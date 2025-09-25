'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  ChevronRight,
  Maximize2,
  X,
  Copy,
  Clock,
  MapPin,
  Users,
  Check,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { useState } from 'react';
import { CalendarEvent } from '@/types';

interface ArtifactLinkProps {
  events: CalendarEvent[];
  title: string;
  subtitle?: string;
  locale: 'ko' | 'en';
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onEventClick?: (event: CalendarEvent) => void;
  isLoading?: boolean;
  showPreview?: boolean;
}

export function ArtifactLink({
  events,
  title,
  subtitle,
  locale,
  isOpen,
  onOpen,
  onClose,
  onEventClick,
  isLoading = false,
  showPreview = true
}: ArtifactLinkProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

  // Debug log - only log when events change
  // console.log('[ArtifactLink] Rendering with', events.length, 'events');

  const handleCopy = () => {
    const eventText = events.map(e =>
      `${e.summary || (locale === 'ko' ? '제목 없음' : 'Untitled')} - ${new Date(e.start?.dateTime || e.start?.date || '').toLocaleDateString()}`
    ).join('\n');

    navigator.clipboard.writeText(eventText);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const formatEventTime = (event: CalendarEvent) => {
    if (event.start?.dateTime) {
      const date = new Date(event.start.dateTime);
      return date.toLocaleTimeString(locale === 'ko' ? 'ko-KR' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (event.start?.date) {
      return locale === 'ko' ? '종일' : 'All day';
    }
    return '';
  };

  const getEventColor = (index: number) => {
    const colors = [
      'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
      'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
      'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
      'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
      'bg-pink-100 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800',
    ];
    return colors[index % colors.length];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-4"
    >
      {/* Claude-style Artifact Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-500">
            {events.length} {locale === 'ko' ? '개 일정' : 'events'}
          </span>
        </div>
        <button
          onClick={onOpen}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          {locale === 'ko' ? '모두 보기' : 'View all'}
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>

      {/* Notion-style Event Cards */}
      <div className="space-y-2">
        {events.slice(0, 3).map((event, index) => (
          <motion.div
            key={event.id || index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onMouseEnter={() => setHoveredEventId(event.id || null)}
            onMouseLeave={() => setHoveredEventId(null)}
            onClick={() => onEventClick && onEventClick(event)}
            className={`
              relative group cursor-pointer
              border rounded-lg p-3 transition-all duration-200
              ${getEventColor(index)}
              ${hoveredEventId === event.id
                ? 'shadow-lg scale-[1.02] ring-2 ring-blue-400/50'
                : 'shadow-sm hover:shadow-md'
              }
            `}
          >
            <div className="flex items-start gap-3">
              {/* Time Badge */}
              <div className="flex-shrink-0">
                <div className="px-2 py-1 bg-white/60 dark:bg-gray-900/60 rounded text-xs font-medium text-gray-700 dark:text-gray-300">
                  {formatEventTime(event)}
                </div>
              </div>

              {/* Event Details */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {event.summary || (locale === 'ko' ? '제목 없음' : 'Untitled')}
                </h4>

                {/* Meta info */}
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[150px]">{event.location}</span>
                    </span>
                  )}
                  {event.attendees && event.attendees.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{event.attendees.length}</span>
                    </span>
                  )}
                  {event.description && (
                    <span className="text-gray-400 truncate max-w-[200px]">
                      {event.description}
                    </span>
                  )}
                </div>
              </div>

              {/* Hover Actions */}
              <AnimatePresence>
                {hoveredEventId === event.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy();
                      }}
                      className="p-1 hover:bg-white/60 dark:hover:bg-gray-800/60 rounded transition-colors"
                      title={locale === 'ko' ? '복사' : 'Copy'}
                    >
                      {showCopied ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Status Indicator */}
            <div className="absolute top-3 right-3">
              <div className={`w-2 h-2 rounded-full ${
                new Date(event.start?.dateTime || event.start?.date || '') > new Date()
                  ? 'bg-blue-500'
                  : 'bg-gray-400'
              }`} />
            </div>
          </motion.div>
        ))}

        {/* Show more indicator */}
        {events.length > 3 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onOpen}
            className="w-full p-2 text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
          >
            {locale === 'ko'
              ? `${events.length - 3}개 더 보기...`
              : `View ${events.length - 3} more...`
            }
          </motion.button>
        )}

        {/* Empty State */}
        {events.length === 0 && !isLoading && (
          <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {locale === 'ko' ? '일정이 없습니다' : 'No events found'}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}