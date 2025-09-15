'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Bell, 
  FileText,
  Edit3,
  Trash2,
  Share2,
  Copy,
  CheckCircle,
  Repeat,
  Video,
  Link as LinkIcon,
  ChevronRight,
  MoreVertical,
  Star,
  StarOff,
  ExternalLink,
  ArrowRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import type { CalendarEvent } from '@/types';
import { useToastContext } from '@/providers/ToastProvider';
import { useRouter } from 'next/navigation';
import { safeHighlightText } from '@/lib/html-sanitizer';

interface SearchEventViewerProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
  locale: string;
  searchTerm?: string;
}

export function SearchEventViewer({
  event,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  locale,
  searchTerm
}: SearchEventViewerProps) {
  const { toast } = useToastContext();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && event) {
      setShowDeleteConfirm(false);
      setIsExpanded(false);
    }
  }, [isOpen, event]);

  if (!event) return null;

  const formatDateTime = (dateTime: string | undefined) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatTime = (dateTime: string | undefined) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleTimeString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const handleShare = async () => {
    const shareData = {
      title: event.summary || 'Event',
      text: `${event.summary}\\n${formatDateTime(event.start?.dateTime || event.start?.date)}`,
      url: window.location.href
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(
          `${event.summary}\\n${formatDateTime(event.start?.dateTime || event.start?.date)}\\n${event.location || ''}`
        );
        toast.success(locale === 'ko' ? '클립보드에 복사되었습니다' : 'Copied to clipboard');
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsDeleting(true);
    try {
      if (onDelete) {
        await onDelete(event);
      }
      toast.success(locale === 'ko' ? '일정이 삭제되었습니다' : 'Event deleted');
      onClose();
    } catch (error) {
      toast.error(locale === 'ko' ? '삭제 실패' : 'Failed to delete');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleOpenInCalendar = () => {
    router.push(`/dashboard?event=${event.id}`);
  };

  const hasVideoMeeting = event.location?.toLowerCase().includes('meet') || 
                         event.location?.toLowerCase().includes('zoom') ||
                         event.location?.toLowerCase().includes('teams');

  const isRecurring = event.recurrence && event.recurrence.length > 0;

  // Safe highlight function that prevents XSS
  const highlightText = (text: string) => {
    if (!searchTerm || !text) return text;
    return safeHighlightText(text, searchTerm);
  };

  return (
    <AnimatePresence>
      {isOpen && event && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
          />
          
          {/* Side Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`fixed right-0 top-0 bottom-0 z-50 bg-white dark:bg-gray-900 shadow-2xl ${
              isExpanded ? 'w-full md:w-2/3' : 'w-full md:w-[500px]'
            } transition-all duration-300`}
          >
            {/* Professional Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-800 z-10">
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={onClose}
                    className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                  
                  <div className="flex items-center gap-2">
                    {/* Event Type Badge */}
                    {isRecurring && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md text-xs font-medium">
                        <Repeat className="w-3 h-3" />
                        {locale === 'ko' ? '반복' : 'Recurring'}
                      </span>
                    )}
                    {hasVideoMeeting && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md text-xs font-medium">
                        <Video className="w-3 h-3" />
                        {locale === 'ko' ? '화상회의' : 'Video'}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors md:block hidden"
                    aria-label={isExpanded ? 'Minimize' : 'Maximize'}
                  >
                    {isExpanded ? (
                      <Minimize2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <Maximize2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {isFavorite ? (
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    ) : (
                      <StarOff className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    )}
                  </button>
                  
                  <button
                    onClick={handleShare}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    aria-label="Share"
                  >
                    <Share2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto" style={{ height: 'calc(100% - 80px)' }}>
              {/* Title Section */}
              <div className="p-6 pb-4">
                <h1 
                  className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
                  dangerouslySetInnerHTML={{ __html: highlightText(event.summary || 'Untitled Event') }}
                />
                
                {/* Quick Info */}
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDateTime(event.start?.dateTime || event.start?.date)}
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate max-w-[200px]">{event.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Professional Detail Cards */}
              <div className="px-6 pb-6 space-y-4">
                {/* Time Details */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        {locale === 'ko' ? '일정 시간' : 'Event Time'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(event.start?.dateTime || event.start?.date)}
                        {event.end?.dateTime && (
                          <span> - {formatTime(event.end.dateTime)}</span>
                        )}
                      </p>
                      {event.start?.timeZone && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {event.start.timeZone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Location */}
                {event.location && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        {hasVideoMeeting ? (
                          <Video className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          {locale === 'ko' ? '위치' : 'Location'}
                        </p>
                        <p 
                          className="text-sm text-gray-600 dark:text-gray-400"
                          dangerouslySetInnerHTML={{ __html: highlightText(event.location) }}
                        />
                        {hasVideoMeeting && (
                          <button className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                            {locale === 'ko' ? '회의 참여' : 'Join meeting'}
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Attendees */}
                {event.attendees && event.attendees.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          {locale === 'ko' ? `참석자 ${event.attendees.length}명` : `${event.attendees.length} Attendees`}
                        </p>
                        <div className="space-y-2">
                          {event.attendees.slice(0, isExpanded ? undefined : 3).map((attendee, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2"
                            >
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                {attendee.email?.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                  {attendee.displayName || attendee.email}
                                </p>
                                {attendee.responseStatus && (
                                  <p className="text-xs text-gray-500 dark:text-gray-500">
                                    {attendee.responseStatus === 'accepted' && '✓ Accepted'}
                                    {attendee.responseStatus === 'declined' && '✗ Declined'}
                                    {attendee.responseStatus === 'tentative' && '? Maybe'}
                                    {attendee.responseStatus === 'needsAction' && '• Pending'}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                          {!isExpanded && event.attendees.length > 3 && (
                            <button 
                              onClick={() => setIsExpanded(true)}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              +{event.attendees.length - 3} {locale === 'ko' ? '더 보기' : 'more'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Description */}
                {event.description && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          {locale === 'ko' ? '설명' : 'Description'}
                        </p>
                        <div 
                          className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: highlightText(event.description) }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Reminder */}
                {event.reminders && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                        <Bell className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          {locale === 'ko' ? '알림' : 'Reminder'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {event.reminders.useDefault 
                            ? (locale === 'ko' ? '기본 알림 사용' : 'Using default reminder')
                            : (locale === 'ko' ? '사용자 설정 알림' : 'Custom reminder')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 p-6">
                <div className="flex gap-3">
                  <button
                    onClick={handleOpenInCalendar}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2 transition-colors font-medium"
                  >
                    <Calendar className="w-4 h-4" />
                    {locale === 'ko' ? '캘린더에서 보기' : 'Open in Calendar'}
                  </button>
                  
                  {onEdit && (
                    <button
                      onClick={() => onEdit(event)}
                      className="px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
                      aria-label="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  
                  {onDelete && (
                    <AnimatePresence mode="wait">
                      {showDeleteConfirm ? (
                        <motion.button
                          key="confirm"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </motion.button>
                      ) : (
                        <motion.button
                          key="delete"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          onClick={handleDelete}
                          className="px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  )}
                </div>
                
                {showDeleteConfirm && (
                  <motion.button
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="w-full mt-2 py-2 text-gray-500 dark:text-gray-400 text-sm hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    {locale === 'ko' ? '취소' : 'Cancel'}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}