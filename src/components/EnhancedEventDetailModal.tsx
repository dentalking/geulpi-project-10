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
  ChevronLeft,
  MoreVertical,
  Star,
  StarOff
} from 'lucide-react';
import type { CalendarEvent } from '@/types';
import { useToastContext } from '@/providers/ToastProvider';

interface EnhancedEventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  locale: string;
}

export function EnhancedEventDetailModal({
  isOpen,
  onClose,
  event,
  onEdit,
  onDelete,
  locale
}: EnhancedEventDetailModalProps) {
  const { toast } = useToastContext();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    // Reset states when modal opens with new event
    if (isOpen && event) {
      setShowMoreMenu(false);
      setShowDeleteConfirm(false);
      // Check if event is favorited (would come from API/storage)
      setIsFavorite(false);
    }
  }, [isOpen, event]);

  if (!event) return null;

  const formatDateTime = (dateTime: string | undefined) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
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

  const formatDate = (dateTime: string | undefined) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
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
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(
          `${event.summary}\\n${formatDateTime(event.start?.dateTime || event.start?.date)}\\n${event.location || ''}`
        );
        toast.success(locale === 'ko' ? '클립보드에 복사되었습니다' : 'Copied to clipboard');
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleCopyLink = async () => {
    try {
      // In real app, this would be the actual event link
      const eventLink = `${window.location.origin}/event/${event.id}`;
      await navigator.clipboard.writeText(eventLink);
      toast.success(locale === 'ko' ? '링크가 복사되었습니다' : 'Link copied');
    } catch (error) {
      toast.error(locale === 'ko' ? '링크 복사 실패' : 'Failed to copy link');
    }
  };

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast.success(
      isFavorite 
        ? (locale === 'ko' ? '즐겨찾기에서 제거되었습니다' : 'Removed from favorites')
        : (locale === 'ko' ? '즐겨찾기에 추가되었습니다' : 'Added to favorites')
    );
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(event);
      toast.success(locale === 'ko' ? '일정이 삭제되었습니다' : 'Event deleted');
      onClose();
    } catch (error) {
      toast.error(locale === 'ko' ? '삭제 실패' : 'Failed to delete');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Check if event is a video meeting
  const hasVideoMeeting = event.location?.toLowerCase().includes('meet') || 
                         event.location?.toLowerCase().includes('zoom') ||
                         event.location?.toLowerCase().includes('teams');

  // Check if event is recurring
  const isRecurring = event.recurrence && event.recurrence.length > 0;

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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 bottom-4 md:inset-x-auto md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 w-auto md:w-[500px] max-w-[calc(100vw-2rem)]"
          >
            <div className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-3xl shadow-2xl overflow-hidden">
              {/* Enhanced Header with Gradient */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20" />
                <div className="relative p-6 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <button
                      onClick={onClose}
                      className="p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors"
                      aria-label="Close"
                    >
                      <ChevronLeft className="w-5 h-5 text-white/70" />
                    </button>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleToggleFavorite}
                        className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {isFavorite ? (
                          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        ) : (
                          <StarOff className="w-5 h-5 text-white/70" />
                        )}
                      </button>
                      
                      <div className="relative">
                        <button
                          onClick={() => setShowMoreMenu(!showMoreMenu)}
                          className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                          aria-label="More options"
                        >
                          <MoreVertical className="w-5 h-5 text-white/70" />
                        </button>
                        
                        {/* Dropdown Menu */}
                        <AnimatePresence>
                          {showMoreMenu && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-xl shadow-xl overflow-hidden z-10"
                            >
                              <button
                                onClick={() => {
                                  handleShare();
                                  setShowMoreMenu(false);
                                }}
                                className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 flex items-center gap-3"
                              >
                                <Share2 className="w-4 h-4" />
                                {locale === 'ko' ? '공유' : 'Share'}
                              </button>
                              <button
                                onClick={() => {
                                  handleCopyLink();
                                  setShowMoreMenu(false);
                                }}
                                className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 flex items-center gap-3"
                              >
                                <LinkIcon className="w-4 h-4" />
                                {locale === 'ko' ? '링크 복사' : 'Copy link'}
                              </button>
                              <button
                                onClick={() => {
                                  // TODO: Implement duplicate
                                  setShowMoreMenu(false);
                                  toast.info(locale === 'ko' ? '준비 중입니다' : 'Coming soon');
                                }}
                                className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 flex items-center gap-3"
                              >
                                <Copy className="w-4 h-4" />
                                {locale === 'ko' ? '복제' : 'Duplicate'}
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                  
                  {/* Event Title with Status Indicator */}
                  <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-white">
                      {event.summary || (locale === 'ko' ? '제목 없음' : 'Untitled Event')}
                    </h2>
                    
                    {/* Status Badges */}
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
                          {locale === 'ko' ? '화상회의' : 'Video Call'}
                        </span>
                      )}
                      {event.status === 'tentative' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs">
                          {locale === 'ko' ? '미정' : 'Tentative'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content with Better Spacing */}
              <div className="px-6 py-4 space-y-5 max-h-[50vh] overflow-y-auto">
                {/* Date & Time with Visual Enhancement */}
                <div className="bg-gray-800/50 rounded-2xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">
                        {formatDate(event.start?.dateTime || event.start?.date)}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {formatTime(event.start?.dateTime || event.start?.date)}
                        {event.end?.dateTime && (
                          <span> - {formatTime(event.end.dateTime)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Location with Map Preview (if available) */}
                {event.location && (
                  <div className="bg-gray-800/50 rounded-2xl p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                        {hasVideoMeeting ? (
                          <Video className="w-6 h-6 text-blue-400" />
                        ) : (
                          <MapPin className="w-6 h-6 text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{event.location}</p>
                        {hasVideoMeeting && (
                          <button className="text-blue-400 text-sm hover:underline mt-1">
                            {locale === 'ko' ? '회의 참여 →' : 'Join meeting →'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Attendees with Avatars */}
                {event.attendees && event.attendees.length > 0 && (
                  <div className="bg-gray-800/50 rounded-2xl p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-400 text-sm mb-2">
                          {locale === 'ko' ? `참석자 ${event.attendees.length}명` : `${event.attendees.length} Attendees`}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {event.attendees.slice(0, 5).map((attendee, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-1.5"
                            >
                              <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                {attendee.email?.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-white text-sm">
                                {attendee.displayName || attendee.email?.split('@')[0]}
                              </span>
                              {attendee.responseStatus === 'accepted' && (
                                <CheckCircle className="w-3 h-3 text-green-400" />
                              )}
                            </div>
                          ))}
                          {event.attendees.length > 5 && (
                            <div className="bg-gray-700/50 rounded-lg px-3 py-1.5 text-gray-400 text-sm">
                              +{event.attendees.length - 5} {locale === 'ko' ? '명' : 'more'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reminder */}
                {event.reminders && (
                  <div className="bg-gray-800/50 rounded-2xl p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                        <Bell className="w-6 h-6 text-yellow-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">
                          {locale === 'ko' ? '알림 설정됨' : 'Reminder set'}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {event.reminders.useDefault 
                            ? (locale === 'ko' ? '기본 알림 사용' : 'Using default reminder')
                            : (locale === 'ko' ? '사용자 설정 알림' : 'Custom reminder')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Description */}
                {event.description && (
                  <div className="bg-gray-800/50 rounded-2xl p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-400 text-sm mb-2">
                          {locale === 'ko' ? '설명' : 'Description'}
                        </p>
                        <p className="text-white whitespace-pre-wrap">{event.description}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Actions with Confirmation */}
              <div className="p-6 pt-4 border-t border-gray-800 bg-gradient-to-t from-gray-950 to-transparent">
                <div className="flex gap-3">
                  <button
                    onClick={() => onEdit(event)}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/25 transition-all font-medium"
                  >
                    <Edit3 className="w-4 h-4" />
                    {locale === 'ko' ? '편집' : 'Edit'}
                  </button>
                  
                  <AnimatePresence mode="wait">
                    {showDeleteConfirm ? (
                      <motion.button
                        key="confirm"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1 py-3 bg-red-600 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-red-700 transition-all font-medium disabled:opacity-50"
                      >
                        {isDeleting ? (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            {locale === 'ko' ? '정말 삭제?' : 'Confirm?'}
                          </>
                        )}
                      </motion.button>
                    ) : (
                      <motion.button
                        key="delete"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={handleDelete}
                        className="flex-1 py-3 bg-gray-800 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-gray-700 transition-all font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        {locale === 'ko' ? '삭제' : 'Delete'}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
                
                {showDeleteConfirm && (
                  <motion.button
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="w-full mt-2 py-2 text-gray-400 text-sm hover:text-white transition-colors"
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