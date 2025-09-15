import { CalendarEvent } from '@/types';

export interface ParsedEvent {
  title: string;
  date?: Date;
  time?: string;
  duration?: number; // in minutes
  location?: string;
  attendees?: string[];
  isRecurring?: boolean;
  recurringPattern?: string;
}

export interface ParseResult {
  intent: 'CREATE' | 'UPDATE' | 'DELETE' | 'QUERY' | 'UNKNOWN';
  entities: ParsedEvent;
  confidence: number;
  original: string;
}

export class NLPParser {
  private readonly patterns = {
    // 날짜 패턴
    date: {
      today: /오늘|today/gi,
      tomorrow: /내일|tomorrow/gi,
      dayAfterTomorrow: /모레|내일모레|day after tomorrow/gi,
      nextWeek: /다음\s?주|next week/gi,
      thisWeek: /이번\s?주|this week/gi,
      weekday: /(월|화|수|목|금|토|일)요일|(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
      specificDate: /(\d{1,2})월\s*(\d{1,2})일|(\d{1,2})\/(\d{1,2})/gi,
    },
    // 시간 패턴
    time: {
      morning: /아침|오전|morning|am/gi,
      afternoon: /오후|점심|afternoon|pm/gi,
      evening: /저녁|evening/gi,
      night: /밤|night/gi,
      specificTime: /(\d{1,2})(시|:)(\d{0,2})?(분)?/gi,
    },
    // 기간 패턴
    duration: {
      minutes: /(\d+)\s*분|(\d+)\s*minutes?/gi,
      hours: /(\d+)\s*시간|(\d+)\s*hours?/gi,
      allDay: /하루종일|종일|all day|full day/gi,
    },
    // 액션 패턴
    action: {
      create: /추가|만들|생성|잡아|등록|add|create|schedule|book/gi,
      update: /변경|수정|바꿔|옮겨|update|change|modify|move/gi,
      delete: /취소|삭제|제거|지워|cancel|delete|remove/gi,
      query: /보여|확인|알려|찾아|show|check|find|list/gi,
    },
    // 반복 패턴
    recurring: {
      daily: /매일|every day|daily/gi,
      weekly: /매주|every week|weekly/gi,
      monthly: /매달|매월|every month|monthly/gi,
      weekdays: /평일|weekdays/gi,
      weekends: /주말|weekends/gi,
    },
  };

  parse(text: string): ParseResult {
    const result: ParseResult = {
      intent: 'UNKNOWN',
      entities: {
        title: text,
      },
      confidence: 0,
      original: text,
    };

    // 의도 파악
    result.intent = this.detectIntent(text);
    
    // 날짜 추출
    const dateInfo = this.extractDate(text);
    if (dateInfo) {
      result.entities.date = dateInfo;
      result.confidence += 0.3;
    }
    
    // 시간 추출
    const timeInfo = this.extractTime(text);
    if (timeInfo) {
      result.entities.time = timeInfo;
      result.confidence += 0.2;
    }
    
    // 기간 추출
    const duration = this.extractDuration(text);
    if (duration) {
      result.entities.duration = duration;
      result.confidence += 0.1;
    }
    
    // 장소 추출
    const location = this.extractLocation(text);
    if (location) {
      result.entities.location = location;
      result.confidence += 0.1;
    }
    
    // 참석자 추출
    const attendees = this.extractAttendees(text);
    if (attendees.length > 0) {
      result.entities.attendees = attendees;
      result.confidence += 0.1;
    }
    
    // 반복 패턴 추출
    const recurring = this.extractRecurring(text);
    if (recurring) {
      result.entities.isRecurring = true;
      result.entities.recurringPattern = recurring;
      result.confidence += 0.1;
    }
    
    // 제목 정제
    result.entities.title = this.extractTitle(text);
    
    // 의도가 명확하면 신뢰도 증가
    if (result.intent !== 'UNKNOWN') {
      result.confidence += 0.2;
    }
    
    return result;
  }

  private detectIntent(text: string): ParseResult['intent'] {
    if (this.patterns.action.delete.test(text)) return 'DELETE';
    if (this.patterns.action.update.test(text)) return 'UPDATE';
    if (this.patterns.action.query.test(text)) return 'QUERY';
    if (this.patterns.action.create.test(text)) return 'CREATE';
    
    // 날짜나 시간이 포함되어 있으면 생성으로 간주
    if (this.hasDateOrTime(text)) return 'CREATE';
    
    return 'UNKNOWN';
  }

  private hasDateOrTime(text: string): boolean {
    for (const pattern of Object.values(this.patterns.date)) {
      if (pattern.test(text)) return true;
    }
    for (const pattern of Object.values(this.patterns.time)) {
      if (pattern.test(text)) return true;
    }
    return false;
  }

  private extractDate(text: string): Date | undefined {
    const today = new Date();
    
    if (this.patterns.date.today.test(text)) {
      return today;
    }
    
    if (this.patterns.date.tomorrow.test(text)) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
    
    if (this.patterns.date.dayAfterTomorrow.test(text)) {
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);
      return dayAfter;
    }
    
    if (this.patterns.date.nextWeek.test(text)) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek;
    }
    
    // 요일 처리
    const weekdayMatch = text.match(this.patterns.date.weekday);
    if (weekdayMatch) {
      return this.getNextWeekday(weekdayMatch[0]);
    }
    
    // 특정 날짜 처리
    const dateMatch = text.match(this.patterns.date.specificDate);
    if (dateMatch) {
      return this.parseSpecificDate(dateMatch[0]);
    }
    
    return undefined;
  }

  private extractTime(text: string): string | undefined {
    // 특정 시간 먼저 확인
    const specificMatch = text.match(/(\d{1,2})(시|:)(\d{0,2})?/);
    if (specificMatch) {
      const hours = parseInt(specificMatch[1]);
      const minutes = specificMatch[3] ? parseInt(specificMatch[3]) : 0;
      
      // 오후/PM 체크
      const isPM = /오후|pm|PM/.test(text);
      const adjustedHours = isPM && hours < 12 ? hours + 12 : hours;
      
      return `${adjustedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    // 대략적인 시간
    if (/아침|morning/.test(text)) return '09:00';
    if (/점심|lunch/.test(text)) return '12:00';
    if (/오후|afternoon/.test(text)) return '14:00';
    if (/저녁|evening|dinner/.test(text)) return '18:00';
    if (/밤|night/.test(text)) return '21:00';
    
    return undefined;
  }

  private extractDuration(text: string): number | undefined {
    // 하루종일
    if (this.patterns.duration.allDay.test(text)) {
      return 24 * 60; // 1440 minutes
    }
    
    // 시간 단위
    const hoursMatch = text.match(/(\d+)\s*시간/);
    if (hoursMatch) {
      return parseInt(hoursMatch[1]) * 60;
    }
    
    // 분 단위
    const minutesMatch = text.match(/(\d+)\s*분/);
    if (minutesMatch) {
      return parseInt(minutesMatch[1]);
    }
    
    // 기본값: 1시간
    return 60;
  }

  private extractLocation(text: string): string | undefined {
    // 장소 키워드 다음의 텍스트 추출
    const locationMatch = text.match(/(에서|at|in|@)\s*([가-힣a-zA-Z0-9\s]+)/);
    if (locationMatch) {
      return locationMatch[2].trim();
    }
    
    // 특정 장소 패턴
    const places = /(스타벅스|회의실|사무실|집|카페|식당|학교|병원|은행|공항|역)/;
    const placeMatch = text.match(places);
    if (placeMatch) {
      return placeMatch[0];
    }
    
    return undefined;
  }

  private extractAttendees(text: string): string[] {
    const attendees: string[] = [];
    
    // "~님과" 패턴
    const koreanPattern = /([가-힣]+)(님)?과/g;
    let match;
    while ((match = koreanPattern.exec(text)) !== null) {
      attendees.push(match[1]);
    }
    
    // "with ~" 패턴
    const englishPattern = /with\s+([a-zA-Z]+)/gi;
    while ((match = englishPattern.exec(text)) !== null) {
      attendees.push(match[1]);
    }
    
    return attendees;
  }

  private extractRecurring(text: string): string | undefined {
    if (this.patterns.recurring.daily.test(text)) return 'daily';
    if (this.patterns.recurring.weekly.test(text)) return 'weekly';
    if (this.patterns.recurring.monthly.test(text)) return 'monthly';
    if (this.patterns.recurring.weekdays.test(text)) return 'weekdays';
    if (this.patterns.recurring.weekends.test(text)) return 'weekends';
    
    return undefined;
  }

  private extractTitle(text: string): string {
    // 불필요한 부분 제거
    let title = text;
    
    // 날짜/시간 표현 제거
    title = title.replace(this.patterns.date.today, '');
    title = title.replace(this.patterns.date.tomorrow, '');
    title = title.replace(/\d{1,2}시\s*\d{0,2}분?/, '');
    title = title.replace(/오전|오후|아침|점심|저녁/, '');
    
    // 액션 동사 제거
    title = title.replace(this.patterns.action.create, '');
    
    // 전치사 제거
    title = title.replace(/에서|에|at|in|from|to/gi, '');
    
    // 공백 정리
    title = title.trim().replace(/\s+/g, ' ');
    
    // 제목이 너무 짧으면 원본 사용
    if (title.length < 3) {
      return text.substring(0, 50);
    }
    
    return title;
  }

  private getNextWeekday(weekdayStr: string): Date {
    const weekdays = {
      '일요일': 0, 'sunday': 0,
      '월요일': 1, 'monday': 1,
      '화요일': 2, 'tuesday': 2,
      '수요일': 3, 'wednesday': 3,
      '목요일': 4, 'thursday': 4,
      '금요일': 5, 'friday': 5,
      '토요일': 6, 'saturday': 6,
    };
    
    const targetDay = weekdays[weekdayStr.toLowerCase()];
    if (targetDay === undefined) return new Date();
    
    const today = new Date();
    const currentDay = today.getDay();
    let daysToAdd = targetDay - currentDay;
    
    // 이미 지난 요일이면 다음 주로
    if (daysToAdd <= 0) {
      daysToAdd += 7;
    }
    
    const result = new Date(today);
    result.setDate(result.getDate() + daysToAdd);
    return result;
  }

  private parseSpecificDate(dateStr: string): Date {
    const today = new Date();
    const match = dateStr.match(/(\d{1,2})월\s*(\d{1,2})일/);
    
    if (match) {
      const month = parseInt(match[1]) - 1; // 0-indexed
      const day = parseInt(match[2]);
      const year = today.getFullYear();
      
      const result = new Date(year, month, day);
      
      // 이미 지난 날짜면 내년으로
      if (result < today) {
        result.setFullYear(year + 1);
      }
      
      return result;
    }
    
    return today;
  }
}