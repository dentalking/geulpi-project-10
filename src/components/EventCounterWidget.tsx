'use client';

import { useMemo } from 'react';
import { CalendarEvent } from '@/types';

interface EventCounterWidgetProps {
  events: CalendarEvent[];
  locale: 'ko' | 'en';
}

export function EventCounterWidget({ events, locale }: EventCounterWidgetProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Filter events by date range
    const todayEvents = events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= todayStart && eventDate <= todayEnd;
    });

    const thisWeekEvents = events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= weekStart && eventDate <= weekEnd;
    });

    const thisMonthEvents = events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= monthStart && eventDate <= monthEnd;
    });

    return {
      today: todayEvents.length,
      thisWeek: thisWeekEvents.length,
      thisMonth: thisMonthEvents.length,
      total: events.length
    };
  }, [events]);

  return (
    <div className="fixed bottom-20 right-4 z-40 pointer-events-none">
      <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl
                      rounded-2xl shadow-2xl border border-white/20 p-3
                      pointer-events-auto">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-muted-foreground">
              {locale === 'ko' ? '오늘' : 'Today'}:
            </span>
            <span className="font-semibold">
              {stats.today}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-muted-foreground">
              {locale === 'ko' ? '이번 주' : 'Week'}:
            </span>
            <span className="font-semibold">
              {stats.thisWeek}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-purple-500 rounded-full" />
            <span className="text-muted-foreground">
              {locale === 'ko' ? '이번 달' : 'Month'}:
            </span>
            <span className="font-semibold">
              {stats.thisMonth}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-gray-500 rounded-full" />
            <span className="text-muted-foreground">
              {locale === 'ko' ? '전체' : 'Total'}:
            </span>
            <span className="font-semibold">
              {stats.total}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}