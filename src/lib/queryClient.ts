import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 캐시 시간 설정 (5분)
      gcTime: 5 * 60 * 1000,
      // 신선도 시간 (1분)
      staleTime: 1 * 60 * 1000,
      // 재시도 설정
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // 백그라운드에서 자동 재검증
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      // 뮤테이션 재시도
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// 쿼리 키 팩토리
export const queryKeys = {
  all: ['calendar'] as const,
  
  // 캘린더 관련
  calendar: {
    all: () => [...queryKeys.all, 'events'] as const,
    list: (filters?: any) => [...queryKeys.calendar.all(), { filters }] as const,
    detail: (id: string) => [...queryKeys.calendar.all(), id] as const,
    range: (start: Date, end: Date) => 
      [...queryKeys.calendar.all(), 'range', { start, end }] as const,
    suggestions: () => [...queryKeys.calendar.all(), 'suggestions'] as const,
    conflicts: (eventId: string) => 
      [...queryKeys.calendar.all(), 'conflicts', eventId] as const,
  },
  
  // AI 관련
  ai: {
    all: () => ['ai'] as const,
    suggestions: (userId: string) => [...queryKeys.ai.all(), 'suggestions', userId] as const,
    insights: (userId: string) => [...queryKeys.ai.all(), 'insights', userId] as const,
    predictions: (userId: string) => [...queryKeys.ai.all(), 'predictions', userId] as const,
    conversation: (sessionId: string) => 
      [...queryKeys.ai.all(), 'conversation', sessionId] as const,
  },
  
  // 사용자 관련
  user: {
    all: () => ['user'] as const,
    profile: (userId: string) => [...queryKeys.user.all(), 'profile', userId] as const,
    preferences: (userId: string) => 
      [...queryKeys.user.all(), 'preferences', userId] as const,
    patterns: (userId: string) => [...queryKeys.user.all(), 'patterns', userId] as const,
  },
  
  // Google Calendar 관련
  google: {
    all: () => ['google'] as const,
    calendars: () => [...queryKeys.google.all(), 'calendars'] as const,
    events: (calendarId: string) => 
      [...queryKeys.google.all(), 'events', calendarId] as const,
  },
};