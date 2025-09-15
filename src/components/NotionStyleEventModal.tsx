'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Bell,
  FileText,
  ChevronRight,
  ChevronDown,
  Hash,
  Tag,
  Link2,
  MoreHorizontal,
  Edit2,
  Trash2,
  Copy,
  Share,
  Star,
  CheckSquare,
  Square,
  Circle,
  ArrowRight,
  MessageSquare,
  Video,
  Phone,
  Mail,
  Globe,
  Paperclip,
  Image,
  Sparkles,
  X,
  Plus,
  Loader2
} from 'lucide-react';
import type { CalendarEvent } from '@/types';
import { useToastContext } from '@/providers/ToastProvider';

interface NotionStyleEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
  locale: string;
}

interface EventBlock {
  id: string;
  type: 'header' | 'property' | 'divider' | 'text' | 'checklist' | 'toggle' | 'callout';
  content?: any;
  icon?: React.ElementType;
  emoji?: string;
  isExpanded?: boolean;
  isEditing?: boolean;
}

export function NotionStyleEventModal({
  isOpen,
  onClose,
  event,
  onEdit,
  onDelete,
  locale
}: NotionStyleEventModalProps) {
  const { toast } = useToastContext();
  const [blocks, setBlocks] = useState<EventBlock[]>([]);
  const [isHoveringTitle, setIsHoveringTitle] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && event) {
      initializeBlocks();
      setEditedTitle(event.summary || '');
    }
  }, [isOpen, event]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const initializeBlocks = () => {
    if (!event) return;

    const newBlocks: EventBlock[] = [];

    // Header Block
    newBlocks.push({
      id: 'header',
      type: 'header',
      content: event.summary || (locale === 'ko' ? '제목 없음' : 'Untitled'),
      emoji: getEventEmoji(event)
    });

    // Divider
    newBlocks.push({
      id: 'divider-1',
      type: 'divider'
    });

    // Properties Section
    // Date & Time
    if (event.start) {
      newBlocks.push({
        id: 'datetime',
        type: 'property',
        icon: Calendar,
        content: {
          label: locale === 'ko' ? '일시' : 'Date & Time',
          value: formatDateTime(event.start?.dateTime || event.start?.date),
          subValue: event.end?.dateTime ? `${formatTime(event.start?.dateTime)} - ${formatTime(event.end?.dateTime)}` : null
        }
      });
    }

    // Location
    if (event.location) {
      const isOnline = isOnlineEvent(event.location);
      newBlocks.push({
        id: 'location',
        type: 'property',
        icon: isOnline ? Video : MapPin,
        content: {
          label: locale === 'ko' ? '장소' : 'Location',
          value: event.location,
          link: isOnline ? event.location : null,
          badge: isOnline ? (locale === 'ko' ? '온라인' : 'Online') : null
        }
      });
    }

    // Attendees
    if (event.attendees && event.attendees.length > 0) {
      newBlocks.push({
        id: 'attendees',
        type: 'toggle',
        icon: Users,
        content: {
          label: locale === 'ko' ? `참석자 ${event.attendees.length}명` : `${event.attendees.length} Attendees`,
          items: event.attendees.map(a => ({
            id: a.email,
            name: a.displayName || a.email?.split('@')[0],
            email: a.email,
            status: a.responseStatus,
            avatar: getAvatarColor(a.email || '')
          }))
        },
        isExpanded: false
      });
    }

    // Reminder
    if (event.reminders) {
      newBlocks.push({
        id: 'reminder',
        type: 'property',
        icon: Bell,
        content: {
          label: locale === 'ko' ? '알림' : 'Reminder',
          value: event.reminders.useDefault
            ? (locale === 'ko' ? '기본 알림 사용' : 'Default reminder')
            : (locale === 'ko' ? '사용자 설정' : 'Custom'),
          badge: locale === 'ko' ? '10분 전' : '10 min before'
        }
      });
    }

    // Tags
    if (event.categories || event.tags) {
      newBlocks.push({
        id: 'tags',
        type: 'property',
        icon: Tag,
        content: {
          label: locale === 'ko' ? '태그' : 'Tags',
          tags: event.categories || event.tags || []
        }
      });
    }

    // Divider
    newBlocks.push({
      id: 'divider-2',
      type: 'divider'
    });

    // Description
    if (event.description) {
      newBlocks.push({
        id: 'description',
        type: 'text',
        content: {
          label: locale === 'ko' ? '설명' : 'Description',
          text: event.description
        }
      });
    }

    // AI Suggestions Callout
    newBlocks.push({
      id: 'ai-callout',
      type: 'callout',
      icon: Sparkles,
      content: {
        label: locale === 'ko' ? 'AI 제안사항' : 'AI Suggestions',
        text: locale === 'ko'
          ? '이 일정에 대한 AI 추천사항을 확인해보세요'
          : 'Check AI recommendations for this event'
      }
    });

    // Checklist for preparation
    newBlocks.push({
      id: 'checklist',
      type: 'checklist',
      content: {
        label: locale === 'ko' ? '준비사항' : 'Preparation',
        items: generateChecklistItems(event, locale)
      }
    });

    setBlocks(newBlocks);
  };

  const getEventEmoji = (event: CalendarEvent): string => {
    const title = event.summary?.toLowerCase() || '';

    if (title.includes('meeting') || title.includes('회의')) return '💼';
    if (title.includes('birthday') || title.includes('생일')) return '🎂';
    if (title.includes('lunch') || title.includes('점심') || title.includes('dinner') || title.includes('저녁')) return '🍽️';
    if (title.includes('call') || title.includes('통화')) return '📞';
    if (title.includes('interview') || title.includes('면접')) return '🎯';
    if (title.includes('workout') || title.includes('운동')) return '💪';
    if (title.includes('study') || title.includes('공부')) return '📚';
    if (title.includes('travel') || title.includes('여행')) return '✈️';
    if (title.includes('doctor') || title.includes('병원')) return '🏥';

    return '📅';
  };

  const isOnlineEvent = (location: string): boolean => {
    const onlineKeywords = ['zoom', 'meet', 'teams', 'online', '온라인', 'webex', 'skype'];
    return onlineKeywords.some(keyword => location.toLowerCase().includes(keyword));
  };

  const formatDateTime = (datetime: string | undefined): string => {
    if (!datetime) return '';
    const date = new Date(datetime);
    return date.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const formatTime = (datetime: string | undefined): string => {
    if (!datetime) return '';
    const date = new Date(datetime);
    return date.toLocaleTimeString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getAvatarColor = (email: string): string => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500'
    ];
    const index = email.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const generateChecklistItems = (event: CalendarEvent, locale: string) => {
    const items = [];
    const title = event.summary?.toLowerCase() || '';

    if (title.includes('meeting') || title.includes('회의')) {
      items.push({
        id: 'prep-1',
        text: locale === 'ko' ? '📝 회의 자료 준비' : '📝 Prepare meeting materials',
        checked: false
      });
      items.push({
        id: 'prep-2',
        text: locale === 'ko' ? '💻 노트북 충전' : '💻 Charge laptop',
        checked: false
      });
    }

    if (event.location && !isOnlineEvent(event.location)) {
      items.push({
        id: 'prep-3',
        text: locale === 'ko' ? '🚗 교통편 확인' : '🚗 Check transportation',
        checked: false
      });
    }

    if (event.attendees && event.attendees.length > 0) {
      items.push({
        id: 'prep-4',
        text: locale === 'ko' ? '👥 참석자 프로필 확인' : '👥 Review attendee profiles',
        checked: false
      });
    }

    return items;
  };

  const handleTitleSave = () => {
    if (event && editedTitle !== event.summary) {
      const updatedEvent = { ...event, summary: editedTitle };
      onEdit?.(updatedEvent);
      toast.success(locale === 'ko' ? '제목이 수정되었습니다' : 'Title updated');
    }
    setIsEditingTitle(false);
  };

  const toggleBlock = (blockId: string) => {
    setBlocks(prev => prev.map(block =>
      block.id === blockId
        ? { ...block, isExpanded: !block.isExpanded }
        : block
    ));
  };

  const toggleChecklist = (blockId: string, itemId: string) => {
    setBlocks(prev => prev.map(block => {
      if (block.id === blockId && block.type === 'checklist') {
        const items = block.content.items.map((item: any) =>
          item.id === itemId ? { ...item, checked: !item.checked } : item
        );
        return { ...block, content: { ...block.content, items } };
      }
      return block;
    }));
  };

  const loadAiSuggestions = async () => {
    setLoadingAi(true);
    setShowAiSuggestions(true);

    try {
      // Simulate AI loading
      await new Promise(resolve => setTimeout(resolve, 1000));

      const suggestions = [];
      const title = event?.summary?.toLowerCase() || '';

      if (title.includes('meeting') || title.includes('회의')) {
        suggestions.push(locale === 'ko' ? '💡 의제를 미리 공유하면 효율적입니다' : '💡 Share agenda in advance for efficiency');
        suggestions.push(locale === 'ko' ? '⏰ 5분 일찍 접속하여 준비하세요' : '⏰ Join 5 minutes early to prepare');
      }

      if (event?.attendees && event.attendees.length > 5) {
        suggestions.push(locale === 'ko' ? '📊 대규모 미팅이므로 진행자를 지정하세요' : '📊 Assign a facilitator for large meetings');
      }

      if (event?.location && !isOnlineEvent(event.location)) {
        suggestions.push(locale === 'ko' ? '🗺️ 주차 공간을 미리 확인하세요' : '🗺️ Check parking availability in advance');
      }

      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to load AI suggestions:', error);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleShare = async () => {
    if (!event) return;

    const shareText = `${event.summary}\n${formatDateTime(event.start?.dateTime || event.start?.date)}${event.location ? `\n📍 ${event.location}` : ''}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: event.summary,
          text: shareText
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success(locale === 'ko' ? '클립보드에 복사되었습니다' : 'Copied to clipboard');
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleDelete = () => {
    if (!event) return;

    if (window.confirm(locale === 'ko' ? '이 일정을 삭제하시겠습니까?' : 'Delete this event?')) {
      onDelete?.(event);
      onClose();
      toast.success(locale === 'ko' ? '일정이 삭제되었습니다' : 'Event deleted');
    }
  };

  if (!event) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/10 backdrop-blur-sm z-50"
          />

          {/* Modal Container - Safe Centered */}
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6 md:p-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden"
                style={{ maxHeight: 'min(85vh, 800px)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col h-full max-h-[85vh]">
              {/* Top Bar */}
              <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Star className={`w-4 h-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <MessageSquare className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Share className="w-4 h-4 text-gray-500" />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowMoreMenu(!showMoreMenu)}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4 text-gray-500" />
                    </button>

                    {showMoreMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10"
                      >
                        <button
                          onClick={() => {
                            toast.info(locale === 'ko' ? '복제 기능 준비 중' : 'Duplicate coming soon');
                            setShowMoreMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <Copy className="w-4 h-4" />
                          {locale === 'ko' ? '복제' : 'Duplicate'}
                        </button>
                        <button
                          onClick={() => {
                            handleDelete();
                            setShowMoreMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                          {locale === 'ko' ? '삭제' : 'Delete'}
                        </button>
                      </motion.div>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-2"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div
                ref={contentRef}
                className="flex-1 overflow-y-auto px-6 md:px-12 lg:px-20 py-8 md:py-12"
                style={{ maxWidth: '100%' }}
              >
                <div className="max-w-3xl mx-auto">
                  {blocks.map((block) => {
                    switch (block.type) {
                      case 'header':
                        return (
                          <div key={block.id} className="mb-8">
                            <div
                              className="flex items-center gap-3 group"
                              onMouseEnter={() => setIsHoveringTitle(true)}
                              onMouseLeave={() => setIsHoveringTitle(false)}
                            >
                              <span className="text-4xl">{block.emoji}</span>
                              {isEditingTitle ? (
                                <input
                                  ref={titleInputRef}
                                  type="text"
                                  value={editedTitle}
                                  onChange={(e) => setEditedTitle(e.target.value)}
                                  onBlur={handleTitleSave}
                                  onKeyPress={(e) => e.key === 'Enter' && handleTitleSave()}
                                  className="flex-1 text-3xl font-bold bg-transparent border-b-2 border-gray-300 focus:border-gray-600 outline-none dark:text-white"
                                />
                              ) : (
                                <h1
                                  onClick={() => setIsEditingTitle(true)}
                                  className="flex-1 text-3xl font-bold cursor-text dark:text-white"
                                >
                                  {block.content}
                                </h1>
                              )}
                              {isHoveringTitle && !isEditingTitle && (
                                <button
                                  onClick={() => setIsEditingTitle(true)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Edit2 className="w-4 h-4 text-gray-400" />
                                </button>
                              )}
                            </div>
                          </div>
                        );

                      case 'divider':
                        return (
                          <div key={block.id} className="my-6 border-t border-gray-200 dark:border-gray-700" />
                        );

                      case 'property':
                        const Icon = block.icon!;
                        return (
                          <div key={block.id} className="flex items-start gap-3 py-3 group hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-3 px-3 rounded-lg transition-colors">
                            <Icon className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[100px]">
                                  {block.content.label}
                                </span>
                                <span className="text-sm font-medium dark:text-white">
                                  {block.content.link ? (
                                    <a
                                      href={block.content.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                      {block.content.value}
                                      <Link2 className="w-3 h-3" />
                                    </a>
                                  ) : (
                                    block.content.value
                                  )}
                                </span>
                                {block.content.badge && (
                                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded">
                                    {block.content.badge}
                                  </span>
                                )}
                              </div>
                              {block.content.subValue && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-[108px]">
                                  {block.content.subValue}
                                </div>
                              )}
                              {block.content.tags && (
                                <div className="flex gap-2 mt-2 ml-[108px]">
                                  {block.content.tags.map((tag: string) => (
                                    <span
                                      key={tag}
                                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );

                      case 'toggle':
                        const ToggleIcon = block.icon!;
                        return (
                          <div key={block.id} className="py-3">
                            <button
                              onClick={() => toggleBlock(block.id)}
                              className="flex items-center gap-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-3 px-3 py-2 rounded-lg transition-colors"
                            >
                              {block.isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                              <ToggleIcon className="w-5 h-5 text-gray-400" />
                              <span className="text-sm font-medium dark:text-white">
                                {block.content.label}
                              </span>
                            </button>

                            <AnimatePresence>
                              {block.isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="ml-11 mt-2 space-y-2 overflow-hidden"
                                >
                                  {block.content.items.map((attendee: any) => (
                                    <div key={attendee.id} className="flex items-center gap-3 py-1">
                                      <div className={`w-7 h-7 rounded-full ${attendee.avatar} flex items-center justify-center text-white text-xs font-medium`}>
                                        {attendee.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="flex-1">
                                        <div className="text-sm font-medium dark:text-white">{attendee.name}</div>
                                        <div className="text-xs text-gray-500">{attendee.email}</div>
                                      </div>
                                      {attendee.status === 'accepted' && (
                                        <CheckSquare className="w-4 h-4 text-green-500" />
                                      )}
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );

                      case 'text':
                        return (
                          <div key={block.id} className="py-6">
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                              {block.content.label}
                            </h3>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap dark:text-gray-200">
                              {block.content.text}
                            </p>
                          </div>
                        );

                      case 'callout':
                        const CalloutIcon = block.icon!;
                        return (
                          <div key={block.id} className="my-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                            <div className="flex gap-3">
                              <CalloutIcon className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <h4 className="font-medium text-sm mb-1 dark:text-white">
                                  {block.content.label}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {block.content.text}
                                </p>
                                {!showAiSuggestions && (
                                  <button
                                    onClick={loadAiSuggestions}
                                    className="mt-2 text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 font-medium"
                                  >
                                    {locale === 'ko' ? '제안사항 보기 →' : 'View suggestions →'}
                                  </button>
                                )}
                              </div>
                            </div>

                            {showAiSuggestions && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 ml-8 space-y-2"
                              >
                                {loadingAi ? (
                                  <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {locale === 'ko' ? 'AI가 분석 중...' : 'AI analyzing...'}
                                  </div>
                                ) : (
                                  aiSuggestions.map((suggestion, index) => (
                                    <div key={index} className="text-sm text-gray-600 dark:text-gray-300">
                                      {suggestion}
                                    </div>
                                  ))
                                )}
                              </motion.div>
                            )}
                          </div>
                        );

                      case 'checklist':
                        return (
                          <div key={block.id} className="py-6">
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
                              {block.content.label}
                            </h3>
                            <div className="space-y-2">
                              {block.content.items.map((item: any) => (
                                <button
                                  key={item.id}
                                  onClick={() => toggleChecklist(block.id, item.id)}
                                  className="flex items-center gap-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-2 px-2 py-1 rounded transition-colors"
                                >
                                  {item.checked ? (
                                    <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                  ) : (
                                    <Square className="w-4 h-4 text-gray-400" />
                                  )}
                                  <span className={`text-sm ${item.checked ? 'line-through text-gray-400' : 'dark:text-white'}`}>
                                    {item.text}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );

                      default:
                        return null;
                    }
                  })}

                  {/* Add Block Button */}
                  <button className="flex items-center gap-2 w-full py-2 mt-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">
                      {locale === 'ko' ? '블록 추가' : 'Add a block'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="px-4 md:px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {event.updated && `${locale === 'ko' ? '마지막 수정' : 'Last edited'}: ${new Date(event.updated).toLocaleDateString()}`}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit?.(event)}
                      className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
                    >
                      <Edit2 className="w-3 h-3" />
                      {locale === 'ko' ? '편집' : 'Edit'}
                    </button>
                  </div>
                </div>
              </div>
                </div>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}