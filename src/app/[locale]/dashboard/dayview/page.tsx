'use client';

import { useState } from 'react';
import { SignatureDayView } from '@/components/SignatureDayView';
import { ArtifactDayView } from '@/components/ArtifactDayView';
import { EventDetailDayView } from '@/components/EventDetailDayView';
import { DayViewChatService } from '@/services/DayViewChatService';
import { useEvents } from '@/contexts/EventContext';
import { CalendarEvent } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Settings, Bell } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useToastContext } from '@/providers/ToastProvider';

interface DayViewDashboardProps {
  params: {
    locale: string;
  };
}

export default function DayViewDashboard({ params: { locale } }: DayViewDashboardProps) {
  const { events, setEvents, selectedEvent, selectEvent } = useEvents();
  const { toast } = useToastContext();
  const chatService = DayViewChatService.getInstance();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [showArtifact, setShowArtifact] = useState(true);

  // Handle chat command from SignatureDayView
  const handleChatCommand = async (command: string) => {
    try {
      const parsed = chatService.parseCommand(command, { selectedEvent: selectedEvent || undefined, date: currentDate });

      if (!parsed) {
        toast.error('명령을 이해할 수 없습니다. 다시 시도해주세요.');
        return;
      }

      const result = await chatService.executeCommand(parsed, events, { selectedEvent: selectedEvent || undefined, date: currentDate });

      if (result.success && result.updatedEvents) {
        if (result.preview) {
          // Show preview with confirmation
          // Show preview message and apply immediately
          setEvents(result.updatedEvents!);
          toast.info(`미리보기: ${result.message}`);
        } else {
          setEvents(result.updatedEvents);
          toast.success(result.message);
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Chat command error:', error);
      toast.error('명령 처리 중 오류가 발생했습니다.');
    }
  };

  // Navigate dates
  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'next' ? addDays(prev, 1) : subDays(prev, 1));
  };

  // Handle event selection
  const handleEventSelect = (event: CalendarEvent) => {
    selectEvent(event);
    setShowEventDetail(true);
  };

  // Handle date selection from artifact
  const handleDateSelectFromArtifact = (date: Date) => {
    setCurrentDate(date);
  };

  return (
    <div className="day-view-dashboard min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Geulpi Day View
              </h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateDate('prev')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <span className="font-medium">
                    {format(currentDate, 'M월 d일 EEEE', { locale: ko })}
                  </span>
                </button>
                <button
                  onClick={() => navigateDate('next')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowArtifact(!showArtifact)}
                className={`p-2 rounded-lg transition-colors ${
                  showArtifact
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Calendar className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* Artifact Panel */}
        <AnimatePresence>
          {showArtifact && (
            <motion.aside
              className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
            >
              <div className="p-4 h-full overflow-y-auto">
                <ArtifactDayView
                  locale={locale as 'ko' | 'en'}
                  onDateSelect={handleDateSelectFromArtifact}
                />

                {/* Smart Suggestions */}
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                  <h3 className="font-semibold text-sm mb-2">💡 AI 추천</h3>
                  <div className="space-y-2">
                    {chatService.generateSuggestions(events, currentDate).map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleChatCommand(suggestion)}
                        className="w-full text-left px-3 py-2 text-xs bg-white dark:bg-gray-800 rounded hover:shadow-md transition-all"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Day View */}
        <main className="flex-1 p-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SignatureDayView
              date={currentDate}
              locale={locale as 'ko' | 'en'}
              onChatCommand={handleChatCommand}
              showChatPanel={true}
            />
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            className="mt-6 grid grid-cols-4 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">
                {events.filter(e => {
                  if (!e.start) return false;
                  const eventDate = new Date(e.start.dateTime || e.start.date || '');
                  return eventDate.toDateString() === currentDate.toDateString();
                }).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">오늘 일정</div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">
                {Math.round((24 - events.filter(e => {
                  if (!e.start) return false;
                  const eventDate = new Date(e.start.dateTime || e.start.date || '');
                  return eventDate.toDateString() === currentDate.toDateString();
                }).reduce((acc, e) => {
                  if (!e.end) return acc + 1;
                  const duration = (new Date(e.end.dateTime || e.end.date || '').getTime() -
                                   new Date(e.start!.dateTime || e.start!.date || '').getTime()) / (1000 * 60 * 60);
                  return acc + duration;
                }, 0)) * 100 / 24)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">여유 시간</div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">
                {events.filter(e => e.location).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">장소 있음</div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-orange-600">
                {events.filter(e => e.attendees && e.attendees.length > 0).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">미팅</div>
            </div>
          </motion.div>
        </main>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailDayView
          event={selectedEvent}
          isOpen={showEventDetail}
          onClose={() => setShowEventDetail(false)}
          locale={locale as 'ko' | 'en'}
          onEdit={(updatedEvent) => {
            const updatedEvents = events.map(e => e.id === updatedEvent.id ? updatedEvent : e);
            setEvents(updatedEvents);
            selectEvent(updatedEvent);
          }}
          onDelete={(eventId) => {
            const updatedEvents = events.filter(e => e.id !== eventId);
            setEvents(updatedEvents);
            selectEvent(null);
          }}
        />
      )}
    </div>
  );
}