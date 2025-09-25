'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useAnimation, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { CalendarEvent } from '@/types';
import { format, addHours, subHours, differenceInMinutes, isWithinInterval } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TimeFlowViewProps {
  events: CalendarEvent[];
  onEventSelect?: (event: CalendarEvent) => void;
  onCommand?: (command: string) => void;
}

interface TimeBlock {
  hour: number;
  minute: number;
  event?: CalendarEvent;
  isPast: boolean;
  isNow: boolean;
  isFuture: boolean;
  opacity: number;
  scale: number;
}

export function TimeFlowView({ events, onEventSelect, onCommand }: TimeFlowViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [focusHours] = useState(2); // ±2 hours from now
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const y = useMotionValue(0);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Calculate time blocks with focus effect
  const timeBlocks: TimeBlock[] = React.useMemo(() => {
    const blocks: TimeBlock[] = [];
    const now = currentTime;
    const startTime = subHours(now, focusHours);
    const endTime = addHours(now, focusHours);

    // Generate 30-minute blocks
    for (let h = -focusHours; h <= focusHours; h++) {
      for (let m = 0; m < 60; m += 30) {
        const blockTime = addHours(now, h);
        blockTime.setMinutes(m);

        // Calculate distance from now for opacity/scale
        const minutesFromNow = Math.abs(differenceInMinutes(blockTime, now));
        const maxMinutes = focusHours * 60;
        const distance = minutesFromNow / maxMinutes;

        // Find event in this time slot
        const blockEvent = events.find(event => {
          if (!event.start) return false;
          const eventStart = new Date(event.start.dateTime || event.start.date || '');
          return (
            eventStart.getHours() === blockTime.getHours() &&
            Math.floor(eventStart.getMinutes() / 30) === Math.floor(m / 30)
          );
        });

        blocks.push({
          hour: blockTime.getHours(),
          minute: m,
          event: blockEvent,
          isPast: blockTime < now,
          isNow: Math.abs(differenceInMinutes(blockTime, now)) < 30,
          isFuture: blockTime > now,
          opacity: 1 - distance * 0.5, // Fade based on distance
          scale: 1 - distance * 0.3    // Scale based on distance
        });
      }
    }

    return blocks;
  }, [currentTime, focusHours, events]);

  // Handle swipe gestures
  const handleDrag = useCallback((event: any, info: PanInfo) => {
    // Vertical swipe to navigate time
    if (Math.abs(info.offset.y) > 50) {
      const direction = info.offset.y > 0 ? -1 : 1;
      setCurrentTime(prev => addHours(prev, direction));
    }
  }, []);

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' && onCommand) {
        e.preventDefault();
        const command = prompt('명령을 입력하세요:');
        if (command) onCommand(command);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [onCommand]);

  return (
    <div className="time-flow-container relative h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Background time effect */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/20 to-transparent animate-pulse" />
      </div>

      {/* Current time indicator */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/30 to-transparent h-24 -top-12" />
          <div className="flex items-center justify-center">
            <div className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
              NOW · {format(currentTime, 'HH:mm')}
            </div>
          </div>
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-red-500"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </div>

      {/* Time blocks */}
      <motion.div
        ref={containerRef}
        className="relative h-full flex flex-col justify-center items-center py-20"
        drag="y"
        dragConstraints={{ top: -200, bottom: 200 }}
        dragElastic={0.2}
        onDrag={handleDrag}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
        animate={controls}
        style={{ y }}
      >
        {timeBlocks.map((block, index) => {
          const isCurrentBlock = block.isNow;
          const blockKey = `${block.hour}-${block.minute}`;

          return (
            <motion.div
              key={blockKey}
              className="relative w-full max-w-md px-4 my-1"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: block.opacity,
                scale: block.scale,
                y: 0
              }}
              transition={{ duration: 0.5, delay: index * 0.02 }}
            >
              {/* Time label */}
              <div
                className={`absolute -left-20 top-1/2 -translate-y-1/2 text-sm font-mono ${
                  isCurrentBlock ? 'text-white font-bold' : 'text-gray-500'
                }`}
                style={{ opacity: block.opacity }}
              >
                {format(new Date().setHours(block.hour, block.minute), 'HH:mm')}
              </div>

              {/* Event block or empty slot */}
              {block.event ? (
                <motion.div
                  className={`relative p-4 rounded-2xl cursor-pointer transition-all ${
                    isCurrentBlock
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-2xl'
                      : block.isPast
                      ? 'bg-gray-800/50 text-gray-400'
                      : 'bg-gray-700/50 text-gray-200 hover:bg-gray-600/50'
                  }`}
                  whileHover={{ scale: 1.02, x: 10 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onEventSelect?.(block.event!)}
                  layoutId={`event-${block.event.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`font-semibold ${isCurrentBlock ? 'text-lg' : 'text-sm'}`}>
                        {block.event.summary || 'Untitled'}
                      </h3>
                      {block.event.location && (
                        <p className="text-xs opacity-80 mt-1">📍 {block.event.location}</p>
                      )}
                    </div>
                    {isCurrentBlock && (
                      <motion.div
                        className="w-3 h-3 bg-white rounded-full"
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </div>

                  {/* Duration bar */}
                  {block.event.end && (
                    <div className="mt-2 h-1 bg-black/20 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-white/40"
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1, delay: 0.2 }}
                      />
                    </div>
                  )}
                </motion.div>
              ) : (
                <div
                  className={`relative h-12 rounded-xl border ${
                    isCurrentBlock
                      ? 'border-gray-600 bg-gray-800/30'
                      : 'border-gray-800 bg-transparent'
                  }`}
                  style={{ opacity: block.opacity * 0.3 }}
                >
                  {/* Empty slot hint */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-gray-600 text-xs">
                      {block.isPast ? '' : '·'}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Gesture hints */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-500 text-xs">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="text-center"
        >
          <p>↕ 스와이프로 시간 이동</p>
          <p className="mt-1">/ 키로 명령 입력</p>
        </motion.div>
      </div>

      {/* Time flow effect */}
      <svg className="absolute inset-0 pointer-events-none opacity-20" width="100%" height="100%">
        <defs>
          <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="rgba(59, 130, 246, 0.3)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <motion.rect
          width="100%"
          height="200"
          fill="url(#flow-gradient)"
          y={useTransform(y, [-200, 200], [0, 600])}
        />
      </svg>

      {/* Floating time particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-blue-400 rounded-full"
          initial={{
            x: Math.random() * 1000,
            y: -10
          }}
          animate={{
            y: 800,
            x: Math.random() * 1000
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            repeat: Infinity,
            delay: i * 2,
            ease: 'linear'
          }}
        />
      ))}
    </div>
  );
}