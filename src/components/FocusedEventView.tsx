'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  Hash,
  FileText
} from 'lucide-react';
import { CalendarEvent } from '@/types';

interface FocusedEventViewProps {
  event: CalendarEvent;
  pendingChanges?: Partial<CalendarEvent> | null;
  locale: 'ko' | 'en';
  onApplyChanges?: (changes: Partial<CalendarEvent>) => void;
  onCancelChanges?: () => void;
  onEdit?: (eventId: string) => void;
  onDelete?: (eventId: string) => void;
}

function FocusedEventViewComponent({
  event,
  pendingChanges,
  locale,
  onApplyChanges,
  onCancelChanges,
  onEdit,
  onDelete
}: FocusedEventViewProps) {
  // Helper to show original vs new value
  const renderFieldWithChanges = (
    fieldName: keyof CalendarEvent,
    icon: React.ReactNode,
    formatter?: (value: any) => string
  ) => {
    const originalValue = event[fieldName];
    const newValue = pendingChanges?.[fieldName];
    const hasChange = pendingChanges && fieldName in pendingChanges && newValue !== originalValue;

    if (!originalValue && !newValue) return null;

    const displayValue = formatter
      ? formatter(newValue || originalValue)
      : String(newValue || originalValue || '');

    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
          hasChange
            ? 'bg-yellow-50 dark:bg-yellow-900/20 ring-2 ring-yellow-400/50'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }`}
      >
        <div className="mt-0.5 text-gray-500 dark:text-gray-400">
          {icon}
        </div>
        <div className="flex-1">
          {hasChange ? (
            <div className="space-y-1">
              <div className="font-medium text-yellow-900 dark:text-yellow-300">
                {displayValue}
              </div>
              {originalValue && (
                <div className="text-sm text-gray-500 line-through">
                  {formatter ? formatter(originalValue) : String(originalValue || '')}
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-900 dark:text-gray-100">
              {displayValue}
            </div>
          )}
        </div>
        {hasChange && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-2 py-0.5 bg-yellow-200 dark:bg-yellow-800 rounded-full"
          >
            <span className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
              {locale === 'ko' ? '변경됨' : 'Changed'}
            </span>
          </motion.div>
        )}
      </motion.div>
    );
  };

  const formatDate = (dateTime?: string, date?: string) => {
    if (!dateTime && !date) return '';
    const d = new Date(dateTime || date || '');
    if (isNaN(d.getTime())) return '';

    return d.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const formatTime = (dateTime?: string) => {
    if (!dateTime) return null;
    const d = new Date(dateTime);
    if (isNaN(d.getTime())) return null;

    return d.toLocaleTimeString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (start: any) => {
    if (!start) return '';
    const date = formatDate(start.dateTime, start.date);
    const time = formatTime(start.dateTime);
    return time ? `${date} ${time}` : date;
  };

  const hasAnyChanges = pendingChanges && Object.keys(pendingChanges).length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header with Title */}
      <div className="mb-6">
        {hasAnyChanges && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {locale === 'ko'
                ? '변경사항이 있습니다. 아래에서 검토 후 적용해주세요.'
                : 'You have pending changes. Review and apply them below.'}
            </span>
          </motion.div>
        )}

        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {pendingChanges?.summary || event.summary || (locale === 'ko' ? '제목 없음' : 'Untitled')}
          {pendingChanges?.summary && pendingChanges.summary !== event.summary && (
            <span className="block text-sm font-normal text-gray-500 line-through mt-1">
              {event.summary}
            </span>
          )}
        </h2>

        {event.id && (
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <Hash className="w-4 h-4" />
            <span className="font-mono">{event.id.substring(0, 8)}...</span>
          </div>
        )}
      </div>

      {/* Event Details */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {/* Date & Time */}
        {renderFieldWithChanges('start',
          <Calendar className="w-5 h-5" />,
          formatDateTime
        )}

        {/* End Time */}
        {event.end && renderFieldWithChanges('end',
          <Clock className="w-5 h-5" />,
          (end) => `${locale === 'ko' ? '종료' : 'Ends'}: ${formatDateTime(end)}`
        )}

        {/* Location */}
        {renderFieldWithChanges('location',
          <MapPin className="w-5 h-5" />
        )}

        {/* Description */}
        {renderFieldWithChanges('description',
          <FileText className="w-5 h-5" />
        )}

        {/* Attendees */}
        {event.attendees && event.attendees.length > 0 && (
          <div className="p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 mt-0.5 text-gray-500" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {locale === 'ko' ? '참석자' : 'Attendees'} ({event.attendees.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {event.attendees.map((attendee, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      {attendee.displayName || attendee.email}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        {hasAnyChanges ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <button
              onClick={() => onApplyChanges?.(pendingChanges)}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              {locale === 'ko' ? '변경사항 적용' : 'Apply Changes'}
            </button>
            <button
              onClick={onCancelChanges}
              className="flex-1 py-2.5 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" />
              {locale === 'ko' ? '취소' : 'Cancel'}
            </button>
          </motion.div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => event.id && onEdit?.(event.id)}
              className="flex-1 py-2.5 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
            >
              <Edit2 className="w-5 h-5" />
              {locale === 'ko' ? '수정' : 'Edit'}
            </button>
            <button
              onClick={() => event.id && onDelete?.(event.id)}
              className="py-2.5 px-4 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              {locale === 'ko' ? '삭제' : 'Delete'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Memoized component for performance optimization
export const FocusedEventView = React.memo(
  FocusedEventViewComponent,
  (prevProps, nextProps) => {
    // Custom equality check
    return (
      prevProps.event.id === nextProps.event.id &&
      prevProps.event.summary === nextProps.event.summary &&
      prevProps.locale === nextProps.locale &&
      JSON.stringify(prevProps.pendingChanges) === JSON.stringify(nextProps.pendingChanges)
    );
  }
);