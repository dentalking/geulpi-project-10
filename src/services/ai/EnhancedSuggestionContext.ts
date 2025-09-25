/**
 * Enhanced Suggestion Context
 *
 * Quick Actions의 품질 개선을 위한 확장된 컨텍스트 정의
 */

import { CalendarEvent } from '@/types';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  action?: any;
}

export interface EventAnalysis {
  totalCount: number;
  todayCount: number;
  upcomingCount: number;
  categories: string[];
  frequentLocations: string[];
  frequentAttendees: string[];
  busyHours: number[];
  averageDuration: number;
}

export interface UserPreferences {
  preferredSuggestions?: string[];
  clickedCategories?: string[];
  ignoredSuggestions?: string[];
  mostUsedActions?: string[];
  preferredTimeOfDay?: string;
}

export interface UserProfile {
  workHours?: { start: string; end: string };
  homeAddress?: string;
  workAddress?: string;
  interests?: string[];
  goals?: string[];
  occupation?: string;
}

export interface EnhancedSuggestionContext {
  // 기본 컨텍스트
  locale: 'ko' | 'en';
  currentEvents: CalendarEvent[];
  selectedDate?: Date;
  timeOfDay: 'morning' | 'afternoon' | 'evening';

  // 확장된 컨텍스트
  conversationHistory: ConversationMessage[];
  eventAnalysis: EventAnalysis;
  userPreferences?: UserPreferences;
  userProfile?: UserProfile;

  // 상태 정보
  isFollowUp: boolean;
  lastAIResponse?: string;
  sessionDuration: number; // 세션 지속 시간 (분)
  previousSuggestions?: string[]; // 이전에 표시된 제안들
}

export interface SuggestionScore {
  text: string;
  score: number;
  reasons: string[];
  category: 'view' | 'create' | 'search' | 'action' | 'smart';
}

/**
 * 대화 히스토리 분석
 */
export function analyzeConversationHistory(
  messages: ConversationMessage[]
): {
  topics: string[];
  intent: string;
  frequency: Map<string, number>;
} {
  const topics: string[] = [];
  const wordFrequency = new Map<string, number>();
  let primaryIntent = 'general';

  messages.forEach(msg => {
    if (msg.role === 'user') {
      const words = msg.content.toLowerCase().split(/\s+/);

      // 주요 키워드 추출
      words.forEach(word => {
        if (word.length > 2) {
          wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
        }
      });

      // 의도 파악
      if (msg.content.includes('추가') || msg.content.includes('만들')) {
        primaryIntent = 'create';
      } else if (msg.content.includes('수정') || msg.content.includes('변경')) {
        primaryIntent = 'update';
      } else if (msg.content.includes('삭제') || msg.content.includes('취소')) {
        primaryIntent = 'delete';
      } else if (msg.content.includes('보여') || msg.content.includes('확인')) {
        primaryIntent = 'view';
      }
    }
  });

  // 상위 주제 추출
  const sortedWords = Array.from(wordFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  topics.push(...sortedWords.map(([word]) => word));

  return {
    topics,
    intent: primaryIntent,
    frequency: wordFrequency
  };
}

/**
 * 이벤트 심층 분석
 */
export function analyzeEvents(events: CalendarEvent[]): EventAnalysis {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.start?.dateTime || e.start?.date || '');
    return eventDate >= today && eventDate < tomorrow;
  });

  const upcomingEvents = events.filter(e => {
    const eventDate = new Date(e.start?.dateTime || e.start?.date || '');
    return eventDate >= now;
  });

  // 카테고리 분석 (제목에서 추출)
  const categories = new Set<string>();
  const locations = new Map<string, number>();
  const attendeeFreq = new Map<string, number>();
  const hourFreq = new Map<number, number>();
  let totalDuration = 0;
  let durationCount = 0;

  events.forEach(event => {
    // 카테고리 추출 (회의, 미팅, 식사, 운동 등)
    const title = event.summary.toLowerCase();
    if (title.includes('회의') || title.includes('meeting')) {
      categories.add('meeting');
    }
    if (title.includes('식사') || title.includes('lunch') || title.includes('dinner')) {
      categories.add('meal');
    }
    if (title.includes('운동') || title.includes('exercise') || title.includes('gym')) {
      categories.add('exercise');
    }

    // 장소 빈도
    if (event.location) {
      locations.set(event.location, (locations.get(event.location) || 0) + 1);
    }

    // 참석자 빈도
    if (event.attendees) {
      event.attendees.forEach(attendee => {
        const key = attendee.email || attendee.displayName || 'unknown';
        attendeeFreq.set(key, (attendeeFreq.get(key) || 0) + 1);
      });
    }

    // 시간대 분석
    const eventDate = new Date(event.start?.dateTime || event.start?.date || "");
    const hour = eventDate.getHours();
    hourFreq.set(hour, (hourFreq.get(hour) || 0) + 1);

    // 평균 지속시간 계산
    if (event.end?.dateTime || event.end?.date || "") {
      const duration = new Date(event.end?.dateTime || event.end?.date || "").getTime() - new Date(event.start?.dateTime || event.start?.date || "").getTime();
      totalDuration += duration;
      durationCount++;
    }
  });

  // 상위 3개 장소
  const topLocations = Array.from(locations.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([loc]) => loc);

  // 상위 5명 참석자
  const topAttendees = Array.from(attendeeFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([attendee]) => attendee);

  // 바쁜 시간대 (이벤트가 2개 이상인 시간)
  const busyHours = Array.from(hourFreq.entries())
    .filter(([, count]) => count >= 2)
    .map(([hour]) => hour);

  return {
    totalCount: events.length,
    todayCount: todayEvents.length,
    upcomingCount: upcomingEvents.length,
    categories: Array.from(categories),
    frequentLocations: topLocations,
    frequentAttendees: topAttendees,
    busyHours,
    averageDuration: durationCount > 0 ? totalDuration / durationCount : 60 * 60 * 1000 // 기본 1시간
  };
}