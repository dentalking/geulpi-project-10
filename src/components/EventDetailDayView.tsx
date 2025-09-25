'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SignatureDayView } from './SignatureDayView';
import { DayViewChatService } from '@/services/DayViewChatService';
import { useEvents } from '@/contexts/EventContext';
import { CalendarEvent } from '@/types';
import { format, parseISO, isSameDay } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import {
  X, Edit3, Trash2, Copy, Share2, MapPin, Clock,
  Calendar, Users, FileText, Bell, Repeat, Star
} from 'lucide-react';
import { useToastContext } from '@/providers/ToastProvider';

interface EventDetailDayViewProps {
  event: CalendarEvent;
  isOpen: boolean;
  onClose: () => void;
  locale?: 'ko' | 'en';
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
}

export function EventDetailDayView({
  event,
  isOpen,
  onClose,
  locale = 'ko',
  onEdit,
  onDelete
}: EventDetailDayViewProps) {
  const { events, setEvents, selectEvent } = useEvents();
  const { toast } = useToastContext();
  const chatService = DayViewChatService.getInstance();

  const [activeTab, setActiveTab] = useState<'overview' | 'daycontext' | 'edit'>('daycontext');
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [editedEvent, setEditedEvent] = useState(event);

  const eventDate = event.start ? parseISO(event.start.dateTime || event.start.date || '') : new Date();

  // Handle chat commands
  const handleChatCommand = useCallback(async (command: string) => {
    setIsProcessing(true);

    try {
      const parsed = chatService.parseCommand(command, { selectedEvent: event, date: eventDate });

      if (!parsed) {
        toast.error('명령을 이해할 수 없습니다.');
        return;
      }

      const result = await chatService.executeCommand(parsed, events, { selectedEvent: event, date: eventDate });

      if (result.success && result.updatedEvents) {
        setEvents(result.updatedEvents);

        // Update selected event if it was modified
        const updatedEvent = result.updatedEvents.find(e => e.id === event.id);
        if (updatedEvent) {
          selectEvent(updatedEvent);
          setEditedEvent(updatedEvent);
        }

        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('명령 처리 중 오류가 발생했습니다.');
      console.error('Chat command error:', error);
    } finally {
      setIsProcessing(false);
      setChatInput('');
    }
  }, [event, eventDate, events, setEvents, selectEvent, chatService]);

  // Handle quick actions
  const handleQuickAction = (action: string) => {
    setChatInput(action);
    handleChatCommand(action);
  };

  // Save edited event
  const handleSaveEdit = () => {
    if (onEdit) {
      onEdit(editedEvent);
      toast.success('일정이 수정되었습니다.');
      setActiveTab('overview');
    }
  };

  // Delete event
  const handleDelete = () => {
    if (onDelete && event.id && window.confirm('정말 이 일정을 삭제하시겠습니까?')) {
      onDelete(event.id);
      onClose();
      toast.success('일정이 삭제되었습니다.');
    }
  };

  // Copy event to clipboard
  const handleCopy = () => {
    const eventText = `
${event.summary}
📅 ${format(eventDate, 'yyyy년 M월 d일 EEEE', { locale: ko })}
⏰ ${format(eventDate, 'HH:mm')}${event.end ? ` - ${format(parseISO(event.end.dateTime || event.end.date || ''), 'HH:mm')}` : ''}
${event.location ? `📍 ${event.location}` : ''}
${event.description ? `\n${event.description}` : ''}
    `.trim();

    navigator.clipboard.writeText(eventText);
    toast.success('일정이 클립보드에 복사되었습니다.');
  };

  // Get related events (same day)
  const relatedEvents = events.filter(e => {
    if (!e.start || e.id === event.id) return false;
    const eDate = parseISO(e.start.dateTime || e.start.date || '');
    return isSameDay(eDate, eventDate);
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-6xl h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            {/* Header */}
            <div className="header bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{event.summary || 'Untitled Event'}</h2>
                  <div className="flex items-center gap-4 text-sm opacity-90">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(eventDate, 'yyyy년 M월 d일 EEEE', { locale: locale === 'ko' ? ko : enUS })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {format(eventDate, 'HH:mm')}
                      {event.end && ` - ${format(parseISO(event.end.dateTime || event.end.date || ''), 'HH:mm')}`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setActiveTab('edit')}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-1 text-sm"
                >
                  <Edit3 className="w-4 h-4" />
                  편집
                </button>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-1 text-sm"
                >
                  <Copy className="w-4 h-4" />
                  복사
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors flex items-center gap-1 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs border-b border-gray-200 dark:border-gray-700">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('daycontext')}
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === 'daycontext'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                  }`}
                >
                  하루 일정 컨텍스트
                </button>
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === 'overview'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                  }`}
                >
                  상세 정보
                </button>
                <button
                  onClick={() => setActiveTab('edit')}
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === 'edit'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                  }`}
                >
                  편집
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="content h-[calc(100%-200px)] overflow-y-auto">
              {activeTab === 'daycontext' && (
                <div className="p-6">
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      이 일정이 속한 하루 전체를 한눈에 보고 수정하세요
                    </p>
                  </div>

                  {/* Embedded Day View with highlighted event */}
                  <SignatureDayView
                    date={eventDate}
                    locale={locale}
                    onChatCommand={handleChatCommand}
                    showChatPanel={true}
                  />

                  {/* Quick chat commands */}
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium mb-2">빠른 명령어:</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleQuickAction('이 일정을 1시간 뒤로')}
                        className="px-3 py-1 text-xs bg-white dark:bg-gray-700 rounded-full hover:shadow-md transition-all"
                      >
                        1시간 뒤로
                      </button>
                      <button
                        onClick={() => handleQuickAction('이 일정을 30분 연장')}
                        className="px-3 py-1 text-xs bg-white dark:bg-gray-700 rounded-full hover:shadow-md transition-all"
                      >
                        30분 연장
                      </button>
                      <button
                        onClick={() => handleQuickAction('이 일정을 내일 같은 시간에 복사')}
                        className="px-3 py-1 text-xs bg-white dark:bg-gray-700 rounded-full hover:shadow-md transition-all"
                      >
                        내일 복사
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'overview' && (
                <div className="p-6 space-y-6">
                  {/* Event details */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-3">기본 정보</h3>
                      <div className="space-y-3">
                        {event.location && (
                          <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">장소</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{event.location}</p>
                            </div>
                          </div>
                        )}

                        {event.description && (
                          <div className="flex items-start gap-3">
                            <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">설명</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                {event.description}
                              </p>
                            </div>
                          </div>
                        )}

                        {event.attendees && event.attendees.length > 0 && (
                          <div className="flex items-start gap-3">
                            <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">참석자 ({event.attendees.length})</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {event.attendees.map((attendee, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-full"
                                  >
                                    {attendee.email}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">관련 일정</h3>
                      <div className="space-y-2">
                        {relatedEvents.length > 0 ? (
                          relatedEvents.map((relEvent) => {
                            const relEventDate = parseISO(relEvent.start?.dateTime || relEvent.start?.date || '');
                            return (
                              <button
                                key={relEvent.id}
                                onClick={() => selectEvent(relEvent)}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                              >
                                <p className="font-medium text-sm">{relEvent.summary}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {format(relEventDate, 'HH:mm')}
                                </p>
                              </button>
                            );
                          })
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            같은 날 다른 일정이 없습니다
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'edit' && (
                <div className="p-6">
                  <form className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">제목</label>
                      <input
                        type="text"
                        value={editedEvent.summary || ''}
                        onChange={(e) => setEditedEvent({ ...editedEvent, summary: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">장소</label>
                      <input
                        type="text"
                        value={editedEvent.location || ''}
                        onChange={(e) => setEditedEvent({ ...editedEvent, location: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">설명</label>
                      <textarea
                        value={editedEvent.description || ''}
                        onChange={(e) => setEditedEvent({ ...editedEvent, description: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveTab('overview')}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        저장
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}