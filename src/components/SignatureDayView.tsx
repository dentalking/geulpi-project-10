'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useEvents } from '@/contexts/EventContext';
import { CalendarEvent } from '@/types';
import { format, startOfDay, endOfDay, addMinutes, isSameDay, parseISO } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { Clock, MessageSquare, Plus, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';

interface SignatureDayViewProps {
  date: Date;
  locale?: 'ko' | 'en';
  onChatCommand?: (command: string) => void;
  compact?: boolean;
  showChatPanel?: boolean;
}

interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
  events: CalendarEvent[];
}

export function SignatureDayView({
  date,
  locale = 'ko',
  onChatCommand,
  compact = false,
  showChatPanel = true
}: SignatureDayViewProps) {
  const { events, selectedEvent, selectEvent } = useEvents();
  const [chatInput, setChatInput] = useState('');
  const [hoveredTime, setHoveredTime] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedView, setExpandedView] = useState(!compact);

  const timelineRef = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef<HTMLDivElement>(null);

  // Filter events for the selected day
  const dayEvents = useMemo(() => {
    return events.filter(event => {
      if (!event.start) return false;
      const eventDate = parseISO(event.start.dateTime || event.start.date || '');
      return isSameDay(eventDate, date);
    }).sort((a, b) => {
      const dateA = new Date(a.start?.dateTime || a.start?.date || '');
      const dateB = new Date(b.start?.dateTime || b.start?.date || '');
      return dateA.getTime() - dateB.getTime();
    });
  }, [events, date]);

  // Generate time slots (30-minute intervals)
  const timeSlots = useMemo(() => {
    const slots: TimeSlot[] = [];
    const dayStart = startOfDay(date);

    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = addMinutes(dayStart, hour * 60 + minute);
        const slotEvents = dayEvents.filter(event => {
          if (!event.start) return false;
          const eventStart = new Date(event.start.dateTime || event.start.date || '');
          const eventHour = eventStart.getHours();
          const eventMinute = Math.floor(eventStart.getMinutes() / 30) * 30;
          return eventHour === hour && eventMinute === minute;
        });

        slots.push({
          time: format(slotTime, 'HH:mm'),
          hour,
          minute,
          events: slotEvents
        });
      }
    }
    return slots;
  }, [date, dayEvents]);

  // Auto-scroll to current time
  React.useEffect(() => {
    if (currentTimeRef.current && timelineRef.current) {
      currentTimeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, []);

  // Handle chat commands
  const handleChatSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() && onChatCommand) {
      onChatCommand(chatInput);
      setChatInput('');
    }
  }, [chatInput, onChatCommand]);

  // Calculate event position and height
  const getEventStyle = (event: CalendarEvent) => {
    if (!event.start) return {};

    const start = new Date(event.start.dateTime || event.start.date || '');
    const end = event.end ? new Date(event.end.dateTime || event.end.date || '') : addMinutes(start, 60);

    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const duration = Math.max(30, endMinutes - startMinutes);

    return {
      top: `${(startMinutes / 30) * 40}px`,
      height: `${(duration / 30) * 40 - 4}px`,
      minHeight: '36px'
    };
  };

  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();

  return (
    <div className={`signature-day-view ${compact ? 'compact' : 'full'} bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden`}>
      {/* Header */}
      <div className="day-header bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="p-1 hover:bg-white/20 rounded transition-colors"
              onClick={() => {/* Navigate to previous day */}}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold">
                {format(date, locale === 'ko' ? 'M월 d일 EEEE' : 'EEEE, MMMM d', {
                  locale: locale === 'ko' ? ko : enUS
                })}
              </h2>
              <p className="text-sm opacity-90">
                {dayEvents.length}개 일정
              </p>
            </div>
            <button
              className="p-1 hover:bg-white/20 rounded transition-colors"
              onClick={() => {/* Navigate to next day */}}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={() => setExpandedView(!expandedView)}
            className="p-2 hover:bg-white/20 rounded transition-colors"
          >
            {expandedView ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="day-content flex h-[600px]">
        {/* Time axis and events */}
        <div className="flex-1 flex">
          {/* Timeline */}
          <div className="timeline w-20 border-r border-gray-200 dark:border-gray-700 overflow-y-auto" ref={timelineRef}>
            {timeSlots.filter((_, index) => index % 2 === 0).map((slot) => (
              <div
                key={slot.time}
                className={`time-slot h-20 flex items-center justify-center text-sm ${
                  slot.hour === currentHour ? 'text-blue-600 font-bold' : 'text-gray-500'
                }`}
                ref={slot.hour === currentHour && Math.abs(slot.minute - currentMinute) < 30 ? currentTimeRef : undefined}
              >
                {slot.time}
              </div>
            ))}
          </div>

          {/* Events area */}
          <div className="events-area flex-1 relative overflow-y-auto">
            {/* Grid lines */}
            {timeSlots.filter((_, index) => index % 2 === 0).map((slot) => (
              <div
                key={slot.time}
                className="grid-line absolute w-full h-20 border-b border-gray-100 dark:border-gray-800"
                style={{ top: `${(slot.hour * 2 + slot.minute / 30) * 40}px` }}
              />
            ))}

            {/* Current time indicator */}
            {isSameDay(date, new Date()) && (
              <motion.div
                className="current-time absolute w-full h-0.5 bg-red-500 z-20"
                style={{ top: `${((currentHour * 60 + currentMinute) / 30) * 40}px` }}
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="absolute -left-2 -top-2 w-4 h-4 bg-red-500 rounded-full" />
              </motion.div>
            )}

            {/* Events */}
            <div className="events-container relative" style={{ height: `${24 * 80}px` }}>
              {dayEvents.map((event) => (
                <motion.div
                  key={event.id}
                  className={`event-card absolute left-2 right-2 p-2 rounded-lg cursor-pointer transition-all ${
                    selectedEvent?.id === event.id
                      ? 'bg-blue-500 text-white shadow-lg z-10'
                      : 'bg-blue-100 dark:bg-blue-900/50 hover:shadow-md'
                  }`}
                  style={getEventStyle(event)}
                  onClick={() => selectEvent(event)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  draggable
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={() => setIsDragging(false)}
                >
                  <div className="flex flex-col h-full">
                    <div className="font-medium text-sm truncate">
                      {event.summary || 'Untitled'}
                    </div>
                    {!compact && event.location && (
                      <div className="text-xs opacity-80 truncate">
                        📍 {event.location}
                      </div>
                    )}
                    {!compact && event.start && (
                      <div className="text-xs opacity-70 mt-auto">
                        {format(new Date(event.start.dateTime || event.start.date || ''), 'HH:mm')}
                        {event.end && ` - ${format(new Date(event.end.dateTime || event.end.date || ''), 'HH:mm')}`}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Empty slot hints */}
            {hoveredTime && !isDragging && (
              <motion.div
                className="empty-slot-hint absolute left-2 right-2 h-10 bg-gray-200/50 dark:bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-400 dark:border-gray-600 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Plus className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500 ml-1">일정 추가</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* AI Chat Panel */}
        {showChatPanel && expandedView && (
          <div className="chat-panel w-80 border-l border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                AI 일정 편집
              </h3>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              {/* Quick commands */}
              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">빠른 명령어:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    '오전 일정 1시간 뒤로',
                    '3시에 회의 추가',
                    '점심 시간 변경',
                    '내일로 이동'
                  ].map((cmd) => (
                    <button
                      key={cmd}
                      className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => setChatInput(cmd)}
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected event context */}
              {selectedEvent && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <p className="text-sm font-medium mb-1">선택된 일정:</p>
                  <p className="text-sm">{selectedEvent.summary}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {selectedEvent.start && format(new Date(selectedEvent.start.dateTime || selectedEvent.start.date || ''), 'HH:mm')}
                  </p>
                </div>
              )}

              {/* Day statistics */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">총 일정</span>
                  <span className="font-medium">{dayEvents.length}개</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">바쁜 시간</span>
                  <span className="font-medium">
                    {dayEvents.reduce((acc, event) => {
                      if (!event.start || !event.end) return acc;
                      const duration = (new Date(event.end.dateTime || event.end.date || '').getTime() -
                                       new Date(event.start.dateTime || event.start.date || '').getTime()) / (1000 * 60 * 60);
                      return acc + duration;
                    }, 0).toFixed(1)}시간
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">여유 시간</span>
                  <span className="font-medium text-green-600">
                    {(24 - dayEvents.reduce((acc, event) => {
                      if (!event.start || !event.end) return acc;
                      const duration = (new Date(event.end.dateTime || event.end.date || '').getTime() -
                                       new Date(event.start.dateTime || event.start.date || '').getTime()) / (1000 * 60 * 60);
                      return acc + duration;
                    }, 0)).toFixed(1)}시간
                  </span>
                </div>
              </div>
            </div>

            {/* Chat input */}
            <form onSubmit={handleChatSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="일정을 자연어로 편집하세요..."
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}