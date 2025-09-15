'use client';

import { useState, useCallback } from 'react';
import { motion, useAnimation, PanInfo, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, Clock, MapPin, X } from 'lucide-react';
import type { CalendarEvent } from '@/types';
import { EventListModal, EventCreateModal } from './EventModals';
import { UnifiedEventDetailModal } from './UnifiedEventDetailModal';
import { AIEventReportModal } from './AIEventReportModal';
import { NotionStyleEventModal } from './NotionStyleEventModal';
import { useToastContext } from '@/providers/ToastProvider';
import { useTranslations } from 'next-intl';
import { TypingAnimation } from './TypingAnimation';

interface UnifiedCalendarViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  locale: string;
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
  onAddEvent?: () => void;
  onEventCreated?: () => void;
  children: React.ReactNode;
  isDesktop?: boolean;
  highlightedEventId?: string | null;
  spotlightEvent?: { id: string; date: Date; title: string } | null;
  onOpenAIChat?: (eventContext?: CalendarEvent) => void;
}

export function UnifiedCalendarView({
  events = [],
  currentDate,
  locale,
  onEventClick,
  onDateClick,
  onAddEvent,
  onEventCreated,
  children,
  isDesktop = false,
  highlightedEventId,
  spotlightEvent,
  onOpenAIChat
}: UnifiedCalendarViewProps) {
  const [viewMode, setViewMode] = useState<'compact' | 'expanded'>(isDesktop ? 'expanded' : 'expanded');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [showEventListModal, setShowEventListModal] = useState(false);
  const [showEventDetailModal, setShowEventDetailModal] = useState(false);
  const [eventViewMode, setEventViewMode] = useState<'notion' | 'ai-report' | 'unified'>('notion'); // 이벤트 뷰 모드
  const [showEventCreateModal, setShowEventCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const controls = useAnimation();
  const { toast } = useToastContext();
  const t = useTranslations();

  const handleDragEnd = useCallback(
    async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);
      
      // 더 민감한 threshold로 부드러운 스와이프 경험
      const swipeThreshold = 30;
      const velocityThreshold = 300;
      
      if (info.offset.y < -swipeThreshold || info.velocity.y < -velocityThreshold) {
        // Swiped up - show compact view with detail panel
        setViewMode('compact');
        await controls.start({ 
          y: 0,
          transition: { 
            type: "spring", 
            damping: 25, 
            stiffness: 300,
            duration: 0.6
          }
        });
      } else if (info.offset.y > swipeThreshold || info.velocity.y > velocityThreshold) {
        // Swiped down - show expanded calendar
        setViewMode('expanded');
        await controls.start({ 
          y: 0,
          transition: { 
            type: "spring", 
            damping: 20, 
            stiffness: 250,
            duration: 0.8
          }
        });
      } else {
        // Return to current position with smooth animation
        await controls.start({ 
          y: 0,
          transition: { 
            type: "spring", 
            damping: 30, 
            stiffness: 400,
            duration: 0.4
          }
        });
      }
    },
    [controls]
  );

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    onDateClick(date);
    
    // Show modal in expanded view
    if (viewMode === 'expanded') {
      const dayEvents = (events || []).filter(event => {
        const eventDate = new Date(event.start?.dateTime || event.start?.date || '');
        return eventDate.toDateString() === date.toDateString();
      });
      
      if (dayEvents.length > 0) {
        setShowEventListModal(true);
      } else {
        setShowEventCreateModal(true);
      }
    }
  }, [onDateClick, viewMode, events]);

  // Get events for a specific date
  const getEventsForDate = useCallback((date: Date) => {
    return (events || []).filter(event => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || '');
      return eventDate.toDateString() === date.toDateString();
    });
  }, [events]);

  // Generate calendar days
  const generateCalendarDays = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: Date[] = [];
    const current = new Date(startDate);
    
    while (current <= lastDay || current.getDay() !== 0) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);

  const calendarDays = generateCalendarDays();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  // Event handlers
  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventListModal(false);
    setShowEventDetailModal(true);
  }, []);

  const handleEventEdit = useCallback((event: CalendarEvent) => {
    // Close the detail modal and open edit modal
    setSelectedEvent(event);
    setShowEventDetailModal(false);
    // TODO: Open edit modal
    toast.info(locale === 'ko' ? '편집 기능 준비 중입니다' : 'Edit feature coming soon');
  }, [locale, toast]);

  const handleEventDelete = useCallback(async (event: CalendarEvent) => {
    try {
      const response = await fetch(`/api/calendar/events/${event.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      toast.success(locale === 'ko' ? '일정이 삭제되었습니다' : 'Event deleted successfully');
      setShowEventDetailModal(false);
      
      // Trigger a refresh of events
      if (onEventCreated) {
        onEventCreated();
      }
    } catch (error) {
      console.error('Delete event error:', error);
      toast.error(locale === 'ko' ? '삭제 실패' : 'Failed to delete event');
    }
  }, [locale, toast, onEventCreated]);

  const handleEventCreate = useCallback(async (eventData: any) => {
    try {
      // Prepare event data for API
      let startTime: string;
      let endTime: string;
      
      if (eventData.allDay) {
        // For all-day events, use start of day in KST (UTC+9)
        // Adding +09:00 to ensure it's interpreted as Korean time
        startTime = new Date(`${eventData.date}T00:00:00+09:00`).toISOString();
        endTime = new Date(`${eventData.date}T23:59:59+09:00`).toISOString();
      } else {
        // For timed events in KST (UTC+9)
        startTime = new Date(`${eventData.date}T${eventData.time || '09:00'}:00+09:00`).toISOString();
        endTime = new Date(`${eventData.date}T${eventData.endTime || '10:00'}:00+09:00`).toISOString();
      }
      
      const requestData = {
        title: eventData.title,
        startTime: startTime,
        endTime: endTime,
        location: eventData.location || '',
        description: eventData.description || '',
        attendees: []
      };

      // Call API to create event
      const response = await fetch('/api/calendar/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (result.success) {
        // Close modal
        setShowEventCreateModal(false);
        
        // Show success toast
        toast.success(t('dashboard.eventCreated'));
        
        // Refresh events if callback provided
        if (onEventCreated) {
          onEventCreated();
        }
      } else {
        console.error('Failed to create event:', result.error);
        toast.error(result.error || t('dashboard.eventCreationFailed'));
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error(t('dashboard.eventCreationError'));
    }
  }, [onEventCreated, toast, t]);

  return (
    <div className="relative h-full overflow-hidden flex flex-col">
      <motion.div
        drag={isDesktop ? false : "y"}
        dragConstraints={{ top: -50, bottom: 50 }}
        dragElastic={0.3}
        onDragStart={isDesktop ? undefined : handleDragStart}
        onDragEnd={isDesktop ? undefined : handleDragEnd}
        animate={controls}
        whileDrag={isDesktop ? undefined : { 
          scale: 0.98,
          transition: { duration: 0.2 }
        }}
        className={`${viewMode === 'compact' ? 'h-auto' : 'h-full'} flex flex-col relative`}
        style={{ touchAction: isDesktop ? 'auto' : 'none' }}
      >
        {/* Calendar Grid */}
        <div className={`${isDesktop ? 'px-4 py-2' : 'px-2 py-1'} flex flex-col ${viewMode === 'expanded' ? 'flex-1' : ''}`}>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
              <div
                key={day}
                className={`text-center font-medium py-1 ${
                  index === 0 ? 'text-red-400' : index === 6 ? 'text-blue-400' : 'text-gray-400'
                }`}
                style={{ fontSize: 'var(--font-xs)' }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className={`grid grid-cols-7 gap-0.5 ${viewMode === 'expanded' ? 'flex-1' : ''}`}>
            {calendarDays.map((date, index) => {
              const isToday = date.toDateString() === today.toDateString();
              const isSelected = selectedDate?.toDateString() === date.toDateString();
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const dayEvents = getEventsForDate(date);
              const dayOfWeek = date.getDay();
              const isSpotlight = spotlightEvent && 
                date.toDateString() === spotlightEvent.date.toDateString();

              return (
                <motion.button
                  key={index}
                  onClick={() => handleDateSelect(date)}
                  animate={{
                    scale: isSpotlight ? 1.15 : 1,
                    opacity: spotlightEvent ? (isSpotlight ? 1 : 0.6) : 1,
                    zIndex: isSpotlight ? 50 : 1
                  }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className={`
                    relative flex flex-col 
                    transition-all
                    ${viewMode === 'compact' ? 
                      'min-h-[50px] p-0.5 items-start justify-start' : 
                      isDesktop ? 'min-h-[100px] p-1 items-start justify-start' : 'min-h-[110px] p-1 items-start justify-start'
                    }
                    ${!isCurrentMonth ? 'opacity-30' : ''}
                    ${isSelected && viewMode === 'compact' ? 'border-2 border-purple-500 rounded-lg' : ''}
                    ${isSpotlight ? 'ring-2 ring-purple-500/30 rounded-lg' : ''}
                  `}
                  style={{
                    color: !isCurrentMonth ? 'var(--text-tertiary)' : (
                      dayOfWeek === 0 ? '#ef4444' : 
                      dayOfWeek === 6 ? '#3b82f6' : 
                      'var(--text-primary)'
                    ),
                    background: 'transparent'
                  }}
                >
                  {/* Date number */}
                  {isToday ? (
                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                      <span className="font-medium text-white" style={{ fontSize: 'var(--font-xs)' }}>
                        {date.getDate()}
                      </span>
                    </div>
                  ) : (
                    <span className="font-medium" style={{ fontSize: 'var(--font-xs)' }}>
                      {date.getDate()}
                    </span>
                  )}
                  
                  {/* Compact mode - just show underline for events */}
                  {viewMode === 'compact' && dayEvents.length > 0 && (
                    <div className="absolute bottom-2 left-0 right-0 px-2">
                      <div 
                        className="h-[3px] rounded-full"
                        style={{ 
                          background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)'
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Spotlight mode - show typing animation for new event */}
                  {isSpotlight && spotlightEvent && (
                    <motion.div 
                      className="mt-1 w-full space-y-0.5"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                    >
                      <div
                        className="leading-tight truncate px-1 py-0.5 rounded"
                        style={{
                          background: 'rgba(147, 51, 234, 0.12)',
                          color: 'var(--text-primary)',
                          fontSize: 'var(--calendar-event-text)'
                        }}
                      >
                        <span style={{ fontSize: 'var(--calendar-event-text)' }}>
                          <TypingAnimation 
                            text={spotlightEvent.title}
                            speed={30}
                          />
                        </span>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Expanded mode - show event details in calendar */}
                  {viewMode === 'expanded' && dayEvents.length > 0 && !isSpotlight && (
                    <div className="mt-1 w-full space-y-0.5">
                      {dayEvents.slice(0, 3).map((event, eventIndex) => {
                        const eventTime = event.start?.dateTime ? 
                          new Date(event.start.dateTime).toLocaleTimeString('ko-KR', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          }).replace('오전', '').replace('오후', '').trim() : '';
                        
                        return (
                          <div
                            key={eventIndex}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick(event);
                            }}
                            className="leading-tight truncate px-1 py-0.5 rounded"
                            style={{
                              background: 'rgba(147, 51, 234, 0.12)',
                              color: 'var(--text-primary)',
                              fontSize: 'var(--calendar-event-text)'
                            }}
                          >
                            {eventTime && (
                              <span className="opacity-60" style={{ fontSize: 'var(--calendar-event-time)' }}>{eventTime} </span>
                            )}
                            <span style={{ fontSize: 'var(--calendar-event-text)' }}>{event.summary}</span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-center opacity-60" style={{ fontSize: 'var(--calendar-event-text)' }}>
                          +{dayEvents.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Drag Handle Indicator */}
        {!isDesktop && (
          <div className="py-3 flex justify-center">
            <motion.div
              animate={{
                opacity: isDragging ? 0.9 : 0.3,
                scaleX: isDragging ? 1.2 : 1,
                y: isDragging ? (viewMode === 'expanded' ? -2 : 2) : 0
              }}
              transition={{
                type: "spring",
                damping: 15,
                stiffness: 200,
                duration: 0.3
              }}
              className="w-10 h-1.5 rounded-full"
              style={{ 
                background: isDragging 
                  ? 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)' 
                  : 'rgba(156, 163, 175, 0.6)'
              }}
            />
          </div>
        )}
      </motion.div>

      {/* Detail Panel for Compact Mode */}
      {viewMode === 'compact' && !isDesktop && (
        <div className="flex-1 px-4 pb-4 overflow-y-auto">
          {selectedDate ? (
            <>
              {/* Selected Date Header */}
              <div className="mb-4">
                <h3 className="font-semibold" style={{ fontSize: 'var(--font-lg)' }}>
                  {selectedDate.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', { 
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                  })}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
                  {selectedDateEvents.length > 0 
                    ? `${selectedDateEvents.length}개 일정` 
                    : '일정 없음'}
                </p>
              </div>

              {/* Event List */}
              {selectedDateEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateEvents.map((event, index) => {
                    const eventDateTime = event.start?.dateTime ? new Date(event.start.dateTime) : null;
                    const eventTime = eventDateTime?.toLocaleTimeString('ko-KR', { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    });

                    return (
                      <button
                        key={index}
                        onClick={() => handleEventClick(event)}
                        className="w-full text-left p-3 rounded-lg transition-all"
                        style={{ 
                          background: 'var(--surface-secondary)',
                          border: '1px solid var(--border-default)'
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                            <Calendar className="w-4 h-4 text-purple-500" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium" style={{ fontSize: 'var(--font-base)' }}>{event.summary || '제목 없음'}</h4>
                            {eventTime && (
                              <p className="mt-1 flex items-center gap-1" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-sm)' }}>
                                <Clock className="w-3 h-3" />
                                {eventTime}
                              </p>
                            )}
                            {event.location && (
                              <p className="mt-1 flex items-center gap-1" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-sm)' }}>
                                <MapPin className="w-3 h-3" />
                                {event.location}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="p-4 rounded-full mb-4" style={{ background: 'var(--surface-secondary)' }}>
                    <Calendar className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                  <p className="text-center mb-4" style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-base)' }}>
                    선택한 날짜에 일정이 없습니다
                  </p>
                  {onAddEvent && (
                    <button
                      onClick={() => setShowEventCreateModal(true)}
                      className="px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
                      style={{ 
                        background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                        color: 'white',
                        fontSize: 'var(--font-base)'
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      일정 추가
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-base)' }}>날짜를 선택하세요</p>
            </div>
          )}
        </div>
      )}

      {/* Event List Modal */}
      <EventListModal
        isOpen={showEventListModal}
        onClose={() => setShowEventListModal(false)}
        selectedDate={selectedDate || new Date()}
        events={events}
        onEventClick={handleEventClick}
        onAddEvent={() => {
          setShowEventListModal(false);
          setShowEventCreateModal(true);
        }}
        locale={locale}
      />

      {/* Event Detail Modal - Different View Modes */}
      {eventViewMode === 'notion' ? (
        <NotionStyleEventModal
          isOpen={showEventDetailModal}
          onClose={() => setShowEventDetailModal(false)}
          event={selectedEvent}
          onEdit={handleEventEdit}
          onDelete={handleEventDelete}
          locale={locale}
        />
      ) : eventViewMode === 'ai-report' ? (
        <AIEventReportModal
          isOpen={showEventDetailModal}
          onClose={() => setShowEventDetailModal(false)}
          event={selectedEvent}
          onEdit={handleEventEdit}
          onDelete={handleEventDelete}
          locale={locale}
        />
      ) : (
        <UnifiedEventDetailModal
          isOpen={showEventDetailModal}
          onClose={() => setShowEventDetailModal(false)}
          event={selectedEvent}
          onEdit={handleEventEdit}
          onDelete={handleEventDelete}
          locale={locale}
          onChatAboutEvent={(event) => {
            setShowEventDetailModal(false);
            onOpenAIChat?.(event);
          }}
        />
      )}

      {/* Event Create Modal */}
      <EventCreateModal
        isOpen={showEventCreateModal}
        onClose={() => setShowEventCreateModal(false)}
        selectedDate={selectedDate || new Date()}
        onCreate={handleEventCreate}
        locale={locale}
      />
    </div>
  );
}