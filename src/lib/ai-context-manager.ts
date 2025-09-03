import type { CalendarEvent } from '@/types';

interface UserPreferences {
  workingHours: { start: string; end: string };
  lunchTime: { start: string; end: string };
  preferredMeetingDuration: number; // minutes
  bufferTime: number; // minutes between meetings
  timezone: string;
}

interface ConversationContext {
  lastMentionedDate?: Date;
  lastMentionedPerson?: string;
  lastMentionedLocation?: string;
  lastEventCreated?: CalendarEvent;
  pendingClarification?: {
    type: 'date' | 'time' | 'person' | 'location';
    options: string[];
  };
}

interface UserPattern {
  commonMeetingTimes: string[];
  frequentLocations: string[];
  regularAttendees: string[];
  averageMeetingDuration: number;
  preferredDaysForMeetings: number[]; // 0-6 (일-토)
}

export class AIContextManager {
  private conversationHistory: Map<string, ConversationContext> = new Map();
  private userPreferences: Map<string, UserPreferences> = new Map();
  private userPatterns: Map<string, UserPattern> = new Map();
  
  // 대화 컨텍스트 업데이트
  updateContext(sessionId: string, update: Partial<ConversationContext>) {
    const current = this.conversationHistory.get(sessionId) || {};
    this.conversationHistory.set(sessionId, { ...current, ...update });
  }
  
  // 컨텍스트 기반 시간 해석
  resolveTimeExpression(expression: string, sessionId: string): Date | null {
    const context = this.conversationHistory.get(sessionId);
    const now = new Date();
    
    // 상대적 시간 표현 처리
    const relativeTimeMap: Record<string, () => Date> = {
      '지금': () => now,
      '곧': () => new Date(now.getTime() + 30 * 60000),
      '조금 있다가': () => new Date(now.getTime() + 60 * 60000),
      '오늘': () => {
        const date = new Date(now);
        date.setHours(14, 0, 0, 0); // 기본 오후 2시
        return date;
      },
      '내일': () => {
        const date = new Date(now);
        date.setDate(date.getDate() + 1);
        date.setHours(10, 0, 0, 0); // 기본 오전 10시
        return date;
      },
      '모레': () => {
        const date = new Date(now);
        date.setDate(date.getDate() + 2);
        date.setHours(10, 0, 0, 0);
        return date;
      },
      '이번 주': () => {
        const date = new Date(now);
        const dayOfWeek = date.getDay();
        const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 5;
        date.setDate(date.getDate() + daysUntilFriday);
        date.setHours(14, 0, 0, 0);
        return date;
      },
      '다음 주': () => {
        const date = new Date(now);
        date.setDate(date.getDate() + (7 - date.getDay() + 1));
        date.setHours(10, 0, 0, 0);
        return date;
      },
      '주말': () => {
        const date = new Date(now);
        const dayOfWeek = date.getDay();
        const daysUntilSaturday = dayOfWeek <= 6 ? 6 - dayOfWeek : 7;
        date.setDate(date.getDate() + daysUntilSaturday);
        date.setHours(10, 0, 0, 0);
        return date;
      }
    };
    
    // 반복 패턴 인식
    const recurringPatterns = [
      { pattern: /매일/i, type: 'daily' },
      { pattern: /매주/i, type: 'weekly' },
      { pattern: /매월/i, type: 'monthly' },
      { pattern: /격주/i, type: 'biweekly' },
      { pattern: /평일/i, type: 'weekdays' },
    ];
    
    // 시간대별 기본값
    const timeOfDayDefaults: Record<string, number> = {
      '아침': 9,
      '오전': 10,
      '점심': 12,
      '오후': 14,
      '저녁': 18,
      '밤': 20
    };
    
    // 표현 파싱
    for (const [key, resolver] of Object.entries(relativeTimeMap)) {
      if (expression.includes(key)) {
        return resolver();
      }
    }
    
    // 컨텍스트에서 마지막 언급된 날짜 참조
    if (expression.includes('그때') || expression.includes('같은 시간')) {
      return context?.lastMentionedDate || null;
    }
    
    return null;
  }
  
  // 충돌 감지
  detectConflicts(
    newEvent: { start: Date; end: Date },
    existingEvents: CalendarEvent[]
  ): CalendarEvent[] {
    return existingEvents.filter(event => {
      const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
      const eventEnd = new Date(event.end?.dateTime || event.end?.date || '');
      
      // 시간 겹침 체크
      return (
        (newEvent.start >= eventStart && newEvent.start < eventEnd) ||
        (newEvent.end > eventStart && newEvent.end <= eventEnd) ||
        (newEvent.start <= eventStart && newEvent.end >= eventEnd)
      );
    });
  }
  
  // 최적 시간 제안
  suggestOptimalTime(
    duration: number, // minutes
    existingEvents: CalendarEvent[],
    preferences?: UserPreferences
  ): Date[] {
    const suggestions: Date[] = [];
    const now = new Date();
    const workStart = 9; // 9 AM
    const workEnd = 18; // 6 PM
    
    // 다음 7일간 체크
    for (let day = 0; day < 7; day++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() + day);
      checkDate.setHours(workStart, 0, 0, 0);
      
      // 30분 단위로 체크
      for (let hour = workStart; hour < workEnd; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          checkDate.setHours(hour, minute, 0, 0);
          
          const endTime = new Date(checkDate);
          endTime.setMinutes(endTime.getMinutes() + duration);
          
          // 충돌 체크
          const conflicts = this.detectConflicts(
            { start: checkDate, end: endTime },
            existingEvents
          );
          
          if (conflicts.length === 0) {
            suggestions.push(new Date(checkDate));
            
            if (suggestions.length >= 3) {
              return suggestions; // 최대 3개 제안
            }
          }
        }
      }
    }
    
    return suggestions;
  }
  
  // 사용자 패턴 학습
  learnUserPattern(sessionId: string, events: CalendarEvent[]) {
    const meetingTimes: string[] = [];
    const locations: string[] = [];
    const attendees: string[] = [];
    const durations: number[] = [];
    const daysOfWeek: number[] = [];
    
    events.forEach(event => {
      const start = new Date(event.start?.dateTime || event.start?.date || '');
      const end = new Date(event.end?.dateTime || event.end?.date || '');
      
      // 시간 패턴
      meetingTimes.push(`${start.getHours()}:${start.getMinutes()}`);
      
      // 요일 패턴
      daysOfWeek.push(start.getDay());
      
      // 장소 패턴
      if (event.location) {
        locations.push(event.location);
      }
      
      // 참석자 패턴
      if (event.attendees) {
        attendees.push(...event.attendees.map(a => a.email));
      }
      
      // duration 패턴
      const durationMs = end.getTime() - start.getTime();
      durations.push(durationMs / 60000); // minutes
    });
    
    // 가장 빈번한 패턴 추출
    const pattern: UserPattern = {
      commonMeetingTimes: this.getMostFrequent(meetingTimes, 3),
      frequentLocations: this.getMostFrequent(locations, 5),
      regularAttendees: this.getMostFrequent(attendees, 10),
      averageMeetingDuration: durations.reduce((a, b) => a + b, 0) / durations.length || 60,
      preferredDaysForMeetings: this.getMostFrequent(daysOfWeek, 3)
    };
    
    this.userPatterns.set(sessionId, pattern);
  }
  
  // 빈도수 계산 헬퍼
  private getMostFrequent<T>(items: T[], limit: number): T[] {
    const frequency = new Map<T, number>();
    
    items.forEach(item => {
      frequency.set(item, (frequency.get(item) || 0) + 1);
    });
    
    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([item]) => item);
  }
  
  // 스마트 제안 생성
  generateSmartSuggestions(
    sessionId: string,
    currentTime: Date,
    upcomingEvents: CalendarEvent[]
  ): string[] {
    const suggestions: string[] = [];
    const pattern = this.userPatterns.get(sessionId);
    const hour = currentTime.getHours();
    
    // 시간대별 제안
    if (hour < 9) {
      suggestions.push('오늘 일정 브리핑 받기');
      suggestions.push('오전 일정 확인');
    } else if (hour < 12) {
      suggestions.push('점심 약속 잡기');
      suggestions.push('오후 일정 확인');
    } else if (hour < 18) {
      suggestions.push('내일 일정 준비');
      suggestions.push('퇴근 후 일정 추가');
    } else {
      suggestions.push('내일 일정 확인');
      suggestions.push('이번 주 일정 요약');
    }
    
    // 패턴 기반 제안
    if (pattern) {
      if (pattern.frequentLocations.length > 0) {
        suggestions.push(`${pattern.frequentLocations[0]}에서 미팅`);
      }
      
      const today = currentTime.getDay();
      if (pattern.preferredDaysForMeetings.includes(today)) {
        suggestions.push('오늘 미팅 일정 추가');
      }
    }
    
    // 다가오는 일정 기반 제안
    if (upcomingEvents.length === 0) {
      suggestions.push('이번 주 계획 세우기');
    } else if (upcomingEvents.length > 5) {
      suggestions.push('바쁜 일정 정리하기');
    }
    
    return suggestions.slice(0, 5);
  }
  
  // 컨텍스트 기반 응답 개선
  enhanceResponse(
    response: string,
    sessionId: string,
    events?: CalendarEvent[]
  ): string {
    const context = this.conversationHistory.get(sessionId);
    const pattern = this.userPatterns.get(sessionId);
    
    let enhanced = response;
    
    // 다음 일정 언급
    if (events && events.length > 0) {
      const nextEvent = events[0];
      const eventTime = new Date(nextEvent.start?.dateTime || nextEvent.start?.date || '');
      const timeDiff = eventTime.getTime() - Date.now();
      const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));
      
      if (hoursUntil < 2 && hoursUntil > 0) {
        enhanced += `\n\n⏰ 참고로 ${hoursUntil}시간 후에 "${nextEvent.summary}" 일정이 있습니다.`;
      }
    }
    
    // 패턴 기반 추천
    if (pattern && pattern.averageMeetingDuration) {
      if (response.includes('미팅') || response.includes('회의')) {
        enhanced += `\n💡 평소 미팅은 약 ${Math.round(pattern.averageMeetingDuration)}분 정도 진행하시네요.`;
      }
    }
    
    return enhanced;
  }
}

export const aiContextManager = new AIContextManager();