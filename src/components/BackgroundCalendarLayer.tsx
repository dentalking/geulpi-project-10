'use client';

import { useEffect, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UnifiedCalendarView } from './MobileCalendarView';
import { CalendarEvent } from '@/types';

interface BackgroundCalendarLayerProps {
  events: CalendarEvent[];
  currentDate: Date;
  locale: 'ko' | 'en';
  isProcessing?: boolean;
  focusLevel?: 'background' | 'medium' | 'focus';
  highlightedEventId?: string | null;
  highlightedEventIds?: string[];
  onDateChange?: (date: Date) => void;
  onEventCreated?: () => void;
}

function BackgroundCalendarLayerComponent({
  events,
  currentDate,
  locale,
  isProcessing,
  focusLevel = 'background',
  highlightedEventId,
  highlightedEventIds = [],
  onDateChange,
  onEventCreated
}: BackgroundCalendarLayerProps) {
  // Debug: Check events data in BackgroundCalendarLayer
  useEffect(() => {
    console.log('[BackgroundCalendarLayer] Events received:', events);
    console.log('[BackgroundCalendarLayer] Events count:', events?.length || 0);
  }, [events]);

  // Memoize opacity and blur calculations
  const { opacity, blurClass } = useMemo(() => {
    const opacityValue = focusLevel === 'background' ? 0.15 :
      focusLevel === 'medium' ? 0.5 : 0.9;

    const blurClassName = focusLevel === 'background' ? 'calendar-blur-heavy' :
      focusLevel === 'medium' ? 'calendar-blur-medium' : '';

    return { opacity: opacityValue, blurClass: blurClassName };
  }, [focusLevel]);

  // Optimized transition with tween instead of spring
  const transition = useMemo(() => ({
    duration: 0.2,
    type: "tween" as const,
    ease: "easeOut" as const
  }), []);

  return (
    <AnimatePresence>
      <motion.div
        className={`absolute inset-0 gpu-accelerated ${blurClass} blur-transition`}
        initial={{ opacity: 0 }}
        animate={{
          opacity,
          scale: isProcessing ? 0.98 : 1
        }}
        exit={{ opacity: 0 }}
        transition={transition}
      >
        <div className="w-full h-full p-6 perf-optimize">
          <div className="glass rounded-xl border overflow-hidden h-full"
               style={{
                 background: 'var(--surface-primary)',
                 borderColor: 'var(--glass-border)'
               }}>
            <UnifiedCalendarView
              events={events || []}
              currentDate={currentDate}
              locale={locale}
              isDesktop={true}
              highlightedEventId={highlightedEventId || highlightedEventIds[0]}
              spotlightEvent={null}
              onEventClick={(event) => {
                // Handle event click if needed
              }}
              onDateClick={(date) => {
                onDateChange?.(date);
              }}
              onAddEvent={() => {
                // Handle add event
              }}
              onEventCreated={() => {
                onEventCreated?.();
              }}
            >
              <div />
            </UnifiedCalendarView>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Memoize component with custom comparison
export const BackgroundCalendarLayer = memo(BackgroundCalendarLayerComponent, (prevProps, nextProps) => {
  // Custom comparison for performance
  return (
    prevProps.focusLevel === nextProps.focusLevel &&
    prevProps.isProcessing === nextProps.isProcessing &&
    prevProps.currentDate?.getTime() === nextProps.currentDate?.getTime() &&
    prevProps.events?.length === nextProps.events?.length &&
    prevProps.highlightedEventId === nextProps.highlightedEventId &&
    JSON.stringify(prevProps.highlightedEventIds) === JSON.stringify(nextProps.highlightedEventIds)
  );
});