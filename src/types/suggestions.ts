/**
 * Quick Actions 시스템 타입 정의
 * 타입 안정성 강화 및 any 타입 제거
 */

import { CalendarEvent } from '@/types';

// AI 응답 타입
export interface AIResponse {
  message: string;
  action?: {
    type: 'search' | 'create' | 'update' | 'delete' | 'list';
    data?: any;
  };
  events?: CalendarEvent[];
  eventsCount?: number;
  suggestions?: string[];
  smartSuggestions?: SmartSuggestion[];
  success?: boolean;
  timestamp?: number;
}

// 스마트 제안 타입
export interface SmartSuggestion {
  id: string;
  text: string;
  type: SuggestionType;
  priority: number;
  context?: SuggestionContext;
  action: 'requires_input' | 'direct_action' | 'navigation';
  reason?: string;
  relatedEventId?: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

// 제안 타입 열거형
export type SuggestionType =
  | 'create_prep'
  | 'create_followup'
  | 'create_routine'
  | 'schedule_break'
  | 'optimize_schedule'
  | 'reminder'
  | 'reschedule'
  | 'cancel';

// 제안 컨텍스트
export interface SuggestionContext {
  suggestedTime?: {
    start: string;
    duration: number; // minutes
  };
  relatedEvents?: string[];
  userPreference?: UserPreference;
  confidence: number;
  source: 'ai' | 'pattern' | 'rule' | 'user';
}

// 사용자 선호도
export interface UserPreference {
  preferredTimes: Map<SuggestionType, string[]>;
  rejectionRate: Map<SuggestionType, number>;
  acceptanceRate: Map<SuggestionType, number>;
  timeZoneActivity: TimeZoneActivity;
}

// 시간대별 활동
export interface TimeZoneActivity {
  morning: number; // 0-1 활동 지수
  afternoon: number;
  evening: number;
  night: number;
}

// 메시지 타입
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    hasImage?: boolean;
    actionType?: string;
    eventsCount?: number;
    suggestionId?: string;
  };
}

// 사용자 상호작용 기록
export interface UserInteraction {
  suggestionId: string;
  suggestionType: SuggestionType;
  action: 'accepted' | 'rejected' | 'modified' | 'ignored';
  timestamp: Date;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  context?: Record<string, any>;
}

// 캐시 엔트리
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

// 제안 생성 컨텍스트
export interface SuggestionGenerationContext {
  currentEvents: CalendarEvent[];
  selectedDate?: Date;
  selectedEvent?: CalendarEvent;
  userId: string;
  userEmail?: string;
  recentMessages: ChatMessage[];
  locale: 'ko' | 'en';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  viewMode: 'day' | 'week' | 'month' | 'list';
  userPatterns?: UserPatternData;
  weather?: WeatherInfo;
  location?: LocationInfo;
}

// 사용자 패턴 데이터
export interface UserPatternData {
  mostActiveHours: number[];
  preferredEventTypes: string[];
  averageEventDuration: number;
  frequentLocations: string[];
  workingHours: { start: string; end: string };
  breakPatterns: BreakPattern[];
  lastInteractions: UserInteraction[];
}

// 휴식 패턴
export interface BreakPattern {
  timeOfDay: string;
  frequency: number;
  averageDuration: number;
}

// 날씨 정보
export interface WeatherInfo {
  temperature: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  humidity: number;
}

// 위치 정보
export interface LocationInfo {
  lat: number;
  lng: number;
  address?: string;
  timezone: string;
}

// API 응답 타입
export interface SuggestionsAPIResponse {
  success: boolean;
  data?: {
    suggestions: string[];
    smartSuggestions: SmartSuggestion[];
    enhancedSuggestions?: SmartSuggestion[];
    context?: Record<string, any>;
  };
  error?: string;
  meta?: {
    timestamp: string;
    version: string;
    cached?: boolean;
  };
}