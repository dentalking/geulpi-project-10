// Local calendar storage for email-auth users
import type { CalendarEvent } from '@/types';

// In-memory storage for demo purposes
// In production, this should use a database
const localCalendars = new Map<string, CalendarEvent[]>();

export class LocalCalendarService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    if (!localCalendars.has(userId)) {
      localCalendars.set(userId, []);
    }
  }

  // Get all events for a user
  getEvents(): CalendarEvent[] {
    return localCalendars.get(this.userId) || [];
  }

  // Add a new event
  addEvent(event: Omit<CalendarEvent, 'id'>): CalendarEvent {
    const events = this.getEvents();
    const newEvent: CalendarEvent = {
      ...event,
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    events.push(newEvent);
    localCalendars.set(this.userId, events);
    return newEvent;
  }

  // Update an event
  updateEvent(eventId: string, updates: Partial<CalendarEvent>): CalendarEvent | null {
    const events = this.getEvents();
    const index = events.findIndex(e => e.id === eventId);
    if (index === -1) return null;
    
    events[index] = { ...events[index], ...updates };
    localCalendars.set(this.userId, events);
    return events[index];
  }

  // Delete an event
  deleteEvent(eventId: string): boolean {
    const events = this.getEvents();
    const filtered = events.filter(e => e.id !== eventId);
    if (filtered.length === events.length) return false;
    
    localCalendars.set(this.userId, filtered);
    return true;
  }

  // Get events in a date range
  getEventsByDateRange(startDate: Date, endDate: Date): CalendarEvent[] {
    return this.getEvents().filter(event => {
      const eventStartTime = event.start?.dateTime || event.start?.date;
      const eventEndTime = event.end?.dateTime || event.end?.date;
      if (!eventStartTime || !eventEndTime) return false;
      const eventStart = new Date(eventStartTime);
      const eventEnd = new Date(eventEndTime);
      return eventStart >= startDate && eventEnd <= endDate;
    });
  }

  // Search events
  searchEvents(query: string): CalendarEvent[] {
    const lowerQuery = query.toLowerCase();
    return this.getEvents().filter(event => 
      event.summary?.toLowerCase().includes(lowerQuery) ||
      event.description?.toLowerCase().includes(lowerQuery) ||
      event.location?.toLowerCase().includes(lowerQuery)
    );
  }

  // Clear all events (for testing)
  clearEvents(): void {
    localCalendars.set(this.userId, []);
  }
}

// Create some demo events for new users
export function createDemoEvents(userId: string): void {
  const service = new LocalCalendarService(userId);
  const now = new Date();
  
  // Get the start of the current month
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Add demo events spread across current and next month
  
  // Event 1: Today at 2 PM
  const today2pm = new Date(now);
  today2pm.setHours(14, 0, 0, 0);
  service.addEvent({
    summary: '오늘의 중요한 미팅',
    description: '프로젝트 진행 상황 점검',
    start: {
      dateTime: today2pm.toISOString(),
      timeZone: 'Asia/Seoul'
    },
    end: {
      dateTime: new Date(today2pm.getTime() + 60 * 60 * 1000).toISOString(),
      timeZone: 'Asia/Seoul'
    },
    location: '회의실 B'
  });
  
  // Event 2: Tomorrow at 10 AM
  const tomorrow10am = new Date(now);
  tomorrow10am.setDate(tomorrow10am.getDate() + 1);
  tomorrow10am.setHours(10, 0, 0, 0);
  service.addEvent({
    summary: '환영합니다! Geulpi Calendar 튜토리얼',
    description: 'Geulpi Calendar의 주요 기능을 살펴보세요',
    start: {
      dateTime: tomorrow10am.toISOString(),
      timeZone: 'Asia/Seoul'
    },
    end: {
      dateTime: new Date(tomorrow10am.getTime() + 60 * 60 * 1000).toISOString(),
      timeZone: 'Asia/Seoul'
    },
    location: 'Online'
  });

  // Event 3: This week Friday at 3 PM
  const friday = new Date(now);
  const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
  friday.setDate(friday.getDate() + daysUntilFriday);
  friday.setHours(15, 0, 0, 0);
  service.addEvent({
    summary: '주간 팀 미팅',
    description: '주간 업무 리뷰 및 다음 주 계획',
    start: {
      dateTime: friday.toISOString(),
      timeZone: 'Asia/Seoul'
    },
    end: {
      dateTime: new Date(friday.getTime() + 90 * 60 * 1000).toISOString(),
      timeZone: 'Asia/Seoul'
    },
    location: '회의실 A'
  });

  // Event 4: Next Monday at 9 AM
  const nextMonday = new Date(now);
  const daysUntilMonday = (1 - now.getDay() + 7) % 7 || 7;
  nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
  nextMonday.setHours(9, 0, 0, 0);
  service.addEvent({
    summary: '새로운 프로젝트 킥오프',
    description: '신규 프로젝트 시작 미팅',
    start: {
      dateTime: nextMonday.toISOString(),
      timeZone: 'Asia/Seoul'
    },
    end: {
      dateTime: new Date(nextMonday.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      timeZone: 'Asia/Seoul'
    },
    location: '대회의실'
  });

  // Event 5: Mid-month event
  const midMonth = new Date(currentMonth);
  midMonth.setDate(15);
  midMonth.setHours(14, 30, 0, 0);
  if (midMonth > now) {
    service.addEvent({
      summary: '월간 보고서 마감',
      description: '이번 달 성과 보고서 제출',
      start: {
        dateTime: midMonth.toISOString(),
        timeZone: 'Asia/Seoul'
      },
      end: {
        dateTime: new Date(midMonth.getTime() + 60 * 60 * 1000).toISOString(),
        timeZone: 'Asia/Seoul'
      },
      location: 'Online'
    });
  }

  // Event 6: End of month event
  const endMonth = new Date(currentMonth);
  endMonth.setMonth(endMonth.getMonth() + 1);
  endMonth.setDate(0); // Last day of current month
  endMonth.setHours(16, 0, 0, 0);
  if (endMonth > now) {
    service.addEvent({
      summary: '월말 정산 회의',
      description: '이번 달 결산 및 다음 달 계획',
      start: {
        dateTime: endMonth.toISOString(),
        timeZone: 'Asia/Seoul'
      },
      end: {
        dateTime: new Date(endMonth.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        timeZone: 'Asia/Seoul'
      },
      location: '회의실 C'
    });
  }

  // Event 7: Next month event
  const nextMonth5th = new Date(currentMonth);
  nextMonth5th.setMonth(nextMonth5th.getMonth() + 1);
  nextMonth5th.setDate(5);
  nextMonth5th.setHours(11, 0, 0, 0);
  service.addEvent({
    summary: '분기 계획 회의',
    description: '다음 분기 전략 수립',
    start: {
      dateTime: nextMonth5th.toISOString(),
      timeZone: 'Asia/Seoul'
    },
    end: {
      dateTime: new Date(nextMonth5th.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      timeZone: 'Asia/Seoul'
    },
    location: '본사 회의실'
  });

  // Event 8: Recurring weekly event (next 4 weeks)
  for (let i = 0; i < 4; i++) {
    const weeklyMeeting = new Date(now);
    weeklyMeeting.setDate(weeklyMeeting.getDate() + (7 * (i + 1)));
    weeklyMeeting.setHours(10, 0, 0, 0);
    weeklyMeeting.setMinutes(0);
    weeklyMeeting.setSeconds(0);
    
    service.addEvent({
      summary: '주간 스탠드업 미팅',
      description: '팀 진행상황 공유',
      start: {
        dateTime: weeklyMeeting.toISOString(),
        timeZone: 'Asia/Seoul'
      },
      end: {
        dateTime: new Date(weeklyMeeting.getTime() + 30 * 60 * 1000).toISOString(),
        timeZone: 'Asia/Seoul'
      },
      location: 'Zoom'
    });
  }
}