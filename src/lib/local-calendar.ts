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
  
  // Add some demo events
  service.addEvent({
    summary: '환영합니다! Geulpi Calendar 시작하기',
    description: 'Geulpi Calendar의 주요 기능을 살펴보세요',
    start: {
      dateTime: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      timeZone: 'Asia/Seoul'
    },
    end: {
      dateTime: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
      timeZone: 'Asia/Seoul'
    },
    location: 'Online'
  });

  service.addEvent({
    summary: '팀 미팅',
    description: '주간 업무 리뷰',
    start: {
      dateTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      timeZone: 'Asia/Seoul'
    },
    end: {
      dateTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
      timeZone: 'Asia/Seoul'
    },
    location: '회의실 A'
  });
}