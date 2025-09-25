import { CalendarEvent } from '@/types';

/**
 * 대화 컨텍스트에서 언급된 이벤트를 추적하는 매니저
 */
export class EventContextManager {
  private lastMentionedEvent: CalendarEvent | null = null;
  private sessionEvents: Map<string, CalendarEvent[]> = new Map();
  private eventHistory: { eventId: string; timestamp: Date; action: string }[] = [];

  /**
   * 메시지에서 이벤트 참조 감지
   */
  detectEventReference(message: string, currentEvents: CalendarEvent[] = []): {
    type: 'specific' | 'recent' | 'relative' | null;
    event?: CalendarEvent;
    confidence: number;
  } {
    const lowerMessage = message.toLowerCase();

    // 패턴 1: 특정 이벤트명 언급 ("팀 미팅" 일정)
    const specificPattern = /"([^"]+)"\s*(일정|약속|미팅|이벤트)/;
    const specificMatch = message.match(specificPattern);
    if (specificMatch) {
      const eventName = specificMatch[1];
      const foundEvent = currentEvents.find(e =>
        e.summary?.toLowerCase().includes(eventName.toLowerCase())
      );
      if (foundEvent) {
        this.lastMentionedEvent = foundEvent;
        return { type: 'specific', event: foundEvent, confidence: 0.9 };
      }
    }

    // 패턴 2: 방금/최근 언급 (그 일정, 방금 만든 일정)
    const recentPatterns = [
      /그\s*(일정|약속|미팅)/,
      /방금\s*(만든|생성한|추가한)\s*(일정|약속)/,
      /아까\s*(그|말한)\s*(일정|약속)/
    ];

    for (const pattern of recentPatterns) {
      if (pattern.test(lowerMessage) && this.lastMentionedEvent) {
        return { type: 'recent', event: this.lastMentionedEvent, confidence: 0.8 };
      }
    }

    // 패턴 3: 상대적 참조 (내일 일정, 다음 미팅)
    const relativePatterns = [
      { pattern: /내일\s*(일정|약속|미팅)/, timeFilter: 'tomorrow' },
      { pattern: /오늘\s*(일정|약속|미팅)/, timeFilter: 'today' },
      { pattern: /다음\s*(일정|약속|미팅)/, timeFilter: 'next' }
    ];

    for (const { pattern, timeFilter } of relativePatterns) {
      if (pattern.test(lowerMessage)) {
        const filteredEvent = this.filterEventsByTime(currentEvents, timeFilter);
        if (filteredEvent) {
          this.lastMentionedEvent = filteredEvent;
          return { type: 'relative', event: filteredEvent, confidence: 0.7 };
        }
      }
    }

    return { type: null, confidence: 0 };
  }

  /**
   * 시간 기준으로 이벤트 필터링
   */
  private filterEventsByTime(events: CalendarEvent[], timeFilter: string): CalendarEvent | null {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    switch (timeFilter) {
      case 'today':
        return events.find(e => {
          const eventDate = new Date(e.start?.dateTime || e.start?.date || '');
          return eventDate.toDateString() === now.toDateString();
        }) || null;

      case 'tomorrow':
        return events.find(e => {
          const eventDate = new Date(e.start?.dateTime || e.start?.date || '');
          return eventDate.toDateString() === tomorrow.toDateString();
        }) || null;

      case 'next':
        // 현재 시간 이후 가장 가까운 이벤트
        const futureEvents = events
          .filter(e => new Date(e.start?.dateTime || e.start?.date || '') > now)
          .sort((a, b) => {
            const dateA = new Date(a.start?.dateTime || a.start?.date || '');
            const dateB = new Date(b.start?.dateTime || b.start?.date || '');
            return dateA.getTime() - dateB.getTime();
          });
        return futureEvents[0] || null;

      default:
        return null;
    }
  }

  /**
   * 이벤트 작업 기록
   */
  recordEventAction(eventId: string, action: string) {
    this.eventHistory.push({
      eventId,
      timestamp: new Date(),
      action
    });

    // 최근 20개만 유지 (메모리 관리)
    if (this.eventHistory.length > 20) {
      this.eventHistory = this.eventHistory.slice(-20);
    }
  }

  /**
   * 세션별 이벤트 저장
   */
  setSessionEvents(sessionId: string, events: CalendarEvent[]) {
    this.sessionEvents.set(sessionId, events);
  }

  /**
   * 마지막 언급된 이벤트 가져오기
   */
  getLastMentionedEvent(): CalendarEvent | null {
    return this.lastMentionedEvent;
  }

  /**
   * 컨텍스트 초기화
   */
  clearContext() {
    this.lastMentionedEvent = null;
    this.eventHistory = [];
  }

  /**
   * 액션 제안 (개선된 버전)
   */
  suggestAction(message: string): {
    action: 'view' | 'edit' | 'delete' | 'create' | null;
    confidence: number;
  } {
    const actionPatterns = [
      {
        pattern: /(수정|변경|바꾸|바꿔|고쳐|업데이트|update|modify|change|edit)/i,
        action: 'edit' as const,
        confidence: 0.9
      },
      {
        pattern: /(삭제|지워|취소|없애|제거|delete|remove|cancel)/i,
        action: 'delete' as const,
        confidence: 0.85
      },
      {
        pattern: /(만들|생성|추가|등록|예약|잡아|create|add|schedule|book)/i,
        action: 'create' as const,
        confidence: 0.88
      },
      {
        pattern: /(보여|확인|알려|보고|찾아|뭐야|언제|show|view|check|find)/i,
        action: 'view' as const,
        confidence: 0.75
      }
    ];

    // Check for multiple patterns and return the one with highest confidence
    let bestMatch = { action: null as any, confidence: 0 };

    for (const { pattern, action, confidence } of actionPatterns) {
      if (pattern.test(message) && confidence > bestMatch.confidence) {
        bestMatch = { action, confidence };
      }
    }

    return bestMatch;
  }

  /**
   * 대화 문맥에서 날짜/시간 추출
   */
  extractDateTime(message: string): {
    date?: string;
    time?: string;
    confidence: number;
  } {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Time patterns
    const timePatterns = [
      { pattern: /(\d{1,2})[시時](\s*(\d{1,2})[분分])?/i, type: 'korean' },
      { pattern: /(\d{1,2}):(\d{2})/i, type: 'standard' },
      { pattern: /(오전|오후|am|pm)\s*(\d{1,2})[시時]?/i, type: 'ampm' }
    ];

    // Date patterns
    const datePatterns = [
      { pattern: /오늘|today/i, value: today.toISOString().split('T')[0] },
      { pattern: /내일|tomorrow/i, value: tomorrow.toISOString().split('T')[0] },
      { pattern: /모레|day after tomorrow/i, value: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
      { pattern: /(\d{1,2})월\s*(\d{1,2})일/i, type: 'korean_date' },
      { pattern: /(\d{4})-(\d{1,2})-(\d{1,2})/i, type: 'iso_date' }
    ];

    let extractedDate: string | undefined;
    let extractedTime: string | undefined;
    let confidence = 0;

    // Extract date
    for (const pattern of datePatterns) {
      const match = message.match(pattern.pattern);
      if (match) {
        if (pattern.value) {
          extractedDate = pattern.value;
          confidence += 0.4;
        } else if (pattern.type === 'korean_date') {
          const month = parseInt(match[1]);
          const day = parseInt(match[2]);
          const year = today.getFullYear();
          extractedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          confidence += 0.4;
        } else if (pattern.type === 'iso_date') {
          extractedDate = match[0];
          confidence += 0.5;
        }
        break;
      }
    }

    // Extract time
    for (const pattern of timePatterns) {
      const match = message.match(pattern.pattern);
      if (match) {
        if (pattern.type === 'korean') {
          const hour = parseInt(match[1]);
          const minute = match[3] ? parseInt(match[3]) : 0;
          extractedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          confidence += 0.4;
        } else if (pattern.type === 'standard') {
          extractedTime = match[0];
          confidence += 0.5;
        } else if (pattern.type === 'ampm') {
          const isPM = /오후|pm/i.test(match[1]);
          let hour = parseInt(match[2]);
          if (isPM && hour < 12) hour += 12;
          if (!isPM && hour === 12) hour = 0;
          extractedTime = `${hour.toString().padStart(2, '0')}:00`;
          confidence += 0.4;
        }
        break;
      }
    }

    return { date: extractedDate, time: extractedTime, confidence };
  }
}

// 싱글톤 인스턴스
export const eventContextManager = new EventContextManager();