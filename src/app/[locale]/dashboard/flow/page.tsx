'use client';

import { useState } from 'react';
import { TimeFlowView } from '@/components/TimeFlowView';
import { useEvents } from '@/contexts/EventContext';
import { DayViewChatService } from '@/services/DayViewChatService';
import { useToastContext } from '@/providers/ToastProvider';
import { CalendarEvent } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Clock, Command } from 'lucide-react';

export default function TimeFlowDashboard({ params: { locale } }: { params: { locale: string } }) {
  const { events, setEvents, selectEvent } = useEvents();
  const { toast } = useToastContext();
  const chatService = DayViewChatService.getInstance();

  const [showDetail, setShowDetail] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Handle chat command
  const handleCommand = async (command: string) => {
    try {
      const parsed = chatService.parseCommand(command, {
        selectedEvent: selectedEvent || undefined,
        date: new Date()
      });

      if (!parsed) {
        toast.error('명령을 이해할 수 없습니다.');
        return;
      }

      const result = await chatService.executeCommand(parsed, events, {
        selectedEvent: selectedEvent || undefined,
        date: new Date()
      });

      if (result.success && result.updatedEvents) {
        setEvents(result.updatedEvents);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Command error:', error);
      toast.error('명령 처리 중 오류가 발생했습니다.');
    }
  };

  // Handle event selection
  const handleEventSelect = (event: CalendarEvent) => {
    setSelectedEvent(event);
    selectEvent(event);
    setShowDetail(true);
  };

  return (
    <div className="time-flow-dashboard relative h-screen overflow-hidden bg-black">
      {/* Minimalist header */}
      <motion.header
        className="absolute top-0 left-0 right-0 z-30 p-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span className="text-white/60 text-sm font-light">Time Flow</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              className="text-white/40 hover:text-white/80 transition-colors"
              onClick={() => toast.info('Press / to enter command mode')}
            >
              <Command className="w-4 h-4" />
            </button>
            <Clock className="w-4 h-4 text-white/40" />
          </div>
        </div>
      </motion.header>

      {/* Main Time Flow View */}
      <TimeFlowView
        events={events}
        onEventSelect={handleEventSelect}
        onCommand={handleCommand}
      />

      {/* Minimal Event Detail Overlay */}
      <AnimatePresence>
        {showDetail && selectedEvent && (
          <motion.div
            className="absolute inset-0 z-40 bg-black/80 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDetail(false)}
          >
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-3xl shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {selectedEvent.summary || 'Untitled'}
                </h2>

                {selectedEvent.location && (
                  <p className="text-gray-400 mb-4">📍 {selectedEvent.location}</p>
                )}

                {selectedEvent.description && (
                  <p className="text-gray-300 text-sm mb-6">
                    {selectedEvent.description}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                    onClick={() => {
                      handleCommand(`"${selectedEvent.summary}" 30분 연장`);
                      setShowDetail(false);
                    }}
                  >
                    30분 연장
                  </button>
                  <button
                    className="flex-1 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors"
                    onClick={() => {
                      handleCommand(`"${selectedEvent.summary}" 1시간 뒤로`);
                      setShowDetail(false);
                    }}
                  >
                    1시간 미루기
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating command hint */}
      <motion.div
        className="absolute bottom-8 right-8 bg-gray-900/90 backdrop-blur px-4 py-2 rounded-full"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 2 }}
      >
        <p className="text-white/60 text-xs">
          Press <kbd className="px-2 py-1 bg-gray-800 rounded mx-1">/</kbd> for commands
        </p>
      </motion.div>

      {/* Time particles background effect */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-0.5 bg-blue-400/30 rounded-full"
            initial={{
              x: `${Math.random() * 100}%`,
              y: `${Math.random() * 100}%`
            }}
            animate={{
              x: `${Math.random() * 100}%`,
              y: `${Math.random() * 100}%`
            }}
            transition={{
              duration: 20 + Math.random() * 20,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'linear'
            }}
          />
        ))}
      </div>
    </div>
  );
}