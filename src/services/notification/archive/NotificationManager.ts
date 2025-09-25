import { CalendarEvent, ProactiveNotification, NotificationType, UserContext } from '@/types';
import { differenceInMinutes, addMinutes, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export class NotificationManager {
  private notifications: Map<string, ProactiveNotification> = new Map();
  private scheduledTimers: Map<string, NodeJS.Timeout> = new Map();

  async createSmartNotifications(
    events: CalendarEvent[],
    context: UserContext
  ): Promise<ProactiveNotification[]> {
    const notifications: ProactiveNotification[] = [];

    for (const event of events) {
      if (event.start?.dateTime) {
        const eventTime = new Date(event.start.dateTime);
        const now = new Date();

        // 이벤트 15분 전 알림
        const reminderNotif = this.createReminderNotification(event, eventTime, now);
        if (reminderNotif) notifications.push(reminderNotif);

        // 이동 시간 고려한 출발 알림
        const travelNotif = this.createTravelNotification(event, eventTime, now);
        if (travelNotif) notifications.push(travelNotif);

        // 회의 준비 알림
        if (this.isMeeting(event)) {
          const prepNotif = this.createPreparationNotification(event, eventTime, now);
          if (prepNotif) notifications.push(prepNotif);
        }
      }
    }

    // 일일 브리핑 알림
    const briefingNotif = this.createDailyBriefingNotification(events, context);
    if (briefingNotif) notifications.push(briefingNotif);

    // 일정 충돌 알림
    const conflictNotifs = this.detectAndNotifyConflicts(events);
    notifications.push(...conflictNotifs);

    return notifications;
  }

  private createReminderNotification(
    event: CalendarEvent,
    eventTime: Date,
    now: Date
  ): ProactiveNotification | null {
    const minutesUntilEvent = differenceInMinutes(eventTime, now);
    
    if (minutesUntilEvent <= 15 && minutesUntilEvent > 0) {
      return {
        id: `reminder-${event.id}`,
        type: 'reminder',
        priority: 'high',
        title: '일정 알림',
        message: `${event.summary}이(가) ${minutesUntilEvent}분 후에 시작됩니다`,
        actionRequired: false,
        actions: [
          {
            id: 'view',
            label: '일정 보기',
            action: `view-event:${event.id}`,
            style: 'primary'
          },
          {
            id: 'dismiss',
            label: '닫기',
            action: 'dismiss',
            style: 'secondary'
          }
        ],
        metadata: { eventId: event.id },
        scheduledFor: addMinutes(now, minutesUntilEvent - 15),
        expiresAt: eventTime
      };
    }
    
    return null;
  }

  private createTravelNotification(
    event: CalendarEvent,
    eventTime: Date,
    now: Date
  ): ProactiveNotification | null {
    if (!event.location) return null;

    const estimatedTravelTime = this.estimateTravelTime(event.location);
    const departureTime = addMinutes(eventTime, -estimatedTravelTime);
    const minutesUntilDeparture = differenceInMinutes(departureTime, now);

    if (minutesUntilDeparture <= 60 && minutesUntilDeparture > 0) {
      return {
        id: `travel-${event.id}`,
        type: 'alert',
        priority: 'urgent',
        title: '출발 시간',
        message: `${event.summary} 참석을 위해 ${minutesUntilDeparture}분 후 출발하세요`,
        actionRequired: true,
        actions: [
          {
            id: 'navigate',
            label: '길찾기',
            action: `navigate:${event.location}`,
            style: 'primary'
          },
          {
            id: 'delay',
            label: '10분 미루기',
            action: 'snooze:10',
            style: 'secondary'
          }
        ],
        metadata: { 
          eventId: event.id,
          location: event.location,
          travelTime: estimatedTravelTime 
        },
        scheduledFor: departureTime,
        expiresAt: eventTime
      };
    }

    return null;
  }

  private createPreparationNotification(
    event: CalendarEvent,
    eventTime: Date,
    now: Date
  ): ProactiveNotification | null {
    const minutesUntilEvent = differenceInMinutes(eventTime, now);
    
    if (minutesUntilEvent <= 60 && minutesUntilEvent > 45) {
      const preparationTasks = this.generatePreparationTasks(event);
      
      return {
        id: `prep-${event.id}`,
        type: 'suggestion',
        priority: 'medium',
        title: '회의 준비',
        message: `${event.summary} 준비를 시작하세요`,
        actionRequired: false,
        actions: [
          {
            id: 'prepare',
            label: '준비 시작',
            action: `prepare-meeting:${event.id}`,
            style: 'primary'
          },
          {
            id: 'checklist',
            label: '체크리스트 보기',
            action: `show-checklist:${event.id}`,
            style: 'secondary'
          }
        ],
        metadata: { 
          eventId: event.id,
          tasks: preparationTasks 
        },
        scheduledFor: addMinutes(eventTime, -60),
        expiresAt: eventTime
      };
    }

    return null;
  }

  private createDailyBriefingNotification(
    events: CalendarEvent[],
    context: UserContext
  ): ProactiveNotification | null {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const todayEvents = events.filter(event => {
      if (!event.start?.dateTime) return false;
      const eventTime = new Date(event.start.dateTime);
      return isWithinInterval(eventTime, { start: todayStart, end: todayEnd });
    });

    if (todayEvents.length === 0) return null;

    const briefingTime = new Date(context.preferences.briefingTime);
    if (differenceInMinutes(briefingTime, today) > 0 && differenceInMinutes(briefingTime, today) <= 5) {
      return {
        id: `briefing-${today.toISOString()}`,
        type: 'briefing',
        priority: 'medium',
        title: '오늘의 일정',
        message: `오늘 ${todayEvents.length}개의 일정이 있습니다`,
        actionRequired: false,
        actions: [
          {
            id: 'view-all',
            label: '일정 보기',
            action: 'view-today-events',
            style: 'primary'
          },
          {
            id: 'brief',
            label: '브리핑 듣기',
            action: 'play-briefing',
            style: 'secondary'
          }
        ],
        metadata: { 
          events: todayEvents.map(e => ({ 
            id: e.id, 
            summary: e.summary, 
            time: e.start?.dateTime 
          }))
        },
        scheduledFor: briefingTime
      };
    }

    return null;
  }

  private detectAndNotifyConflicts(events: CalendarEvent[]): ProactiveNotification[] {
    const conflicts: ProactiveNotification[] = [];
    
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];
        
        if (this.eventsOverlap(event1, event2)) {
          conflicts.push({
            id: `conflict-${event1.id}-${event2.id}`,
            type: 'conflict',
            priority: 'urgent',
            title: '일정 충돌 감지',
            message: `"${event1.summary}"와 "${event2.summary}"가 겹칩니다`,
            actionRequired: true,
            actions: [
              {
                id: 'resolve',
                label: '해결하기',
                action: `resolve-conflict:${event1.id}:${event2.id}`,
                style: 'primary'
              },
              {
                id: 'reschedule',
                label: '일정 조정',
                action: `reschedule:${event1.id}`,
                style: 'secondary'
              }
            ],
            metadata: {
              events: [event1.id, event2.id],
              conflictType: 'time-overlap'
            }
          });
        }
      }
    }
    
    return conflicts;
  }

  private eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
    if (!event1.start?.dateTime || !event1.end?.dateTime || 
        !event2.start?.dateTime || !event2.end?.dateTime) {
      return false;
    }

    const start1 = new Date(event1.start.dateTime);
    const end1 = new Date(event1.end.dateTime);
    const start2 = new Date(event2.start.dateTime);
    const end2 = new Date(event2.end.dateTime);

    return (start1 < end2 && end1 > start2);
  }

  private isMeeting(event: CalendarEvent): boolean {
    const meetingKeywords = ['meeting', '회의', 'sync', '미팅', 'call', '통화'];
    const summary = event.summary?.toLowerCase() || '';
    return meetingKeywords.some(keyword => summary.includes(keyword)) ||
           (event.attendees !== undefined && event.attendees.length > 1);
  }

  private estimateTravelTime(location: string): number {
    // 간단한 예측 로직 (실제로는 Google Maps API 등을 사용)
    if (location.includes('온라인') || location.includes('online') || location.includes('zoom')) {
      return 5; // 온라인 미팅은 5분 준비
    }
    if (location.includes('서울') || location.includes('강남')) {
      return 45; // 서울 내 이동 45분
    }
    return 30; // 기본 30분
  }

  private generatePreparationTasks(event: CalendarEvent): string[] {
    const tasks: string[] = [];
    
    if (event.attendees && event.attendees.length > 0) {
      tasks.push('참석자 프로필 확인');
    }
    
    if (event.description) {
      tasks.push('회의 아젠다 검토');
    }
    
    if (event.conferenceData) {
      tasks.push('화상회의 장비 테스트');
    } else if (event.location) {
      tasks.push('회의실 위치 확인');
    }
    
    tasks.push('관련 자료 준비');
    tasks.push('이전 회의록 검토');
    
    return tasks;
  }

  async scheduleNotification(notification: ProactiveNotification): Promise<void> {
    // Store the notification regardless of scheduledFor
    this.notifications.set(notification.id, notification);

    if (!notification.scheduledFor) return;

    const delay = differenceInMinutes(notification.scheduledFor, new Date()) * 60 * 1000;
    
    if (delay > 0) {
      const timer = setTimeout(() => {
        this.sendNotification(notification);
        this.scheduledTimers.delete(notification.id);
      }, delay);

      this.scheduledTimers.set(notification.id, timer);
    }
  }

  private async sendNotification(notification: ProactiveNotification): Promise<void> {
    // 브라우저 알림 API 사용
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: notification.id,
        requireInteraction: notification.actionRequired || false,
        data: notification.metadata
      });
    }

    // WebSocket을 통한 실시간 알림
    if (typeof window !== 'undefined') {
      const socket = (window as any).socket;
      if (socket) {
        socket.emit('notification', notification);
      }
    }
  }

  cancelNotification(notificationId: string): void {
    const timer = this.scheduledTimers.get(notificationId);
    if (timer) {
      clearTimeout(timer);
      this.scheduledTimers.delete(notificationId);
    }
    this.notifications.delete(notificationId);
  }

  getActiveNotifications(): ProactiveNotification[] {
    return Array.from(this.notifications.values());
  }

  clearExpiredNotifications(): void {
    const now = new Date();
    this.notifications.forEach((notification, id) => {
      if (notification.expiresAt && new Date(notification.expiresAt) < now) {
        this.cancelNotification(id);
      }
    });
  }
}

export default NotificationManager;