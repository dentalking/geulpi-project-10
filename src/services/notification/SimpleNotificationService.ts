/**
 * 간단하고 실용적인 Notification 서비스
 * - 복잡한 스케줄링 없음
 * - Google Calendar에 시간 알림 위임
 * - 접속 시 필요한 정보만 제공
 */

import { CalendarEvent } from '@/types';
import { format, isToday, isTomorrow, addMinutes } from 'date-fns';
import { ko } from 'date-fns/locale';

export interface TodayBrief {
  date: Date;
  eventCount: number;
  firstEventTime?: Date;
  lastEventTime?: Date;
  busyHours: number;
  freeSlots: TimeSlot[];
}

export interface TimeSlot {
  start: Date;
  end: Date;
  duration: number; // minutes
}

export interface ConflictAlert {
  event1: Partial<CalendarEvent>;
  event2: Partial<CalendarEvent>;
  type: 'overlap' | 'back-to-back' | 'too-many';
  suggestion?: string;
}

export interface AISuggestion {
  id: string;
  type: 'schedule' | 'optimize' | 'reminder';
  message: string;
  action?: () => void;
}

export interface LoginNotifications {
  brief?: TodayBrief;
  conflicts: ConflictAlert[];
  suggestions: AISuggestion[];
  friendUpdates: string[];
}

export class SimpleNotificationService {
  /**
   * 로그인/대시보드 접속 시 한 번 호출
   */
  async getLoginNotifications(
    userId: string,
    events: CalendarEvent[]
  ): Promise<LoginNotifications> {
    const todayEvents = this.filterTodayEvents(events);

    return {
      brief: this.generateTodayBrief(todayEvents),
      conflicts: await this.detectConflicts(events),
      suggestions: await this.getAISuggestions(userId, events),
      friendUpdates: await this.getFriendUpdates(userId)
    };
  }

  /**
   * 오늘의 브리핑 생성
   */
  private generateTodayBrief(events: CalendarEvent[]): TodayBrief | undefined {
    if (events.length === 0) return undefined;

    const sortedEvents = [...events].sort((a, b) => {
      const aTime = new Date(a.start?.dateTime || a.start?.date || '');
      const bTime = new Date(b.start?.dateTime || b.start?.date || '');
      return aTime.getTime() - bTime.getTime();
    });

    const firstEvent = sortedEvents[0];
    const lastEvent = sortedEvents[sortedEvents.length - 1];

    const busyHours = events.reduce((total, event) => {
      if (!event.start?.dateTime || !event.end?.dateTime) return total;
      const duration = new Date(event.end.dateTime).getTime() -
                       new Date(event.start.dateTime).getTime();
      return total + (duration / (1000 * 60 * 60));
    }, 0);

    return {
      date: new Date(),
      eventCount: events.length,
      firstEventTime: firstEvent.start?.dateTime
        ? new Date(firstEvent.start.dateTime)
        : undefined,
      lastEventTime: lastEvent.end?.dateTime
        ? new Date(lastEvent.end.dateTime)
        : undefined,
      busyHours: Math.round(busyHours * 10) / 10,
      freeSlots: this.findFreeSlots(sortedEvents)
    };
  }

  /**
   * 충돌 감지 (우리만의 가치)
   */
  private async detectConflicts(events: CalendarEvent[]): Promise<ConflictAlert[]> {
    const conflicts: ConflictAlert[] = [];
    // 오늘 일정만 필터링하여 충돌 검사
    const todayEvents = this.filterTodayEvents(events);
    const sortedEvents = this.sortEventsByTime(todayEvents);

    // 시간 겹침 체크
    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const current = sortedEvents[i];
      const next = sortedEvents[i + 1];

      if (!current.end?.dateTime || !next.start?.dateTime) continue;

      const currentEnd = new Date(current.end.dateTime);
      const nextStart = new Date(next.start.dateTime);

      // 겹침
      if (currentEnd > nextStart) {
        conflicts.push({
          event1: {
            id: current.id,
            summary: current.summary,
            start: current.start,
            end: current.end
          },
          event2: {
            id: next.id,
            summary: next.summary,
            start: next.start,
            end: next.end
          },
          type: 'overlap',
          suggestion: '일정을 조정하거나 하나를 취소하세요'
        });
      }
      // 너무 촘촘함 (5분 이내)
      else if (nextStart.getTime() - currentEnd.getTime() < 5 * 60 * 1000) {
        conflicts.push({
          event1: {
            id: current.id,
            summary: current.summary
          },
          event2: {
            id: next.id,
            summary: next.summary
          },
          type: 'back-to-back',
          suggestion: '이동 시간을 고려해 여유를 두세요'
        });
      }
    }

    // 오늘 일정이 너무 많음
    if (todayEvents.length > 6) {
      conflicts.push({
        event1: { summary: `오늘 일정` },
        event2: { summary: `${todayEvents.length}개` },
        type: 'too-many',
        suggestion: '오늘 너무 많은 일정이 있습니다. 우선순위를 정해보세요.'
      });
    }

    return conflicts.slice(0, 3); // 최대 3개만 표시
  }

  /**
   * AI 제안 (캐시 우선)
   */
  private async getAISuggestions(
    userId: string,
    events: CalendarEvent[]
  ): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];

    // 1. 오늘 일정이 없으면
    const todayEvents = this.filterTodayEvents(events);
    if (todayEvents.length === 0) {
      suggestions.push({
        id: 'no-events',
        type: 'reminder',
        message: '오늘은 일정이 없네요. 중요한 일을 잊지 않으셨나요?'
      });
    }

    // 2. 점심시간 비어있으면
    const lunchSlot = this.findLunchTimeSlot(todayEvents);
    if (lunchSlot && lunchSlot.duration >= 30) {
      suggestions.push({
        id: 'lunch-time',
        type: 'optimize',
        message: `${format(lunchSlot.start, 'HH:mm')}에 점심 시간이 있네요!`
      });
    }

    // 3. 연속 회의가 많으면
    const meetingCount = events.filter(e =>
      e.summary?.toLowerCase().includes('meeting') ||
      e.summary?.includes('회의')
    ).length;

    if (meetingCount >= 3) {
      suggestions.push({
        id: 'too-many-meetings',
        type: 'optimize',
        message: '오늘 회의가 많네요. 중간에 휴식 시간을 가지세요.'
      });
    }

    return suggestions.slice(0, 2); // 최대 2개
  }

  /**
   * 친구 업데이트 (간단하게)
   */
  private async getFriendUpdates(userId: string): Promise<string[]> {
    // Supabase에서 간단히 조회
    try {
      const updates = [];

      // 예시: 실제로는 DB 조회
      // const { data } = await supabase
      //   .from('friend_activities')
      //   .select('*')
      //   .eq('recipient_id', userId)
      //   .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000))
      //   .limit(3);

      return updates;
    } catch {
      return [];
    }
  }

  /**
   * 헬퍼 함수들
   */
  private filterTodayEvents(events: CalendarEvent[]): CalendarEvent[] {
    return events.filter(event => {
      const eventDate = event.start?.dateTime || event.start?.date;
      return eventDate && isToday(new Date(eventDate));
    });
  }

  private sortEventsByTime(events: CalendarEvent[]): CalendarEvent[] {
    return [...events].sort((a, b) => {
      const aTime = new Date(a.start?.dateTime || a.start?.date || '').getTime();
      const bTime = new Date(b.start?.dateTime || b.start?.date || '').getTime();
      return aTime - bTime;
    });
  }

  private findFreeSlots(events: CalendarEvent[]): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const workStart = new Date();
    workStart.setHours(9, 0, 0, 0);
    const workEnd = new Date();
    workEnd.setHours(18, 0, 0, 0);

    let lastEnd = workStart;

    for (const event of events) {
      if (!event.start?.dateTime) continue;

      const eventStart = new Date(event.start.dateTime);
      const gap = eventStart.getTime() - lastEnd.getTime();

      if (gap > 30 * 60 * 1000) { // 30분 이상 빈 시간
        slots.push({
          start: lastEnd,
          end: eventStart,
          duration: gap / (1000 * 60)
        });
      }

      if (event.end?.dateTime) {
        lastEnd = new Date(event.end.dateTime);
      }
    }

    // 마지막 일정 후 빈 시간
    if (lastEnd < workEnd) {
      const gap = workEnd.getTime() - lastEnd.getTime();
      if (gap > 30 * 60 * 1000) {
        slots.push({
          start: lastEnd,
          end: workEnd,
          duration: gap / (1000 * 60)
        });
      }
    }

    return slots;
  }

  private findLunchTimeSlot(events: CalendarEvent[]): TimeSlot | null {
    const lunchStart = new Date();
    lunchStart.setHours(11, 30, 0, 0);
    const lunchEnd = new Date();
    lunchEnd.setHours(13, 30, 0, 0);

    const freeSlots = this.findFreeSlots(events);

    return freeSlots.find(slot =>
      slot.start <= lunchStart && slot.end >= lunchEnd
    ) || null;
  }

  private groupEventsByDay(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
    const grouped: Record<string, CalendarEvent[]> = {};

    events.forEach(event => {
      const date = event.start?.dateTime || event.start?.date;
      if (!date) return;

      const day = format(new Date(date), 'yyyy-MM-dd');
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(event);
    });

    return grouped;
  }
}

export default SimpleNotificationService;