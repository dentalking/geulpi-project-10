'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { EventProvider, useEvents, useArtifactPanel, useCalendarView } from '@/contexts/EventContext';
import { OptimizedDayView } from './OptimizedDayView';
import { UnifiedEventModal } from './UnifiedEventModal';
import { EventsArtifactPanelWithContext } from './EventsArtifactPanelWithContext';
import { UnifiedAIInterface } from './UnifiedAIInterface';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, List, Grid3x3, Clock } from 'lucide-react';
import type { CalendarEvent } from '@/types';

// 메인 대시보드 컴포넌트
function CalendarDashboardContent() {
  const {
    events,
    selectedEvent,
    viewType,
    selectedDate,
    showEventDetail,
    isLoading,
    error,
    selectEvent,
    setViewType,
    setSelectedDate,
    toggleEventDetail,
    updateEvent,
    deleteEvent,
    addEvent,
  } = useEvents();

  const artifactPanel = useArtifactPanel();
  const calendarView = useCalendarView();
  const pathname = usePathname();

  // Extract locale from pathname
  const getLocale = () => {
    const pathSegments = pathname.split('/');
    return pathSegments[1] === 'en' ? 'en' : 'ko';
  };

  // AI 메시지 처리
  const handleAISubmit = async (text: string, imageData?: string) => {
    try {
      const locale = getLocale();
      const sessionId = `session-${Date.now()}`;

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          message: text,
          imageData,
          locale,
          sessionId,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }),
      });

      const data = await response.json();

      // AI가 이벤트를 생성/추출한 경우
      if (data.events && data.events.length > 0) {
        // 아티팩트 패널에 이벤트 표시
        artifactPanel.setEvents(data.events);
        artifactPanel.toggle(true);

        // 이벤트를 메인 캘린더에 추가
        data.events.forEach((event: CalendarEvent) => {
          addEvent(event);
        });
      }

      return data;
    } catch (error) {
      console.error('AI submission error:', error);
      return { success: false, error: 'Failed to process request' };
    }
  };

  // 이벤트 클릭 핸들러
  const handleEventClick = (event: CalendarEvent) => {
    selectEvent(event);

    // 아티팩트 패널이 열려있으면 포커스 모드로 전환
    if (artifactPanel.isOpen) {
      artifactPanel.setFocused(event);
    }
  };

  // 시간대 클릭 핸들러 (일간뷰)
  const handleTimeSlotClick = (hour: number) => {
    // 새 이벤트 생성 UI 표시
    const newEvent: Partial<CalendarEvent> = {
      start: {
        dateTime: new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          hour
        ).toISOString()
      },
      end: {
        dateTime: new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          hour + 1
        ).toISOString()
      }
    };

    // 이벤트 생성 모달 열기 또는 AI에게 요청
    console.log('Create event at', hour, ':00');
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      {/* 헤더 */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              통합 캘린더
            </h1>

            {/* 뷰 타입 선택기 */}
            <div className="flex items-center gap-2">
              {[
                { type: 'month' as const, icon: Grid3x3, label: '월간' },
                { type: 'week' as const, icon: Calendar, label: '주간' },
                { type: 'day' as const, icon: Clock, label: '일간' },
                { type: 'list' as const, icon: List, label: '목록' }
              ].map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => setViewType(type)}
                  className={`
                    px-3 py-2 rounded-lg flex items-center gap-2 transition-all
                    ${viewType === type
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>

            {/* 아티팩트 패널 토글 */}
            <button
              onClick={() => artifactPanel.toggle()}
              className={`
                px-4 py-2 rounded-lg transition-all
                ${artifactPanel.isOpen
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
            >
              아티팩트 {artifactPanel.events.length > 0 && `(${artifactPanel.events.length})`}
            </button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex h-[calc(100vh-120px)]">
        {/* 캘린더 뷰 */}
        <div className={`flex-1 p-6 transition-all ${artifactPanel.isOpen ? 'mr-[450px]' : ''}`}>
          {viewType === 'day' ? (
            <OptimizedDayView
              events={calendarView.events}
              selectedDate={calendarView.date}
              onEventClick={handleEventClick}
              onTimeSlotClick={handleTimeSlotClick}
              locale="ko"
            />
          ) : (
            <div className="h-full bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">
              <p className="text-gray-500 dark:text-gray-400">
                {viewType} 뷰 구현 필요
              </p>
            </div>
          )}
        </div>

        {/* 아티팩트 패널 */}
        <AnimatePresence>
          {artifactPanel.isOpen && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed right-0 top-0 h-full"
            >
              <EventsArtifactPanelWithContext
                locale="ko"
                title="일정 아티팩트"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI 인터페이스 (하단 고정) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 p-4 z-30">
        <div className="max-w-4xl mx-auto">
          <UnifiedAIInterface
            onSubmit={handleAISubmit}
            onEventsExtracted={(events) => {
              // 추출된 이벤트를 아티팩트 패널에 표시
              const calendarEvents: CalendarEvent[] = events.map(event => ({
                id: `extracted-${Date.now()}-${Math.random()}`,
                summary: event.title,
                description: event.description,
                location: event.location,
                start: {
                  date: event.date,
                  dateTime: event.time ? `${event.date}T${event.time}` : undefined
                },
                end: {
                  date: event.date,
                  dateTime: event.time && event.duration
                    ? new Date(new Date(`${event.date}T${event.time}`).getTime() + event.duration * 60000).toISOString()
                    : undefined
                },
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
                status: 'confirmed'
              }));
              artifactPanel.setEvents(calendarEvents);
              artifactPanel.toggle(true);
            }}
            locale="ko"
            autoFocus={false}
          />
        </div>
      </div>

      {/* 이벤트 상세 모달 */}
      <UnifiedEventModal
        isOpen={showEventDetail}
        onClose={() => toggleEventDetail(false)}
        event={selectedEvent}
        onEdit={(event) => {
          artifactPanel.setFocused(event);
          artifactPanel.setMode('edit');
          artifactPanel.toggle(true);
          toggleEventDetail(false);
        }}
        onDelete={(event) => {
          if (event.id) {
            deleteEvent(event.id);
            toggleEventDetail(false);
          }
        }}
        onChat={(event) => {
          // AI 채팅으로 이벤트 컨텍스트 전달
          console.log('Chat about event:', event);
        }}
        locale="ko"
        enableAI={true}
      />

      {/* 에러 토스트 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 로딩 오버레이 */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-700 dark:text-gray-300">로딩 중...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 메인 컴포넌트 (EventProvider로 감싸기)
export function IntegratedCalendarDashboard() {
  const [initialEvents, setInitialEvents] = React.useState<CalendarEvent[]>([]);

  // 초기 이벤트 로드
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await fetch('/api/calendar/sync');
        const data = await response.json();
        if (data.success && data.data?.events) {
          setInitialEvents(data.data.events);
        }
      } catch (error) {
        console.error('Failed to load initial events:', error);
      }
    };

    loadEvents();
  }, []);

  return (
    <EventProvider initialEvents={initialEvents} enableRealtime={true}>
      <CalendarDashboardContent />
    </EventProvider>
  );
}