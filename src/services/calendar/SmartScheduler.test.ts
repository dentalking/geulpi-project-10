import { describe, it, expect, beforeEach } from 'vitest';
import { SmartScheduler } from './SmartScheduler';
import type { 
  CalendarEvent, 
  SchedulingConstraint, 
  UserContext,
  ConflictInfo 
} from '@/types';

describe('SmartScheduler', () => {
  let smartScheduler: SmartScheduler;
  let mockUserContext: UserContext;
  
  beforeEach(() => {
    smartScheduler = new SmartScheduler();
    mockUserContext = {
      userId: 'test-user',
      currentTime: new Date('2024-01-15T09:00:00Z'),
      timeZone: 'Asia/Seoul',
      preferences: {
        workingHours: { start: 9, end: 18 },
        briefingTime: '08:00',
        language: 'ko',
        defaultDuration: 60,
        reminderMinutes: 15
      },
      recentEvents: [],
      patterns: {
        frequentLocations: ['강남', '판교'],
        commonMeetingTimes: ['10:00', '14:00'],
        regularAttendees: [],
        preferredDurations: new Map(),
        eventTypePatterns: new Map()
      }
    };
  });

  describe('detectConflicts', () => {
    it('should detect overlapping events', () => {
      const newEvent: CalendarEvent = {
        id: 'new',
        summary: 'New Meeting',
        start: { dateTime: '2024-01-15T10:00:00Z' },
        end: { dateTime: '2024-01-15T11:00:00Z' }
      };

      const existingEvents: CalendarEvent[] = [
        {
          id: 'existing',
          summary: 'Existing Meeting',
          start: { dateTime: '2024-01-15T10:30:00Z' },
          end: { dateTime: '2024-01-15T11:30:00Z' }
        }
      ];

      const conflicts = smartScheduler.detectConflicts(newEvent, existingEvents);
      
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictType).toBe('overlap');
      expect(conflicts[0].severity).toBe('high');
    });

    it('should detect buffer time conflicts', () => {
      const newEvent: CalendarEvent = {
        id: 'new',
        summary: 'New Meeting',
        start: { dateTime: '2024-01-15T11:00:00Z' },
        end: { dateTime: '2024-01-15T12:00:00Z' }
      };

      const existingEvents: CalendarEvent[] = [
        {
          id: 'existing',
          summary: 'Existing Meeting',
          start: { dateTime: '2024-01-15T10:00:00Z' },
          end: { dateTime: '2024-01-15T10:50:00Z' }
        }
      ];

      const conflicts = smartScheduler.detectConflicts(newEvent, existingEvents);
      
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictType).toBe('buffer');
      expect(conflicts[0].severity).toBe('medium');
    });

    it('should return empty array when no conflicts', () => {
      const newEvent: CalendarEvent = {
        id: 'new',
        summary: 'New Meeting',
        start: { dateTime: '2024-01-15T14:00:00Z' },
        end: { dateTime: '2024-01-15T15:00:00Z' }
      };

      const existingEvents: CalendarEvent[] = [
        {
          id: 'existing',
          summary: 'Morning Meeting',
          start: { dateTime: '2024-01-15T10:00:00Z' },
          end: { dateTime: '2024-01-15T11:00:00Z' }
        }
      ];

      const conflicts = smartScheduler.detectConflicts(newEvent, existingEvents);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('findOptimalTime', () => {
    it('should find available time slots', async () => {
      const constraint: SchedulingConstraint = {
        duration: 60,
        preferredTimeRanges: [
          {
            start: new Date('2024-01-16T09:00:00Z'),
            end: new Date('2024-01-16T12:00:00Z')
          }
        ]
      };

      const existingEvents: CalendarEvent[] = [
        {
          id: '1',
          summary: 'Blocked Time',
          start: { dateTime: '2024-01-16T10:00:00Z' },
          end: { dateTime: '2024-01-16T11:00:00Z' }
        }
      ];

      const suggestions = await smartScheduler.findOptimalTime(
        constraint,
        existingEvents,
        mockUserContext
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].score).toBeGreaterThan(0);
      expect(suggestions[0].reasoning).toBeDefined();
    });

    it('should respect working hours', async () => {
      const constraint: SchedulingConstraint = {
        duration: 60
      };

      const suggestions = await smartScheduler.findOptimalTime(
        constraint,
        [],
        mockUserContext
      );

      suggestions.forEach(suggestion => {
        const startHour = new Date(suggestion.slot.startTime).getHours();
        const endHour = new Date(suggestion.slot.endTime).getHours();
        
        expect(startHour).toBeGreaterThanOrEqual(9);
        expect(endHour).toBeLessThanOrEqual(18);
      });
    });

    it('should consider buffer times', async () => {
      const constraint: SchedulingConstraint = {
        duration: 60,
        buffer: {
          before: 15,
          after: 15
        }
      };

      const existingEvents: CalendarEvent[] = [
        {
          id: '1',
          summary: 'Meeting 1',
          start: { dateTime: '2024-01-16T09:00:00Z' },
          end: { dateTime: '2024-01-16T10:00:00Z' }
        }
      ];

      const suggestions = await smartScheduler.findOptimalTime(
        constraint,
        existingEvents,
        mockUserContext
      );

      // 버퍼를 고려한 점수가 반영되었는지 확인
      const suggestionsWithBuffer = suggestions.filter(s => 
        s.reasoning.includes('여유 시간')
      );
      expect(suggestionsWithBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('calculateTravelTime', () => {
    it('should calculate travel time between known locations', async () => {
      const time = await smartScheduler.calculateTravelTime('강남', '판교');
      expect(time).toBe(30);
    });

    it('should return 0 for same location', async () => {
      const time = await smartScheduler.calculateTravelTime('강남', '강남');
      expect(time).toBe(0);
    });

    it('should return default time for unknown locations', async () => {
      const time = await smartScheduler.calculateTravelTime('서울', '부산');
      expect(time).toBe(20);
    });

    it('should handle undefined locations', async () => {
      const time = await smartScheduler.calculateTravelTime(undefined, undefined);
      expect(time).toBe(0);
    });
  });

  describe('suggestReschedule', () => {
    it('should suggest alternative times for conflicts', async () => {
      const conflict: ConflictInfo = {
        eventId: 'conflict-1',
        eventTitle: 'Conflicting Meeting',
        conflictType: 'overlap',
        severity: 'high'
      };

      const constraint: SchedulingConstraint = {
        duration: 60
      };

      const existingEvents: CalendarEvent[] = [
        {
          id: 'conflict-1',
          summary: 'Conflicting Meeting',
          start: { dateTime: '2024-01-16T10:00:00Z' },
          end: { dateTime: '2024-01-16T11:00:00Z' }
        }
      ];

      const suggestions = await smartScheduler.suggestReschedule(
        conflict,
        constraint,
        existingEvents,
        mockUserContext
      );

      expect(suggestions.length).toBeGreaterThan(0);
      suggestions.forEach(s => {
        expect(s.reasoning).toContain('충돌을 피하기 위한');
      });
    });
  });

  describe('findCommonSlots', () => {
    it('should find common available slots for multiple participants', async () => {
      const participants = ['user1', 'user2'];
      const duration = 60;
      
      const participantEvents = new Map<string, CalendarEvent[]>();
      participantEvents.set('user1', [
        {
          id: '1',
          summary: 'User1 Meeting',
          start: { dateTime: '2024-01-16T10:00:00Z' },
          end: { dateTime: '2024-01-16T11:00:00Z' }
        }
      ]);
      participantEvents.set('user2', [
        {
          id: '2',
          summary: 'User2 Meeting',
          start: { dateTime: '2024-01-16T14:00:00Z' },
          end: { dateTime: '2024-01-16T15:00:00Z' }
        }
      ]);

      const commonSlots = await smartScheduler.findCommonSlots(
        participants,
        duration,
        participantEvents
      );

      expect(commonSlots.length).toBeGreaterThan(0);
      
      // 찾은 슬롯들이 모든 참가자의 일정과 충돌하지 않는지 확인
      commonSlots.forEach(slot => {
        const slotStart = new Date(slot.startTime);
        const slotEnd = new Date(slot.endTime);
        
        participants.forEach(participant => {
          const events = participantEvents.get(participant) || [];
          events.forEach(event => {
            const eventStart = new Date(event.start?.dateTime || '');
            const eventEnd = new Date(event.end?.dateTime || '');
            
            // 겹치지 않아야 함
            const overlaps = (slotStart < eventEnd && slotEnd > eventStart);
            expect(overlaps).toBe(false);
          });
        });
      });
    });

    it('should exclude weekends from common slots', async () => {
      const participants = ['user1'];
      const duration = 60;
      const participantEvents = new Map<string, CalendarEvent[]>();
      participantEvents.set('user1', []);

      const commonSlots = await smartScheduler.findCommonSlots(
        participants,
        duration,
        participantEvents
      );

      commonSlots.forEach(slot => {
        const date = new Date(slot.startTime);
        const dayOfWeek = date.getDay();
        expect(dayOfWeek).not.toBe(0); // Sunday
        expect(dayOfWeek).not.toBe(6); // Saturday
      });
    });
  });
});