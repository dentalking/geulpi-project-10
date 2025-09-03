import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationManager } from './NotificationManager';
import { CalendarEvent, UserContext } from '@/types';
import { addMinutes } from 'date-fns';

describe('NotificationManager', () => {
  let manager: NotificationManager;
  let mockContext: UserContext;

  beforeEach(() => {
    manager = new NotificationManager();
    mockContext = {
      userId: 'test-user',
      currentTime: new Date(),
      timeZone: 'Asia/Seoul',
      preferences: {
        workingHours: { start: 9, end: 18 },
        briefingTime: '08:30',
        language: 'ko',
        defaultDuration: 60,
        reminderMinutes: 15
      },
      recentEvents: [],
      patterns: {
        frequentLocations: [],
        commonMeetingTimes: [],
        regularAttendees: [],
        preferredDurations: new Map(),
        eventTypePatterns: new Map()
      }
    };
  });

  describe('createSmartNotifications', () => {
    it('이벤트 15분 전 리마인더 알림을 생성해야 함', async () => {
      const now = new Date();
      const eventTime = addMinutes(now, 10);
      
      const events: CalendarEvent[] = [
        {
          id: 'event-1',
          summary: '팀 회의',
          start: { dateTime: eventTime.toISOString() },
          end: { dateTime: addMinutes(eventTime, 60).toISOString() }
        }
      ];

      const notifications = await manager.createSmartNotifications(events, mockContext);
      
      const reminderNotif = notifications.find(n => n.type === 'reminder');
      expect(reminderNotif).toBeDefined();
      expect(reminderNotif?.title).toBe('일정 알림');
      expect(reminderNotif?.priority).toBe('high');
    });

    it('위치가 있는 이벤트에 대해 출발 알림을 생성해야 함', async () => {
      const now = new Date();
      const eventTime = addMinutes(now, 60);
      
      const events: CalendarEvent[] = [
        {
          id: 'event-2',
          summary: '외부 미팅',
          location: '온라인 회의',
          start: { dateTime: eventTime.toISOString() },
          end: { dateTime: addMinutes(eventTime, 60).toISOString() }
        }
      ];

      const notifications = await manager.createSmartNotifications(events, mockContext);
      
      const travelNotif = notifications.find(n => n.type === 'alert' && n.title === '출발 시간');
      expect(travelNotif).toBeDefined();
      expect(travelNotif?.priority).toBe('urgent');
    });

    it('회의에 대해 준비 알림을 생성해야 함', async () => {
      const now = new Date();
      const eventTime = addMinutes(now, 50);
      
      const events: CalendarEvent[] = [
        {
          id: 'event-3',
          summary: '프로젝트 회의',
          attendees: [
            { email: 'user1@example.com' },
            { email: 'user2@example.com' }
          ],
          start: { dateTime: eventTime.toISOString() },
          end: { dateTime: addMinutes(eventTime, 60).toISOString() }
        }
      ];

      const notifications = await manager.createSmartNotifications(events, mockContext);
      
      const prepNotif = notifications.find(n => n.type === 'suggestion' && n.title === '회의 준비');
      expect(prepNotif).toBeDefined();
      expect(prepNotif?.priority).toBe('medium');
    });

    it('일정 충돌을 감지하고 알림을 생성해야 함', async () => {
      const now = new Date();
      const eventTime = addMinutes(now, 30);
      
      const events: CalendarEvent[] = [
        {
          id: 'event-4',
          summary: '회의 A',
          start: { dateTime: eventTime.toISOString() },
          end: { dateTime: addMinutes(eventTime, 60).toISOString() }
        },
        {
          id: 'event-5',
          summary: '회의 B',
          start: { dateTime: addMinutes(eventTime, 30).toISOString() },
          end: { dateTime: addMinutes(eventTime, 90).toISOString() }
        }
      ];

      const notifications = await manager.createSmartNotifications(events, mockContext);
      
      const conflictNotif = notifications.find(n => n.type === 'conflict');
      expect(conflictNotif).toBeDefined();
      expect(conflictNotif?.priority).toBe('urgent');
      expect(conflictNotif?.title).toBe('일정 충돌 감지');
    });
  });

  describe('scheduleNotification', () => {
    it('미래 시간에 예약된 알림을 스케줄링해야 함', async () => {
      const futureTime = addMinutes(new Date(), 5);
      const notification = {
        id: 'test-notif',
        type: 'reminder' as const,
        priority: 'medium' as const,
        title: '테스트 알림',
        message: '테스트 메시지',
        scheduledFor: futureTime
      };

      vi.spyOn(global, 'setTimeout');
      await manager.scheduleNotification(notification);
      
      expect(setTimeout).toHaveBeenCalled();
    });

    it('과거 시간의 알림은 스케줄링하지 않아야 함', async () => {
      const pastTime = addMinutes(new Date(), -5);
      const notification = {
        id: 'test-notif',
        type: 'reminder' as const,
        priority: 'medium' as const,
        title: '테스트 알림',
        message: '테스트 메시지',
        scheduledFor: pastTime
      };

      vi.spyOn(global, 'setTimeout');
      await manager.scheduleNotification(notification);
      
      expect(setTimeout).not.toHaveBeenCalled();
    });
  });

  describe('cancelNotification', () => {
    it('스케줄된 알림을 취소해야 함', async () => {
      const futureTime = addMinutes(new Date(), 5);
      const notification = {
        id: 'cancel-test',
        type: 'reminder' as const,
        priority: 'medium' as const,
        title: '취소 테스트',
        message: '취소될 메시지',
        scheduledFor: futureTime
      };

      await manager.scheduleNotification(notification);
      const activeNotifs = manager.getActiveNotifications();
      expect(activeNotifs).toHaveLength(1);

      manager.cancelNotification('cancel-test');
      const afterCancel = manager.getActiveNotifications();
      expect(afterCancel).toHaveLength(0);
    });
  });

  describe('clearExpiredNotifications', () => {
    it('만료된 알림을 정리해야 함', async () => {
      const pastTime = addMinutes(new Date(), -5);
      const futureTime = addMinutes(new Date(), 5);

      const expiredNotif = {
        id: 'expired',
        type: 'reminder' as const,
        priority: 'low' as const,
        title: '만료된 알림',
        message: '만료됨',
        expiresAt: pastTime
      };

      const validNotif = {
        id: 'valid',
        type: 'reminder' as const,
        priority: 'low' as const,
        title: '유효한 알림',
        message: '유효함',
        expiresAt: futureTime
      };

      await manager.scheduleNotification(expiredNotif);
      await manager.scheduleNotification(validNotif);

      manager.clearExpiredNotifications();
      
      const remaining = manager.getActiveNotifications();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('valid');
    });
  });
});