'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion';
import { useModalKeyboard } from '@/hooks/useModalKeyboard';
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
  ChevronLeft,
  MoreVertical,
  Star,
  StarOff,
  Brain,
  CheckSquare,
  Lightbulb,
  MessageSquare,
  Navigation,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  UserPlus
} from 'lucide-react';
import type { CalendarEvent } from '@/types';
import { useToastContext } from '@/providers/ToastProvider';
import { EventSharingModal } from './EventSharingModal';

interface UnifiedEventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  locale: string;
  onChatAboutEvent?: (event: CalendarEvent) => void;
  onShareEvent?: (event: CalendarEvent) => void;
}

interface QuickAction {
  id: string;
  icon: React.ElementType;
  label: string;
  color: string;
  action: () => void;
}

export function UnifiedEventDetailModal({
  isOpen,
  onClose,
  event,
  onEdit,
  onDelete,
  locale,
  onChatAboutEvent,
  onShareEvent
}: UnifiedEventDetailModalProps) {
  const { toast } = useToastContext();
  const modalRef = useModalKeyboard({ isOpen, onClose });
  const contentRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  // State
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  // Swipe gesture handling for mobile
  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    const threshold = 100;
    const velocity = 500;

    if (info.offset.y > threshold || info.velocity.y > velocity) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen && event) {
      setExpandedSection(null);
      loadAISuggestions();
      // Animate modal entrance
      controls.start({
        y: 0,
        opacity: 1,
        transition: { type: 'spring', damping: 25, stiffness: 300 }
      });
    }
  }, [isOpen, event, controls]);

  const loadAISuggestions = async () => {
    if (!event) return;

    setLoadingAI(true);
    try {
      // Simulate AI loading
      await new Promise(resolve => setTimeout(resolve, 800));

      const suggestions = [];
      const title = event.summary?.toLowerCase() || '';

      if (title.includes('meeting') || title.includes('회의')) {
        suggestions.push(locale === 'ko' ? '의제 준비하기' : 'Prepare agenda');
        suggestions.push(locale === 'ko' ? '이전 회의록 확인' : 'Review last meeting notes');
      }

      if (event.location && !event.location.includes('online')) {
        suggestions.push(locale === 'ko' ? '교통 경로 확인' : 'Check route to venue');
        suggestions.push(locale === 'ko' ? '15분 일찍 출발' : 'Leave 15 min early');
      }

      if (event.attendees && event.attendees.length > 0) {
        suggestions.push(locale === 'ko' ? '참석자에게 리마인더 보내기' : 'Send reminder to attendees');
      }

      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to load AI suggestions:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  const formatDateTime = (dateTime: string | undefined, showTime = true) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);

    if (showTime) {
      return date.toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US', {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit'
      });
    }

    return date.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      year: 'numeric'
    });
  };

  const getDuration = () => {
    if (!event?.start?.dateTime || !event?.end?.dateTime) return null;

    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

    if (minutes < 60) {
      return `${minutes}${locale === 'ko' ? '분' : ' min'}`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (mins === 0) {
      return `${hours}${locale === 'ko' ? '시간' : ' hr'}`;
    }

    return `${hours}${locale === 'ko' ? '시간' : 'h'} ${mins}${locale === 'ko' ? '분' : 'm'}`;
  };

  const handleShare = async () => {
    if (!event) return;

    const shareData = {
      title: event.summary || 'Event',
      text: `${event.summary}\n${formatDateTime(event.start?.dateTime || event.start?.date)}${event.location ? `\n📍 ${event.location}` : ''}`,
      url: window.location.href
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast.success(locale === 'ko' ? '공유되었습니다' : 'Shared successfully');
      } else {
        await navigator.clipboard.writeText(shareData.text);
        toast.success(locale === 'ko' ? '클립보드에 복사되었습니다' : 'Copied to clipboard');
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleDelete = async () => {
    if (!event || isDeleting) return;

    // Use confirmation dialog instead of two-step delete
    const confirmed = window.confirm(
      locale === 'ko'
        ? '이 일정을 삭제하시겠습니까?'
        : 'Are you sure you want to delete this event?'
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await onDelete(event);
      toast.success(locale === 'ko' ? '일정이 삭제되었습니다' : 'Event deleted');
      onClose();
    } catch (error) {
      toast.error(locale === 'ko' ? '삭제 실패' : 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'edit',
      icon: Edit3,
      label: locale === 'ko' ? '편집' : 'Edit',
      color: 'text-blue-500',
      action: () => event && onEdit(event)
    },
    {
      id: 'share',
      icon: Share2,
      label: locale === 'ko' ? '공유' : 'Share',
      color: 'text-green-500',
      action: handleShare
    },
    {
      id: 'chat',
      icon: MessageSquare,
      label: locale === 'ko' ? 'AI 대화' : 'AI Chat',
      color: 'text-purple-500',
      action: () => event && onChatAboutEvent?.(event)
    },
    {
      id: 'delete',
      icon: Trash2,
      label: locale === 'ko' ? '삭제' : 'Delete',
      color: 'text-red-500',
      action: handleDelete
    }
  ];

  const hasVideoMeeting = event?.location?.toLowerCase().includes('meet') ||
                         event?.location?.toLowerCase().includes('zoom') ||
                         event?.location?.toLowerCase().includes('teams');

  const isRecurring = event?.recurrence && event.recurrence.length > 0;

  if (!event) return null;

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            aria-hidden="true"
          />

          {/* Modal Container - Safe Centered */}
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
              <motion.div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="event-title"
                tabIndex={-1}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl shadow-2xl overflow-hidden"
                style={{ maxHeight: 'min(85vh, 700px)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col h-full max-h-[85vh]">

            {/* Header */}
            <div className="sticky top-0 z-10 bg-gradient-to-b from-gray-900 to-transparent px-4 md:px-5 pb-4 pt-4">
              <div className="flex items-start justify-between mb-3">
                <button
                  onClick={onClose}
                  className="p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors touch-manipulation"
                  aria-label={locale === 'ko' ? '닫기' : 'Close'}
                >
                  <ChevronLeft className="w-6 h-6 text-white/70" />
                </button>

                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className="p-2 rounded-xl hover:bg-white/10 transition-colors touch-manipulation"
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {isFavorite ? (
                    <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                  ) : (
                    <StarOff className="w-6 h-6 text-white/70" />
                  )}
                </button>
              </div>

              {/* Title & Badges */}
              <div className="space-y-2">
                <h2 id="event-title" className="text-2xl font-bold text-white pr-2">
                  {event.summary || (locale === 'ko' ? '제목 없음' : 'Untitled')}
                </h2>

                <div className="flex items-center gap-2 flex-wrap">
                  {isRecurring && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs">
                      <Repeat className="w-3 h-3" />
                      {locale === 'ko' ? '반복' : 'Recurring'}
                    </span>
                  )}
                  {hasVideoMeeting && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs">
                      <Video className="w-3 h-3" />
                      {locale === 'ko' ? '화상회의' : 'Video'}
                    </span>
                  )}
                  {getDuration() && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-xs">
                      <Clock className="w-3 h-3" />
                      {getDuration()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div
              ref={contentRef}
              className="px-4 md:px-5 pb-5 overflow-y-auto flex-1"
            >
              {/* Primary Info Card */}
              <div className="bg-gray-800/50 rounded-2xl p-4 mb-4">
                <div className="space-y-3">
                  {/* Date & Time */}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">
                        {formatDateTime(event.start?.dateTime || event.start?.date, false)}
                      </p>
                      {event.start?.dateTime && (
                        <p className="text-gray-400 text-sm">
                          {formatDateTime(event.start.dateTime).split(',').pop()?.trim()}
                          {event.end?.dateTime && (
                            <span> - {formatDateTime(event.end.dateTime).split(',').pop()?.trim()}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  {event.location && (
                    <div className="flex items-center gap-3">
                      {hasVideoMeeting ? (
                        <Video className="w-5 h-5 text-green-400 flex-shrink-0" />
                      ) : (
                        <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-white">{event.location}</p>
                        {hasVideoMeeting && (
                          <button
                            className="text-green-400 text-sm hover:underline mt-1 flex items-center gap-1"
                            onClick={() => window.open(event.location, '_blank')}
                          >
                            {locale === 'ko' ? '회의 참여' : 'Join meeting'}
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Suggestions */}
              {aiSuggestions.length > 0 && (
                <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-2xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-5 h-5 text-purple-400" />
                    <h3 className="text-white font-medium">
                      {locale === 'ko' ? 'AI 제안' : 'AI Suggestions'}
                    </h3>
                    {loadingAI && (
                      <Loader2 className="w-4 h-4 text-purple-400 animate-spin ml-auto" />
                    )}
                  </div>
                  <div className="space-y-2">
                    {aiSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className="w-full text-left px-3 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                        onClick={() => toast.info(suggestion)}
                      >
                        <div className="flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-yellow-400" />
                          <span className="text-gray-300 text-sm">{suggestion}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Attendees */}
              {event.attendees && event.attendees.length > 0 && (
                <div className="bg-gray-800/50 rounded-2xl p-4 mb-4">
                  <button
                    onClick={() => setExpandedSection(expandedSection === 'attendees' ? null : 'attendees')}
                    className="w-full flex items-center justify-between mb-3"
                    aria-expanded={expandedSection === 'attendees'}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-green-400" />
                      <h3 className="text-white font-medium">
                        {locale === 'ko'
                          ? `참석자 ${event.attendees.length}명`
                          : `${event.attendees.length} Attendees`}
                      </h3>
                    </div>
                    {expandedSection === 'attendees' ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedSection === 'attendees' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-2 overflow-hidden"
                      >
                        {event.attendees.map((attendee, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-2 bg-gray-700/30 rounded-lg"
                          >
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-xs font-bold text-white">
                              {attendee.email?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="text-white text-sm">
                                {attendee.displayName || attendee.email?.split('@')[0]}
                              </p>
                              <p className="text-gray-400 text-xs">{attendee.email}</p>
                            </div>
                            {attendee.responseStatus === 'accepted' && (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            )}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Description */}
              {event.description && (
                <div className="bg-gray-800/50 rounded-2xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-white font-medium mb-2">
                        {locale === 'ko' ? '설명' : 'Description'}
                      </h3>
                      <p className="text-gray-300 whitespace-pre-wrap text-sm">
                        {event.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions - Fixed Bottom */}
            <div className="sticky bottom-0 bg-gradient-to-t from-gray-950 via-gray-900 to-transparent px-4 md:px-5 py-4">
              <div className="grid grid-cols-4 gap-3">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={action.action}
                    disabled={isDeleting && action.id === 'delete'}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-all touch-manipulation disabled:opacity-50"
                    aria-label={action.label}
                  >
                    {isDeleting && action.id === 'delete' ? (
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    ) : (
                      <action.icon className={`w-5 h-5 ${action.color}`} />
                    )}
                    <span className="text-xs text-gray-300">{action.label}</span>
                  </button>
                ))}
              </div>

              {/* Friend Sharing Button */}
              <button
                onClick={() => setShowShareModal(true)}
                className="w-full mt-3 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/25 transition-all font-medium"
              >
                <UserPlus className="w-5 h-5" />
                {locale === 'ko' ? '친구와 공유' : 'Share with Friends'}
              </button>
            </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Share with Friends Modal */}
          <EventSharingModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            event={event}
            onEventUpdated={() => {
              toast.success(locale === 'ko' ? '공유되었습니다' : 'Shared successfully');
            }}
          />
        </>
      )}
    </AnimatePresence>
  );
}