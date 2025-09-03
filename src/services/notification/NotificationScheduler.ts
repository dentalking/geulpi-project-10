import { CalendarEvent, ProactiveNotification, UserContext } from '@/types';
import NotificationManager from './NotificationManager';
import { addDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

export class NotificationScheduler {
  private notificationManager: NotificationManager;
  private pollingInterval: NodeJS.Timeout | null = null;
  private processingQueue: Map<string, Promise<void>> = new Map();

  constructor() {
    this.notificationManager = new NotificationManager();
  }

  async initialize(userId: string): Promise<void> {
    // 브라우저 알림 권한 요청
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    // 서비스 워커 등록 (PWA를 위한 준비)
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered for notifications');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }

    // 정기적인 알림 체크 시작
    this.startPolling(userId);
  }

  private startPolling(userId: string): void {
    // 5분마다 알림 체크
    this.pollingInterval = setInterval(() => {
      this.checkAndScheduleNotifications(userId);
    }, 5 * 60 * 1000);

    // 즉시 한 번 실행
    this.checkAndScheduleNotifications(userId);
  }

  async checkAndScheduleNotifications(userId: string): Promise<void> {
    try {
      // 캘린더 이벤트 가져오기
      const events = await this.fetchUpcomingEvents(userId);
      
      // 사용자 컨텍스트 가져오기
      const context = await this.getUserContext(userId);
      
      // 스마트 알림 생성
      const notifications = await this.notificationManager.createSmartNotifications(
        events,
        context
      );

      // 알림 스케줄링
      for (const notification of notifications) {
        await this.scheduleNotification(notification);
      }

      // 만료된 알림 정리
      this.notificationManager.clearExpiredNotifications();
    } catch (error) {
      console.error('Failed to check and schedule notifications:', error);
    }
  }

  private async scheduleNotification(notification: ProactiveNotification): Promise<void> {
    // 중복 처리 방지
    if (this.processingQueue.has(notification.id)) {
      return;
    }

    const processingPromise = this.processNotification(notification);
    this.processingQueue.set(notification.id, processingPromise);

    try {
      await processingPromise;
    } finally {
      this.processingQueue.delete(notification.id);
    }
  }

  private async processNotification(notification: ProactiveNotification): Promise<void> {
    // 알림 유형별 처리
    switch (notification.type) {
      case 'reminder':
        await this.processReminderNotification(notification);
        break;
      case 'conflict':
        await this.processConflictNotification(notification);
        break;
      case 'suggestion':
        await this.processSuggestionNotification(notification);
        break;
      case 'briefing':
        await this.processBriefingNotification(notification);
        break;
      case 'alert':
        await this.processAlertNotification(notification);
        break;
      case 'insight':
        await this.processInsightNotification(notification);
        break;
    }

    // NotificationManager에 스케줄링 위임
    await this.notificationManager.scheduleNotification(notification);
  }

  private async processReminderNotification(notification: ProactiveNotification): Promise<void> {
    // 추가 컨텍스트 정보 수집
    if (notification.metadata?.eventId) {
      const eventDetails = await this.fetchEventDetails(notification.metadata.eventId);
      if (eventDetails) {
        notification.message = this.enrichReminderMessage(notification.message, eventDetails);
      }
    }
  }

  private async processConflictNotification(notification: ProactiveNotification): Promise<void> {
    // 충돌 해결 옵션 생성
    if (notification.metadata?.events) {
      const resolutionOptions = await this.generateConflictResolutions(
        notification.metadata.events
      );
      notification.actions = [
        ...notification.actions || [],
        ...resolutionOptions.map(option => ({
          id: `resolution-${option.id}`,
          label: option.label,
          action: option.action,
          style: 'secondary' as const
        }))
      ];
    }
  }

  private async processSuggestionNotification(notification: ProactiveNotification): Promise<void> {
    // AI 기반 제안 개선
    const improvedSuggestion = await this.enhanceSuggestion(notification);
    if (improvedSuggestion) {
      notification.message = improvedSuggestion.message;
      notification.metadata = {
        ...notification.metadata,
        enhancedData: improvedSuggestion.data
      };
    }
  }

  private async processBriefingNotification(notification: ProactiveNotification): Promise<void> {
    // 브리핑 내용 생성
    if (notification.metadata?.events) {
      const briefingContent = await this.generateBriefingContent(
        notification.metadata.events
      );
      notification.metadata.briefingContent = briefingContent;
    }
  }

  private async processAlertNotification(notification: ProactiveNotification): Promise<void> {
    // 긴급 알림 처리
    notification.priority = 'urgent';
    
    // 추가 알림 채널 활성화 (예: 이메일, SMS)
    if (notification.metadata?.eventId) {
      await this.sendUrgentAlert(notification);
    }
  }

  private async processInsightNotification(notification: ProactiveNotification): Promise<void> {
    // 패턴 분석 인사이트 추가
    const insights = await this.generateInsights(notification.metadata);
    notification.metadata = {
      ...notification.metadata,
      insights
    };
  }

  private enrichReminderMessage(message: string, eventDetails: any): string {
    let enrichedMessage = message;
    
    if (eventDetails.attendees?.length > 0) {
      enrichedMessage += ` (참석자: ${eventDetails.attendees.length}명)`;
    }
    
    if (eventDetails.location) {
      enrichedMessage += ` 장소: ${eventDetails.location}`;
    }
    
    return enrichedMessage;
  }

  private async generateConflictResolutions(eventIds: string[]): Promise<any[]> {
    return [
      {
        id: 'postpone-first',
        label: '첫 번째 일정 연기',
        action: `postpone:${eventIds[0]}`
      },
      {
        id: 'postpone-second',
        label: '두 번째 일정 연기',
        action: `postpone:${eventIds[1]}`
      },
      {
        id: 'merge',
        label: '일정 병합',
        action: `merge:${eventIds.join(',')}`
      }
    ];
  }

  private async enhanceSuggestion(notification: ProactiveNotification): Promise<any> {
    // AI를 통한 제안 개선 로직
    return {
      message: notification.message + ' (AI 추천)',
      data: {
        confidence: 0.85,
        alternatives: []
      }
    };
  }

  private async generateBriefingContent(events: any[]): Promise<string> {
    const briefing = events.map((event, index) => 
      `${index + 1}. ${event.time}: ${event.summary}`
    ).join('\n');
    
    return `오늘의 일정:\n${briefing}`;
  }

  private async sendUrgentAlert(notification: ProactiveNotification): Promise<void> {
    // 추가 알림 채널 구현 (이메일, SMS 등)
    console.log('Sending urgent alert:', notification);
  }

  private async generateInsights(metadata: any): Promise<any> {
    return {
      pattern: 'weekly_meeting_concentration',
      suggestion: '화요일과 목요일에 회의가 집중되어 있습니다',
      confidence: 0.78
    };
  }

  private async fetchUpcomingEvents(userId: string): Promise<CalendarEvent[]> {
    try {
      const response = await fetch('/api/calendar/events', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      
      // 다음 7일간의 이벤트 필터링
      const now = new Date();
      const weekLater = addDays(now, 7);
      
      return data.events.filter((event: CalendarEvent) => {
        if (!event.start?.dateTime) return false;
        const eventTime = new Date(event.start.dateTime);
        return isWithinInterval(eventTime, { start: now, end: weekLater });
      });
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }

  private async getUserContext(userId: string): Promise<UserContext> {
    // 실제 구현에서는 API나 store에서 가져옴
    return {
      userId,
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
  }

  private async fetchEventDetails(eventId: string): Promise<any> {
    try {
      const response = await fetch(`/api/calendar/events/${eventId}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
    }
    return null;
  }

  stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    // 모든 스케줄된 알림 취소
    const activeNotifications = this.notificationManager.getActiveNotifications();
    activeNotifications.forEach(notification => {
      this.notificationManager.cancelNotification(notification.id);
    });
  }
}

export default NotificationScheduler;