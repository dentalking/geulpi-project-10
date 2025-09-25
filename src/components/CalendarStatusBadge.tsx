'use client';

import { useMemo } from 'react';
import { Calendar, Star, CalendarDays, Clock } from 'lucide-react';
import { CalendarEvent } from '@/types';
import { format } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';

interface CalendarStatusBadgeProps {
  events: CalendarEvent[];
  currentDate: Date;
  locale: 'ko' | 'en';
}

export function CalendarStatusBadge({
  events,
  currentDate,
  locale
}: CalendarStatusBadgeProps) {
  const stats = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));

    // 오늘 일정 필터링
    const todayEvents = events.filter(event => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || '');
      return eventDate >= todayStart && eventDate <= todayEnd;
    });

    // 이번 주 일정 필터링
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const thisWeekEvents = events.filter(event => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || '');
      return eventDate >= weekStart && eventDate <= weekEnd;
    });

    // 이번 달 일정 필터링
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const thisMonthEvents = events.filter(event => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || '');
      return eventDate >= monthStart && eventDate <= monthEnd;
    });

    return {
      today: todayEvents.length,
      thisWeek: thisWeekEvents.length,
      thisMonth: thisMonthEvents.length,
      total: events.length
    };
  }, [events]);

  const monthName = useMemo(() => {
    return format(currentDate, locale === 'ko' ? 'M월' : 'MMMM', {
      locale: locale === 'ko' ? ko : enUS
    });
  }, [currentDate, locale]);

  const todayDate = useMemo(() => {
    return format(new Date(), locale === 'ko' ? 'M월 d일' : 'MMM d', {
      locale: locale === 'ko' ? ko : enUS
    });
  }, [locale]);

  const isToday = useMemo(() => {
    const today = new Date();
    return currentDate.toDateString() === today.toDateString();
  }, [currentDate]);

  return (
    <div className="absolute top-4 left-4 z-50 flex flex-col gap-2 pointer-events-none">
      {/* 월 전체 통계 */}
      <div className="bg-white/90 dark:bg-black/90 backdrop-blur-xl
                      rounded-full px-3 py-1.5 flex items-center gap-2
                      shadow-lg border border-white/20 w-fit">
        <CalendarDays className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-medium">
          {locale === 'ko'
            ? `${monthName}: ${stats.thisMonth}개 일정`
            : `${monthName}: ${stats.thisMonth} events`}
        </span>
        {stats.total > stats.thisMonth && (
          <span className="text-xs text-muted-foreground">
            ({locale === 'ko' ? `전체 ${stats.total}개` : `${stats.total} total`})
          </span>
        )}
      </div>

      {/* 오늘 하이라이트 */}
      <div className={`
        bg-primary/10 backdrop-blur-xl
        rounded-full px-3 py-1.5 flex items-center gap-2
        shadow-lg border-2 w-fit transition-all duration-300
        ${stats.today === 0
          ? 'border-amber-500/50 bg-amber-50/10'
          : 'border-primary/50 animate-pulse-slow'}
      `}>
        {stats.today === 0 ? (
          <Clock className="w-4 h-4 text-amber-500" />
        ) : (
          <Star className="w-4 h-4 text-primary" />
        )}
        <span className={`text-sm font-bold ${
          stats.today === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-primary'
        }`}>
          {locale === 'ko'
            ? `오늘(${todayDate}): ${stats.today}개`
            : `Today (${todayDate}): ${stats.today}`}
        </span>
      </div>

      {/* 주간 통계 (오늘 일정이 없을 때만 표시) */}
      {stats.today === 0 && stats.thisWeek > 0 && (
        <div className="bg-green-50/80 dark:bg-green-900/20 backdrop-blur-xl
                        rounded-full px-3 py-1 flex items-center gap-2
                        shadow-md border border-green-500/30 w-fit text-xs">
          <Calendar className="w-3 h-3 text-green-600 dark:text-green-400" />
          <span className="text-green-700 dark:text-green-300">
            {locale === 'ko'
              ? `이번 주: ${stats.thisWeek}개 일정`
              : `This week: ${stats.thisWeek} events`}
          </span>
        </div>
      )}
    </div>
  );
}