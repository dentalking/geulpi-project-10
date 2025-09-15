'use client';

import React from 'react';
import { UnifiedCalendarView } from './MobileCalendarView';
import type { CalendarEvent } from '@/types';

interface ClassicCalendarProps {
  events: CalendarEvent[];
  currentDate: Date;
  locale: 'ko' | 'en';
  highlightedEventId?: string | null;
  spotlightEvent?: { id: string; date: Date; title: string } | null;
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  onAddEvent?: () => void;
  onEventCreated?: () => void;
  isDesktop?: boolean;
}

export function ClassicCalendar({
  events,
  currentDate,
  locale,
  highlightedEventId,
  spotlightEvent,
  onEventClick,
  onDateClick,
  onAddEvent,
  onEventCreated,
  isDesktop = true
}: ClassicCalendarProps) {
  // Always show the calendar view, even if there are no events
  // Pass empty array if events is null/undefined
  const calendarEvents = events || [];

  return (
    <div className="w-full h-full backdrop-blur-xl rounded-xl border overflow-hidden"
         style={{ 
           background: 'var(--surface-primary)', 
           borderColor: 'var(--glass-border)'
         }}>
      <UnifiedCalendarView
        events={calendarEvents}
        currentDate={currentDate}
        locale={locale}
        isDesktop={isDesktop}
        highlightedEventId={highlightedEventId}
        spotlightEvent={spotlightEvent}
        onEventClick={onEventClick || (() => {})}
        onDateClick={onDateClick || (() => {})}
        onAddEvent={onAddEvent}
        onEventCreated={onEventCreated}
      >
        <div />
      </UnifiedCalendarView>
    </div>
  );
}